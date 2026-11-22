// Autor: Marialvo Junior

package service;
import java.util.List;
import java.util.Map;
import com.mongodb.MongoException;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Locale;
import java.time.Instant;
import java.time.Year;
import java.time.ZoneId;
import org.bson.Document;
import org.bson.types.ObjectId;
import model.Conta;
import model.OrdemDeServico;
import model.EquipeParaOrdemDeServico;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;
import dto.CadastroOrdemDeServicoDTO;
import model.Intervencao;
import model.ConclusaoOrdemDeServico;
import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.OrdemDeServicoRepository;
import dto.CancelamentoOrdemDeServicoDTO;
import dto.ConclusaoOrdemDeServicoDTO;


public class OrdemDeServicoService {
    private final OrdemDeServicoRepository ordemRepository;
    private final ContaRepository contaRepository;
    private final MunicipioRepository municipioRepository;
    private final ValidadorOrdemDeServicoRemoto validador;
    private final Geocodificador geocodificador;

    // Recebe os repositórios e a conexão compartilhada com o servidor de validação.
    public OrdemDeServicoService(OrdemDeServicoRepository ordemRepository, ContaRepository contaRepository,
            ConexaoServidor conexaoServidor){
        this(ordemRepository, contaRepository, conexaoServidor, null,
                new NominatimGeocodificador());
    }

    // Recebe os serviços de localização necessários para persistir OS sem árvore.
    public OrdemDeServicoService(OrdemDeServicoRepository ordemRepository,
            ContaRepository contaRepository, ConexaoServidor conexaoServidor,
            MunicipioRepository municipioRepository, Geocodificador geocodificador){
        if (ordemRepository == null){
            throw new IllegalArgumentException("O repositório de OS não pode ser nulo.");
        }

        if (contaRepository == null){
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }
        if (geocodificador == null){
            throw new IllegalArgumentException("O geocodificador não pode ser nulo.");
        }

        this.ordemRepository = ordemRepository;
        this.contaRepository = contaRepository;
        this.municipioRepository = municipioRepository;
        this.geocodificador = geocodificador;
        this.validador = new ValidadorOrdemDeServicoRemoto(conexaoServidor);
    }

    // Reserva o sequencial do ano e monta o código de acompanhamento da OS.
    private String gerarCodigo(){
        int ano = Year.now(ZoneId.of("America/Sao_Paulo")).getValue();

        long sequencial = ordemRepository.gerarProximoNumero(ano);

        return String.format(Locale.ROOT,"OS-%05d%d",ano,sequencial);
    }

