// Autor: Carlos Luciano, Marialvo Junior

package repository;

import static com.mongodb.client.model.Filters.eq;

import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
import org.bson.types.ObjectId;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;

public class RelatorioRepository {
    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> colecaoArvores;
    private final MongoCollection<Document> colecaoOcorrencias;
    private final MongoCollection<Document> colecaoEquipes;

    public RelatorioRepository() {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("ordens_servico");
        this.colecaoArvores = banco.getCollection("arvores");
        this.colecaoOcorrencias = banco.getCollection("ocorrencias");
        this.colecaoEquipes = banco.getCollection("equipes");
    }

    public List<Document> listarDadosDasOrdens(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        List<Document> ordens = new ArrayList<>();
        Document campos = new Document("_id", 0)
                .append("status", 1)
                .append("dataCriacao", 1);

        try (MongoCursor<Document> cursor = colecao.find(eq("municipioId", municipioId))
                .projection(campos)
                .iterator()) {

            while (cursor.hasNext()) {
                ordens.add(cursor.next());
            }
        }

        return ordens;
    }

    public Document listarDadosDasArvores(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Document filtro = new Document("municipioId", municipioId)
                .append("ativa", new Document("$ne", false));

        Document agrupamentos = new Document("porBairro", etapasAgrupamento("bairro"))
                .append("porEspecie", etapasAgrupamento("especie"))
                .append("porRisco", etapasAgrupamento("risco"));

        return colecaoArvores.aggregate(List.of(
                new Document("$match", filtro),
                new Document("$facet", agrupamentos)
        )).first();
    }

    public Document listarDadosDasOcorrencias(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Document filtro = new Document("municipioId", municipioId);

        Document agrupamentos = new Document("porStatus", etapasAgrupamento("status"))
                .append("porBairro", etapasAgrupamento("bairro"))
                .append("porUrgencia", etapasAgrupamento("prioridade"));

        return colecaoOcorrencias.aggregate(List.of(
                new Document("$match", filtro),
                new Document("$facet", agrupamentos)
        )).first();
    }

    public Document listarDadosDasEquipes(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        List<Document> equipes = new ArrayList<>();
        List<Document> ordens = new ArrayList<>();

        Document camposEquipes = new Document("_id", 1)
                .append("codigo", 1)
                .append("nome", 1)
                .append("nomeEquipe", 1)
                .append("regiao", 1)
                .append("regiaoAtuacao", 1);

        try (MongoCursor<Document> cursor = colecaoEquipes
                .find(eq("municipioId", municipioId))
                .projection(camposEquipes)
                .iterator()) {

            while (cursor.hasNext()) {
                equipes.add(cursor.next());
            }
        }

        Document camposOrdens = new Document("_id", 0)
                .append("equipeId", 1)
                .append("status", 1)
                .append("dataCriacao", 1);

        try (MongoCursor<Document> cursor = colecao
                .find(eq("municipioId", municipioId))
                .projection(camposOrdens)
                .iterator()) {

            while (cursor.hasNext()) {
                ordens.add(cursor.next());
            }
        }

        return new Document("equipes", equipes)
                .append("ordens", ordens);
    }

    private List<Document> etapasAgrupamento(String campo) {
        Document texto = new Document("$cond", List.of(
                new Document("$eq", List.of(new Document("$type", "$" + campo), "string")),
                new Document("$trim", new Document("input", "$" + campo)),
                ""
        ));

        Document grupo = new Document("$cond", List.of(
                new Document("$eq", List.of(texto, "")),
                "Não informado",
                texto
        ));

        return List.of(
                new Document("$group", new Document("_id", grupo)
                        .append("quantidade", new Document("$sum", 1))),
                new Document("$project", new Document("_id", 0)
                        .append("grupo", "$_id")
                        .append("quantidade", 1)),
                new Document("$sort", new Document("quantidade", -1)
                        .append("grupo", 1))
        );
    }
}
