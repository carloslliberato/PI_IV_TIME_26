package service;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Locale;
import java.time.Year;
import java.time.ZoneId;
import org.bson.types.ObjectId;
import model.Conta;
import model.OrdemDeServico;
import repository.ContaRepository;
import repository.OrdemDeServicoRepository;
import dto.CadastroOrdemDeServicoDTO;


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

    // Verifica os campos obrigatórios para criar uma ordem de serviço.
    private void validarDadosDeCriacao(CadastroOrdemDeServicoDTO dados){
        if (dados == null){
            throw new IllegalArgumentException("Os dados da ordem de serviço não foram informados.");
        }

        if (dados.getTitulo() == null || dados.getTitulo().isBlank()){
            throw new IllegalArgumentException("O título da ordem de serviço é obrigatório.");
        }

        if (dados.getDescricao() == null || dados.getDescricao().isBlank()){
            throw new IllegalArgumentException("A descrição da ordem de serviço é obrigatória.");
        }

        String arvoreId = dados.getArvoreId();

        if (arvoreId == null || arvoreId.isBlank()){
            throw new IllegalArgumentException("Selecione uma árvore para a ordem de serviço.");
        }

        if (!ObjectId.isValid(arvoreId)){
            throw new IllegalArgumentException("O identificador da árvore é inválido.");
        }
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

    // Conclui uma OS do município informado e salva a alteração.
    public OrdemDeServico concluir(ObjectId id, ObjectId municipioId){
        OrdemDeServico ordem = buscarPorId(id, municipioId);

        ordem.concluir();
        ordemRepository.atualizar(ordem);
        return ordem;
    }

    // Cancela uma OS do município informado e salva a alteração.
    public OrdemDeServico cancelar(ObjectId id, ObjectId municipioId){
        OrdemDeServico ordem = buscarPorId(id, municipioId);

        ordem.cancelar();
        ordemRepository.atualizar(ordem);
        return ordem;
    }

}
