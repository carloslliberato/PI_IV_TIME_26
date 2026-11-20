package service;
import java.util.List;
import java.util.Map;
import com.mongodb.MongoException;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Locale;
import java.util.ArrayList;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.time.Year;
import java.time.ZoneId;
import org.bson.types.ObjectId;
import model.Conta;
import model.OrdemDeServico;
import model.EquipeParaOrdemDeServico;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;
import model.Intervencao;
import model.ConclusaoOrdemDeServico;
import repository.ContaRepository;
import repository.OrdemDeServicoRepository;
import dto.CadastroOrdemDeServicoDTO;
import dto.ConclusaoOrdemDeServicoDTO;


public class OrdemDeServicoService {
    private final OrdemDeServicoRepository ordemRepository;
    private final ContaRepository contaRepository;

    // Recebe os repositórios utilizados pelo serviço.
    public OrdemDeServicoService(OrdemDeServicoRepository ordemRepository,ContaRepository contaRepository){
        if (ordemRepository == null){
            throw new IllegalArgumentException("O repositório de OS não pode ser nulo.");
        }

        if (contaRepository == null){
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }

        this.ordemRepository = ordemRepository;
        this.contaRepository = contaRepository;
    }

    // Reserva o sequencial do ano e monta o código de acompanhamento da OS.
    private String gerarCodigo(){
        int ano = Year.now(ZoneId.of("America/Sao_Paulo")).getValue();

        long sequencial = ordemRepository.gerarProximoNumero(ano);

        return String.format(Locale.ROOT,"OS%05d%d",ano,sequencial);
    }

    public OrdemDeServico criar(ObjectId municipioId, CadastroOrdemDeServicoDTO dados){
        if (municipioId == null) throw new IllegalArgumentException("O município é obrigatório.");
        CadastroValidado cadastro = prepararCadastro(dados);
        String codigo;
        try {
            codigo = gerarCodigo();
        } catch (MongoException erro){
            if (erro.getCode() == 11000)
                throw new IllegalStateException("Não foi possível reservar o código da OS. Tente novamente.");
            throw erro;
        }
        OrdemDeServico ordem = new OrdemDeServico(municipioId, cadastro.arvoreId(),
                cadastro.ocorrenciaId(), null, cadastro.titulo(), cadastro.descricao(),
                cadastro.prioridade(), cadastro.observacoes(), codigo);
        return ordemRepository.criarComReferencias(ordem);
    }

    public Map<String, Object> opcoesDeCadastro(ObjectId municipioId){
        return ordemRepository.opcoesDeCadastro(municipioId);
    }

    public static CadastroValidado prepararCadastro(CadastroOrdemDeServicoDTO dados){
        if (dados == null) throw new IllegalArgumentException("Informe os dados da nova ordem de serviço.");
        String titulo = textoDeCadastro(dados.getTitulo(), "O título", 160, true);
        String descricao = textoDeCadastro(dados.getDescricao(), "A descrição", 4000, true);
        String arvoreId = textoDeCadastro(dados.getArvoreId(), "O identificador da árvore", 24, true);
        if (!ObjectId.isValid(arvoreId)) throw new IllegalArgumentException("O identificador da árvore é inválido.");
        String ocorrenciaId = textoDeCadastro(dados.getOcorrenciaId(), "O identificador da ocorrência", 24, false);
        if (ocorrenciaId != null && !ObjectId.isValid(ocorrenciaId))
            throw new IllegalArgumentException("O identificador da ocorrência é inválido.");
        if (dados.getEquipeId() != null && !dados.getEquipeId().isBlank())
            throw new IllegalArgumentException("Crie a OS sem equipe e use a opção Atribuir equipe após o cadastro.");
        return new CadastroValidado(new ObjectId(arvoreId), ocorrenciaId == null ? null : new ObjectId(ocorrenciaId),
                titulo, descricao, textoDeCadastro(dados.getPrioridade(), "A prioridade", 40, false),
                textoDeCadastro(dados.getObservacoes(), "As observações", 4000, false));
    }

    private static String textoDeCadastro(String valor, String nome, int limite, boolean obrigatorio){
        if (valor == null || valor.isBlank()){
            if (obrigatorio) throw new IllegalArgumentException(nome + " deve ser informado.");
            return null;
        }
        String texto = valor.strip();
        if (texto.length() > limite) throw new IllegalArgumentException(nome + " deve ter no máximo " + limite + " caracteres.");
        return texto;
    }

    public record CadastroValidado(ObjectId arvoreId, ObjectId ocorrenciaId, String titulo,
            String descricao, String prioridade, String observacoes) {
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
        ConclusaoValidada conclusao = prepararConclusao(dados, agora);
        return ordemRepository.concluirComIntervencao(id, municipioId, usuarioId,
                conclusao.tipo(), conclusao.descricao(), conclusao.fotos(),
                conclusao.dataExecucao(), agora);
    }