    public OrdemDeServico criar(ObjectId municipioId, CadastroOrdemDeServicoDTO dados){
        if (municipioId == null) throw new IllegalArgumentException("O município é obrigatório.");
        Document ocorrencia = null;
        CadastroOrdemDeServicoDTO dadosParaValidar = dados;
        if (dados != null && dados.getOcorrenciaId() != null
                && !dados.getOcorrenciaId().isBlank()) {
            if (!ObjectId.isValid(dados.getOcorrenciaId().strip())) {
                throw new IllegalArgumentException("O identificador da ocorrência é inválido.");
            }
            ObjectId ocorrenciaId = new ObjectId(dados.getOcorrenciaId().strip());
            ocorrencia = ordemRepository.buscarOcorrenciaParaOrdem(ocorrenciaId, municipioId);
            CadastroOrdemDeServicoDTO canonico = dadosCanonicosDaOcorrencia(ocorrencia, ocorrenciaId);
            String arvoreSelecionada = dados.getArvoreId() == null || dados.getArvoreId().isBlank()
                    ? canonico.getArvoreId() : dados.getArvoreId().strip();
            if (canonico.getArvoreId() != null && arvoreSelecionada != null
                    && !canonico.getArvoreId().equals(arvoreSelecionada)) {
                throw new IllegalArgumentException(
                        "A árvore selecionada deve ser a mesma já vinculada à ocorrência.");
            }
            dadosParaValidar = new CadastroOrdemDeServicoDTO(arvoreSelecionada,
                    ocorrenciaId.toHexString(), null, canonico.getTitulo(), canonico.getDescricao(),
                    canonico.getPrioridade(), null, canonico.getEndereco(), canonico.getBairro());
        }
        var cadastro = validador.prepararCadastro(dadosParaValidar);
        if (cadastro.prioridade() == null || cadastro.prioridade().isBlank()) {
            throw new IllegalArgumentException("Informe a prioridade da ordem.");
        }
        String endereco = cadastro.endereco();
        String bairro = cadastro.bairro();
        String numero = null;
        Double latitude = null;
        Double longitude = null;
        if (ocorrencia != null) {
            endereco = primeiroTexto(ocorrencia, "localizacao", "endereco");
            numero = primeiroTexto(ocorrencia, "numero");
            bairro = primeiroTexto(ocorrencia, "bairro");
            latitude = coordenada(ocorrencia.get("latitude"), -90, 90);
            longitude = coordenada(ocorrencia.get("longitude"), -180, 180);
            if (latitude == null || longitude == null) {
                latitude = null;
                longitude = null;
            }
        }
        boolean arvoreVinculada = cadastro.arvoreId() != null;
        if (arvoreVinculada && (latitude == null || longitude == null)) {
            Document arvore = ordemRepository.buscarArvoreParaOrdem(
                    new ObjectId(cadastro.arvoreId()), municipioId);
            latitude = coordenada(arvore.get("latitude"), -90, 90);
            longitude = coordenada(arvore.get("longitude"), -180, 180);
        }
        var coordenadas = latitude != null && longitude != null
                ? new Geocodificador.Coordenadas(latitude, longitude)
                : arvoreVinculada ? null
                : geocodificarSeNecessario(municipioId, endereco, numero, bairro, null, null);
        latitude = coordenadas == null ? null : coordenadas.latitude();
        longitude = coordenadas == null ? null : coordenadas.longitude();
        String codigo;
        try {
            codigo = gerarCodigo();
        } catch (MongoException erro){
            if (erro.getCode() == 11000)
                throw new IllegalStateException("Não foi possível reservar o código da OS. Tente novamente.");
            throw erro;
        }
        OrdemDeServico ordem = new OrdemDeServico(municipioId,
                cadastro.arvoreId() == null ? null : new ObjectId(cadastro.arvoreId()),
                cadastro.ocorrenciaId() == null ? null : new ObjectId(cadastro.ocorrenciaId()), null, cadastro.titulo(), cadastro.descricao(),
                cadastro.prioridade(), cadastro.observacoes(), codigo, endereco, bairro,
                latitude, longitude);
        ordem.setNumero(ocorrencia != null ? numero : dados == null ? null : dados.getNumero());
        return ordemRepository.criarComReferencias(ordem);
    }

    // Usa somente os dados persistidos da ocorrência, ignorando valores enviados pelo navegador.
    private CadastroOrdemDeServicoDTO dadosCanonicosDaOcorrencia(
            Document ocorrencia, ObjectId ocorrenciaId) {
        String titulo = primeiroTexto(ocorrencia, "tipoProblema", "tipo", "tipoDescricao");
        String descricao = primeiroTexto(ocorrencia, "descricao");
        if (titulo == null || descricao == null) {
            throw new IllegalArgumentException(
                    "A ocorrência não possui tipo e descrição para criar a ordem de serviço.");
        }
        Object arvore = ocorrencia.get("arvoreId");
        String arvoreId = arvore instanceof ObjectId id ? id.toHexString()
                : arvore instanceof String texto && ObjectId.isValid(texto) ? texto : null;
        String endereco = primeiroTexto(ocorrencia, "localizacao", "endereco");
        String numero = primeiroTexto(ocorrencia, "numero");
        return new CadastroOrdemDeServicoDTO(arvoreId, ocorrenciaId.toHexString(), null,
                titulo, descricao, primeiroTexto(ocorrencia, "prioridade", "urgencia"),
                null, endereco, primeiroTexto(ocorrencia, "bairro"));
    }

    // Converte endereço e município em coordenadas, mantendo o cadastro sem marcador se não houver resultado.
    private String obterNomeMunicipio(ObjectId municipioId) {
        if (municipioRepository == null) {
            throw new IllegalStateException(
                    "O serviço de municípios é necessário para geocodificar a ordem.");
        }
        return municipioRepository.buscarNomePorId(municipioId)
                .filter(nome -> !nome.isBlank())
                .orElseThrow(() -> new NoSuchElementException(
                        "Município não encontrado para geocodificar a ordem."));
    }

