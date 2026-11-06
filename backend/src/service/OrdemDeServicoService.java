package service;
import model.OrdemDeServico;
import repository.OrdemDeServicoRepository;
import org.bson.types.ObjectId;
import java.util.List;
import java.util.Optional;

public class OrdemDeServicoService {
    private final OrdemDeServicoRepository ordemRepository;

    public OrdemDeServicoService(OrdemDeServicoRepository ordemRepository){
        if (ordemRepository == null){
            throw new IllegalArgumentException("O repositorio de OS não pode ser nulo.");
        }

        this.ordemRepository = ordemRepository;
    }

    // Lista as ordens de servico do municipio informado.
    public List<OrdemDeServico> listarPorMunicipio(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return ordemRepository.listarPorMunicipio(municipioId);
    }

    // Busca uma OS e verifica se ela pertence ao municipio informado.
    public OrdemDeServico buscarPorId(ObjectId id, ObjectId municipioId){
        if (id == null){
            throw new IllegalArgumentException("O identificador da OS não pode ser nulo.");
        }

        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Optional<OrdemDeServico> resultado = ordemRepository.buscarPorId(id);

        if (resultado.isEmpty()){
            throw new IllegalArgumentException("OS não encontrada nesse município.");
        }

        OrdemDeServico ordem = resultado.get();

        if (!municipioId.equals(ordem.getMunicipioId())){
            throw new IllegalArgumentException("OS não encontrada nesse município.");
        }

        return ordem;
    }

    // Conclui uma OS do municipio informado e salva a alteracao.
    public OrdemDeServico concluir(ObjectId id, ObjectId municipioId){
        OrdemDeServico ordem = buscarPorId(id, municipioId);

        ordem.concluir();
        ordemRepository.atualizar(ordem);
        return ordem;
    }
    
}
