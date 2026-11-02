package repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.conversions.Bson;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;

import model.Ocorrencia;

public class OcorrenciaRepository {
    private final MongoCollection<Document> colecao;

    public OcorrenciaRepository() {
        MongoDatabase db = ConexaoMongo.getDatabase();
        this.colecao = db.getCollection("ocorrencias");
    }

    public Document criar(Ocorrencia o) {
        Document doc = new Document("_id", o.getId())
                .append("id", o.getId())
                .append("protocolo", o.getProtocolo())
                .append("municipioId", o.getMunicipioId())
                .append("cidadaoId", o.getCidadaoId())
                .append("arvoreId", o.getArvoreId())
                .append("tipoProblema", o.getTipoProblema())
                .append("descricao", o.getDescricao())
                .append("localizacao", o.getLocalizacao())
                .append("latitude", o.getLatitude())
                .append("longitude", o.getLongitude())
                .append("urgencia", o.getUrgencia())
                .append("status", o.getStatus())
                .append("observacaoInterna", o.getObservacaoInterna())
                .append("criadoEm", o.getCriadoEm())
                .append("atualizadoEm", o.getAtualizadoEm());

        colecao.insertOne(doc);
        return doc;
    }

    public List<Document> listarComFiltros(String status, String urgencia, String municipioId, String cidadaoId) {
        List<Bson> filtros = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            filtros.add(Filters.eq("status", status));
        }
        if (urgencia != null && !urgencia.isBlank()) {
            filtros.add(Filters.eq("urgencia", urgencia));
        }
        if (municipioId != null && !municipioId.isBlank()) {
            filtros.add(Filters.eq("municipioId", municipioId));
        }
        if (cidadaoId != null && !cidadaoId.isBlank()) {
            filtros.add(Filters.eq("cidadaoId", cidadaoId));
        }

        Bson filtroFinal = filtros.isEmpty() ? new Document() : Filters.and(filtros);
        return colecao.find(filtroFinal).into(new ArrayList<>());
    }

    public Document buscarPorId(String id) {
        Document doc = colecao.find(Filters.eq("_id", id)).first();
        if (doc == null) {
            doc = colecao.find(Filters.eq("protocolo", id)).first();
        }
        return doc;
    }

    // Método exigido pelo OcorrenciaService
    public Document buscarPorProtocolo(String protocolo) {
        return colecao.find(Filters.eq("protocolo", protocolo)).first();
    }

    public boolean atualizar(String id, Document camposAtualizados) {
        camposAtualizados.put("atualizadoEm", Instant.now().toString());
        return colecao.updateOne(
                Filters.eq("_id", id),
                new Document("$set", camposAtualizados)
        ).getModifiedCount() > 0;
    }

    public boolean atualizarStatus(String id, String novoStatus, String observacaoInterna) {
        List<Bson> updates = new ArrayList<>();
        updates.add(Updates.set("status", novoStatus));
        updates.add(Updates.set("atualizadoEm", Instant.now().toString()));

        if (observacaoInterna != null) {
            updates.add(Updates.set("observacaoInterna", observacaoInterna));
        }

        return colecao.updateOne(Filters.eq("_id", id), Updates.combine(updates)).getModifiedCount() > 0;
    }

    // Método exigido pelo OcorrenciaService
    public boolean atualizarPrioridade(String id, String novaUrgencia) {
        return colecao.updateOne(
                Filters.eq("_id", id),
                Updates.combine(
                        Updates.set("urgencia", novaUrgencia),
                        Updates.set("atualizadoEm", Instant.now().toString())
                )
        ).getModifiedCount() > 0;
    }

    public boolean deletar(String id) {
        return colecao.deleteOne(Filters.eq("_id", id)).getDeletedCount() > 0;
    }
}