    // Reaproveita coordenadas canônicas ou consulta o geocodificador para o endereço.
    private Geocodificador.Coordenadas geocodificarSeNecessario(
            ObjectId municipioId, String endereco, String numero, String bairro,
            Double latitude, Double longitude) {
        if (latitude != null && longitude != null) {
            return new Geocodificador.Coordenadas(latitude, longitude);
        }
        String nomeMunicipio = obterNomeMunicipio(municipioId);
        return geocodificador.geocodificar(endereco, numero, bairro, nomeMunicipio)
                .orElse(null);
    }

    private Double coordenada(Object valor, double minimo, double maximo) {
        if (!(valor instanceof Number numero)) return null;
        double resultado = numero.doubleValue();
        return Double.isFinite(resultado) && resultado >= minimo && resultado <= maximo
                ? resultado : null;
    }

    public Map<String, Object> opcoesDeCadastro(ObjectId municipioId){
        return ordemRepository.opcoesDeCadastro(municipioId);
    }

    public List<EquipeParaOrdemDeServico> listarEquipesDisponiveisParaOcorrencia(
            ObjectId ocorrenciaId, ObjectId municipioId) {
        return ordemRepository.listarEquipesDisponiveisParaOcorrencia(
                ocorrenciaId, municipioId);
    }

    public OrdemDeServico criarParaOcorrencia(
            ObjectId ocorrenciaId, ObjectId municipioId, String equipeId) {
        Document ocorrencia = ordemRepository.buscarOcorrenciaParaOrdem(
                ocorrenciaId, municipioId);
        String tipo = primeiroTexto(ocorrencia, "tipoProblema", "tipo", "tipoDescricao");
        String protocolo = primeiroTexto(ocorrencia, "protocolo", "id");
        String titulo = tipo == null
                ? "Atendimento da ocorrência " + (protocolo == null ? ocorrenciaId : protocolo)
                : tipo;
        String descricao = primeiroTexto(ocorrencia, "descricao");
        if (descricao == null) {
            throw new IllegalArgumentException(
                    "A ocorrência não possui descrição para criar a ordem de serviço.");
        }
        Object arvore = ocorrencia.get("arvoreId");
        String arvoreId = arvore instanceof ObjectId id ? id.toHexString() : null;
        String prioridade = primeiroTexto(ocorrencia, "prioridade", "urgencia");

        var cadastro = validador.prepararCadastro(new CadastroOrdemDeServicoDTO(
                arvoreId, ocorrenciaId.toHexString(), null, titulo, descricao,
                prioridade, null,
                primeiroTexto(ocorrencia, "localizacao", "endereco"),
                primeiroTexto(ocorrencia, "bairro")));
        ObjectId idEquipe = validador.validarIdEquipe(
                new AtribuicaoEquipeOrdemDeServicoDTO(equipeId));
        String endereco = primeiroTexto(ocorrencia, "localizacao", "endereco");
        String numero = primeiroTexto(ocorrencia, "numero");
        String bairro = primeiroTexto(ocorrencia, "bairro");
        if (endereco != null && numero != null && !endereco.endsWith(numero)) {
            endereco += ", " + numero;
        }
        var coordenadas = geocodificarSeNecessario(
                municipioId,
                primeiroTexto(ocorrencia, "localizacao", "endereco"),
                numero,
                bairro,
                coordenada(ocorrencia.get("latitude"), -90, 90),
                coordenada(ocorrencia.get("longitude"), -180, 180));
        String codigo;
        try {
            codigo = gerarCodigo();
        } catch (MongoException erro) {
            if (erro.getCode() == 11000) {
                throw new IllegalStateException(
                        "Não foi possível reservar o código da OS. Tente novamente.");
            }
            throw erro;
        }
        OrdemDeServico ordem = new OrdemDeServico(
                municipioId,
                cadastro.arvoreId() == null ? null : new ObjectId(cadastro.arvoreId()),
                ocorrenciaId,
                idEquipe,
                cadastro.titulo(),
                cadastro.descricao(),
                cadastro.prioridade(),
                cadastro.observacoes(),
                codigo,
                endereco,
                bairro,
                coordenadas == null ? null : coordenadas.latitude(),
                coordenadas == null ? null : coordenadas.longitude());
        ordem.setNumero(numero);
        return ordemRepository.criarParaOcorrencia(ordem,
                "Ordem " + codigo + " atribuída à equipe " + idEquipe.toHexString());
    }