    public Optional<Intervencao> buscarIntervencaoConclusao(OrdemDeServico ordem){
        return ordemRepository.buscarIntervencaoConclusao(ordem);
    }

    // A validação pura permite testar os limites e as datas sem abrir conexão com o banco.
    public static ConclusaoValidada prepararConclusao(ConclusaoOrdemDeServicoDTO dados, Instant agora){
        if (dados == null){
            throw new IllegalArgumentException("Informe os dados da conclusão da OS.");
        }
        if (agora == null){
            throw new IllegalArgumentException("O horário de referência da conclusão não foi informado.");
        }

        String tipo = validarTextoDeConclusao(dados.getTipo(), "O tipo de serviço", 80);
        String descricao = validarTextoDeConclusao(dados.getDescricao(), "A descrição do serviço executado", 4000);
        Instant dataExecucao = agora;

        if (dados.getDataExecucao() != null){
            try {
                OffsetDateTime data = OffsetDateTime.parse(dados.getDataExecucao().strip());
                if (data.getYear() < 1 || data.getYear() > 9999){
                    throw new IllegalArgumentException("O ano da execução deve estar entre 1 e 9999.");
                }
                dataExecucao = data.toInstant();
            } catch (DateTimeParseException erro){
                throw new IllegalArgumentException("Informe a data de execução em formato ISO com fuso, por exemplo 2026-11-20T12:00:00-03:00.");
            }
        }

        int anoUtc = dataExecucao.atOffset(ZoneOffset.UTC).getYear();
        if (anoUtc < 1 || anoUtc > 9999){
            throw new IllegalArgumentException("O ano da execução deve estar entre 1 e 9999.");
        }
        if (dataExecucao.isAfter(agora)){
            throw new IllegalArgumentException("A data de execução não pode estar no futuro.");
        }

        List<String> referencias = dados.getFotos() == null ? List.of() : dados.getFotos();
        if (referencias.size() > 10){
            throw new IllegalArgumentException("Informe no máximo 10 referências de fotos.");
        }

        List<String> fotos = new ArrayList<>();
        for (String referencia : referencias){
            if (referencia == null || referencia.isBlank()){
                throw new IllegalArgumentException("As referências de fotos não podem estar vazias.");
            }
            String foto = referencia.strip();
            if (foto.length() > 2048){
                throw new IllegalArgumentException("Cada referência de foto deve ter no máximo 2048 caracteres.");
            }
            try {
                URI uri = new URI(foto);
                boolean protocoloValido = "http".equalsIgnoreCase(uri.getScheme())
                        || "https".equalsIgnoreCase(uri.getScheme());
                if (!uri.isAbsolute() || !protocoloValido || uri.getHost() == null
                        || uri.getRawUserInfo() != null){
                    throw new IllegalArgumentException("Use referências de fotos HTTP ou HTTPS completas, com domínio e sem credenciais.");
                }
            } catch (URISyntaxException erro){
                throw new IllegalArgumentException("Uma das referências de fotos não é uma URL válida.");
            }
            fotos.add(foto);
        }

        return new ConclusaoValidada(tipo, descricao, dataExecucao, fotos);
    }

    private static String validarTextoDeConclusao(String valor, String nome, int limite){
        if (valor == null || valor.isBlank()){
            throw new IllegalArgumentException(nome + " deve ser informado.");
        }
        String texto = valor.strip();
        if (texto.length() > limite){
            throw new IllegalArgumentException(nome + " deve ter no máximo " + limite + " caracteres.");
        }
        return texto;
    }

    public record ConclusaoValidada(String tipo, String descricao, Instant dataExecucao, List<String> fotos){
        public ConclusaoValidada {
            fotos = List.copyOf(fotos);
        }
    }

    public List<EquipeParaOrdemDeServico> listarEquipesParaOrdem(ObjectId id, ObjectId municipioId){
        return ordemRepository.listarEquipesParaOrdem(id, municipioId);
    }

    public OrdemDeServico atribuirEquipe(ObjectId id, ObjectId municipioId, AtribuicaoEquipeOrdemDeServicoDTO dados){
        ObjectId equipeId = validarIdEquipe(dados);
        return ordemRepository.atribuirEquipe(id, municipioId, equipeId, Instant.now());
    }

    public static ObjectId validarIdEquipe(AtribuicaoEquipeOrdemDeServicoDTO dados){
        if (dados == null || dados.getEquipeId() == null || dados.getEquipeId().isBlank())
            throw new IllegalArgumentException("Selecione uma equipe para a ordem de serviço.");
        String equipeId = dados.getEquipeId().strip();
        if (!ObjectId.isValid(equipeId))
            throw new IllegalArgumentException("O identificador da equipe é inválido.");
        return new ObjectId(equipeId);
    }

    // Cancela uma OS do município informado e salva a alteração.
    public OrdemDeServico cancelar(ObjectId id, ObjectId municipioId){
        return ordemRepository.cancelar(id, municipioId, Instant.now());
    }

}
