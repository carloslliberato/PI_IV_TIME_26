package repository;

import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Sorts.descending;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import model.Intervencao;

public class IntervencaoRepository{
    private final MongoCollection<Document> colecao;

    public IntervencaoRepository(){
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("intervencoes");
    }

    // Insere uma intervenção no histórico.
    public void salvar(Intervencao intervencao){
        if (intervencao == null){
            throw new IllegalArgumentException("A intervenção não pode ser nula.");
        }

        if (intervencao.getIntervencaoId() == null){
            throw new IllegalArgumentException("A intervenção precisa possuir um identificador.");
        }

        Document documento = converterParaDocumento(intervencao);
        colecao.insertOne(documento);
    }

    // Lista as intervenções do município informado.
    public List<Intervencao> listarPorMunicipio(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return consultar(eq("municipioId", municipioId));
    }

    // Lista o histórico de uma árvore dentro do município informado.
    public List<Intervencao> listarPorArvore(ObjectId arvoreId, ObjectId municipioId){
        if (arvoreId == null){
            throw new IllegalArgumentException("O identificador da árvore não pode ser nulo.");
        }

        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return consultar(and(
                eq("municipioId", municipioId),
                eq("arvoreId", arvoreId)));
    }

    // Executa a consulta e apresenta primeiro os serviços executados mais recentemente.
    private List<Intervencao> consultar(Bson filtro){
        List<Intervencao> intervencoes = new ArrayList<>();

        try (MongoCursor<Document> cursor = colecao.find(filtro)
                .sort(descending("dataExecucao", "dataCriacao"))
                .iterator()) {

            while (cursor.hasNext()){
                intervencoes.add(converterParaIntervencao(cursor.next()));
            }
        }

        return intervencoes;
    }

    // Converte o objeto Java para os campos armazenados no MongoDB.
    private Document converterParaDocumento(Intervencao intervencao){
        Document documento = new Document();

        documento.append("_id", intervencao.getIntervencaoId());
        documento.append("municipioId", intervencao.getMunicipioId());
        documento.append("arvoreId", intervencao.getArvoreId());
        documento.append("ordemServicoId", intervencao.getOrdemServicoId());
        documento.append("equipeId", intervencao.getEquipeId());
        documento.append("usuarioId", intervencao.getUsuarioId());
        documento.append("tipo", intervencao.getTipo());
        documento.append("descricao", intervencao.getDescricao());
        documento.append("fotos", intervencao.getFotos());

        if (intervencao.getDataExecucao() != null){
            documento.append("dataExecucao", Date.from(intervencao.getDataExecucao()));
        }

        if (intervencao.getDataCriacao() != null){
            documento.append("dataCriacao", Date.from(intervencao.getDataCriacao()));
        }

        return documento;
    }

    // Reconstrói a intervenção usando o construtor destinado aos dados do banco.
    private Intervencao converterParaIntervencao(Document documento){
        Date dataExecucao = documento.getDate("dataExecucao");
        Date dataCriacao = documento.getDate("dataCriacao");

        Instant instanteExecucao = dataExecucao == null ? null : dataExecucao.toInstant();
        Instant instanteCriacao = dataCriacao == null ? null : dataCriacao.toInstant();

        return new Intervencao(
                documento.getObjectId("_id"),
                documento.getObjectId("municipioId"),
                documento.getObjectId("arvoreId"),
                documento.getObjectId("ordemServicoId"),
                documento.getObjectId("equipeId"),
                documento.getObjectId("usuarioId"),
                documento.getString("tipo"),
                documento.getString("descricao"),
                documento.getList("fotos", String.class),
                instanteExecucao,
                instanteCriacao);
    }
}