    private String primeiroTexto(Document documento, String... campos) {
        for (String campo : campos) {
            Object valor = documento.get(campo);
            if (valor instanceof String texto && !texto.isBlank()) {
                return texto.trim();
            }
        }
        return null;
    }

    // Obtém o município da conta do funcionário identificado pela sessão.
    public ObjectId obterMunicipioDoFuncionario(String usuarioId){
        if (usuarioId == null || !ObjectId.isValid(usuarioId)){
            throw new SecurityException("A sessão não contém um usuário válido.");
        }

        Optional<Conta> resultado = contaRepository.buscarPorId(new ObjectId(usuarioId));

        if (resultado.isEmpty()){
            throw new SecurityException("Usuário da sessão não encontrado.");
        }

        Conta funcionario = resultado.get();

        if (funcionario.getPerfis() == null || !funcionario.getPerfis().contains("FUNCIONARIO")){
            throw new SecurityException("Somente funcionários podem consultar ordens de serviço.");
        }

        if (funcionario.getMunicipioId() == null){
            throw new SecurityException("O funcionário não possui um município vinculado.");
        }

        return funcionario.getMunicipioId();
    }

    // Lista as ordens de serviço do município informado.
    public List<OrdemDeServico> listarPorMunicipio(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return ordemRepository.listarPorMunicipio(municipioId);
    }

    public List<Map<String, Object>> historicoPorArvore(ObjectId arvoreId){
        return ordemRepository.historicoPorArvore(arvoreId);
    }

    public boolean existeOcorrenciaPorArvore(ObjectId arvoreId){
        return ordemRepository.existeOcorrenciaPorArvore(arvoreId);
    }

    public Map<ObjectId, String> buscarNomesEquipes(
            List<OrdemDeServico> ordens,
            ObjectId municipioId) {
        if (ordens == null) {
            throw new IllegalArgumentException("A lista de ordens é obrigatória.");
        }
        List<ObjectId> equipeIds = ordens.stream()
                .map(OrdemDeServico::getEquipeId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        return ordemRepository.buscarNomesEquipes(equipeIds, municipioId);
    }

    // Busca uma OS e verifica se ela pertence ao município informado.
    public OrdemDeServico buscarPorId(ObjectId id, ObjectId municipioId){
        if (id == null){
            throw new IllegalArgumentException("O identificador da OS não pode ser nulo.");
        }

        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Optional<OrdemDeServico> resultado = ordemRepository.buscarPorId(id);

        if (resultado.isEmpty()){
            throw new NoSuchElementException("OS não encontrada nesse município.");
        }

        OrdemDeServico ordem = resultado.get();

        if (!municipioId.equals(ordem.getMunicipioId())){
            throw new NoSuchElementException("OS não encontrada nesse município.");
        }

        return ordem;
    }

    // A conclusão sempre inclui o registro da execução, persistido na mesma transação.
    public ConclusaoOrdemDeServico concluir(
            ObjectId id, ObjectId municipioId, ObjectId usuarioId,
            ConclusaoOrdemDeServicoDTO dados){
        Instant agora = Instant.now();
        var conclusao = validador.prepararConclusao(dados, agora);
        return ordemRepository.concluirComIntervencao(id, municipioId, usuarioId,
                conclusao.tipo(), conclusao.descricao(), conclusao.fotos(),
                conclusao.dataExecucao(), agora);
    }

    public Optional<Intervencao> buscarIntervencaoConclusao(OrdemDeServico ordem){
        return ordemRepository.buscarIntervencaoConclusao(ordem);
    }

    public List<EquipeParaOrdemDeServico> listarEquipesParaOrdem(ObjectId id, ObjectId municipioId){
        return ordemRepository.listarEquipesParaOrdem(id, municipioId);
    }

    public OrdemDeServico atribuirEquipe(ObjectId id, ObjectId municipioId, AtribuicaoEquipeOrdemDeServicoDTO dados){
        ObjectId equipeId = validador.validarIdEquipe(dados);
        return ordemRepository.atribuirEquipe(id, municipioId, equipeId, Instant.now());
    }

    // O Socket aprova o motivo antes de qualquer alteração na OS ou na equipe.
    public OrdemDeServico cancelar(ObjectId id, ObjectId municipioId, CancelamentoOrdemDeServicoDTO dados){
        String motivo = validador.validarCancelamento(dados);
        return ordemRepository.cancelar(id, municipioId, motivo, Instant.now());
    }

}
