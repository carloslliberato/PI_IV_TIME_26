package model;
import java.time.Instant;
import java.util.List;
import org.bson.types.ObjectId;

// Representa um serviço executado em uma árvore e preservado no histórico.
public class Intervencao{
    private final ObjectId intervencaoId;
    private final ObjectId municipioId;
    private final ObjectId arvoreId;
    private final ObjectId ordemServicoId;
    private final ObjectId equipeId;
    private final ObjectId usuarioId;
    private final String tipo;
    private final String descricao;
    private final List<String> fotos;
    private final Instant dataExecucao;
    private final Instant dataCriacao;

    // Cria uma intervenção com identificador e data de registro gerados pelo sistema.
    public Intervencao(
            ObjectId municipioId,
            ObjectId arvoreId,
            ObjectId ordemServicoId,
            ObjectId equipeId,
            ObjectId usuarioId,
            String tipo,
            String descricao,
            List<String> fotos,
            Instant dataExecucao){

        this(
                new ObjectId(),
                municipioId,
                arvoreId,
                ordemServicoId,
                equipeId,
                usuarioId,
                tipo,
                descricao,
                fotos,
                dataExecucao,
                Instant.now());
    }

    // Reconstrói uma intervenção com os dados armazenados no banco.
    public Intervencao(
            ObjectId intervencaoId,
            ObjectId municipioId,
            ObjectId arvoreId,
            ObjectId ordemServicoId,
            ObjectId equipeId,
            ObjectId usuarioId,
            String tipo,
            String descricao,
            List<String> fotos,
            Instant dataExecucao,
            Instant dataCriacao){
        this.intervencaoId = intervencaoId;
        this.municipioId = municipioId;
        this.arvoreId = arvoreId;
        this.ordemServicoId = ordemServicoId;
        this.equipeId = equipeId;
        this.usuarioId = usuarioId;
        this.tipo = tipo;
        this.descricao = descricao;
        this.fotos = fotos == null ? List.of() : List.copyOf(fotos);
        this.dataExecucao = dataExecucao;
        this.dataCriacao = dataCriacao;
    }

    public ObjectId getIntervencaoId(){
        return intervencaoId;
    }

    public ObjectId getMunicipioId(){
        return municipioId;
    }

    public ObjectId getArvoreId(){
        return arvoreId;
    }

    public ObjectId getOrdemServicoId(){
        return ordemServicoId;
    }

    public ObjectId getEquipeId(){
        return equipeId;
    }

    // Identifica a conta do funcionário que registrou a intervenção.
    public ObjectId getUsuarioId(){
        return usuarioId;
    }

    public String getTipo(){
        return tipo;
    }

    public String getDescricao(){
        return descricao;
    }

    // Retorna as referências das fotos em uma lista que não pode ser alterada.
    public List<String> getFotos(){
        return fotos;
    }

    public Instant getDataExecucao(){
        return dataExecucao;
    }

    public Instant getDataCriacao(){
        return dataCriacao;
    }
}
