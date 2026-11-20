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
import dto.CancelamentoOrdemDeServicoDTO;
import dto.ConclusaoOrdemDeServicoDTO;


public class OrdemDeServicoService {
    private final OrdemDeServicoRepository ordemRepository;
    private final ContaRepository contaRepository;
    private final ValidadorOrdemDeServicoRemoto validador;

    // Recebe os repositórios e a conexão compartilhada com o servidor de validação.
    public OrdemDeServicoService(OrdemDeServicoRepository ordemRepository, ContaRepository contaRepository,
            ConexaoServidor conexaoServidor){
        if (ordemRepository == null){
            throw new IllegalArgumentException("O repositório de OS não pode ser nulo.");
        }

        if (contaRepository == null){
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }

        this.ordemRepository = ordemRepository;
        this.contaRepository = contaRepository;
        this.validador = new ValidadorOrdemDeServicoRemoto(conexaoServidor);
    }

    // Reserva o sequencial do ano e monta o código de acompanhamento da OS.
    private String gerarCodigo(){
        int ano = Year.now(ZoneId.of("America/Sao_Paulo")).getValue();

        long sequencial = ordemRepository.gerarProximoNumero(ano);

        return String.format(Locale.ROOT,"OS%05d%d",ano,sequencial);
    }

    public OrdemDeServico criar(ObjectId municipioId, CadastroOrdemDeServicoDTO dados){
        if (municipioId == null) throw new IllegalArgumentException("O município é obrigatório.");
        var cadastro = validador.prepararCadastro(dados);
        String codigo;
        try {
            codigo = gerarCodigo();
        } catch (MongoException erro){
            if (erro.getCode() == 11000)
                throw new IllegalStateException("Não foi possível reservar o código da OS. Tente novamente.");
            throw erro;
        }
        OrdemDeServico ordem = new OrdemDeServico(municipioId, new ObjectId(cadastro.arvoreId()),
                cadastro.ocorrenciaId() == null ? null : new ObjectId(cadastro.ocorrenciaId()), null, cadastro.titulo(), cadastro.descricao(),
                cadastro.prioridade(), cadastro.observacoes(), codigo);
        return ordemRepository.criarComReferencias(ordem);
    }

    public Map<String, Object> opcoesDeCadastro(ObjectId municipioId){
        return ordemRepository.opcoesDeCadastro(municipioId);
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
