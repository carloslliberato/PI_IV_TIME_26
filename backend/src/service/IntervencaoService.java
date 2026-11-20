package service;

import java.util.List;
import java.util.Optional;
import org.bson.types.ObjectId;
import model.Conta;
import model.Intervencao;
import repository.ContaRepository;
import repository.IntervencaoRepository;

public class IntervencaoService{
    private final IntervencaoRepository intervencaoRepository;
    private final ContaRepository contaRepository;

    // Recebe os repositórios utilizados nas consultas de intervenções.
    public IntervencaoService(
            IntervencaoRepository intervencaoRepository,
            ContaRepository contaRepository){

        if (intervencaoRepository == null){
            throw new IllegalArgumentException("O repositório de intervenções não pode ser nulo.");
        }

        if (contaRepository == null){
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }

        this.intervencaoRepository = intervencaoRepository;
        this.contaRepository = contaRepository;
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
            throw new SecurityException("Somente funcionários podem consultar intervenções.");
        }

        if (funcionario.getMunicipioId() == null){
            throw new SecurityException("O funcionário não possui um município vinculado.");
        }

        return funcionario.getMunicipioId();
    }

    // Lista as intervenções do município informado.
    public List<Intervencao> listarPorMunicipio(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return intervencaoRepository.listarPorMunicipio(municipioId);
    }

    // Consulta o histórico de uma árvore dentro do município informado.
    public List<Intervencao> listarPorArvore(ObjectId arvoreId, ObjectId municipioId){
        if (arvoreId == null){
            throw new IllegalArgumentException("O identificador da árvore não pode ser nulo.");
        }

        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return intervencaoRepository.listarPorArvore(arvoreId, municipioId);
    }
}
