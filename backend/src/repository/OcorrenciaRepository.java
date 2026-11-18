// feito por Sophia
package repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.conversions.Bson;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.Updates;

import model.Ocorrencia;

// Classe responsável por salvar, buscar e atualizar as ocorrências no MongoDB
public class OcorrenciaRepository {

    private final MongoCollection<Document> colecao;

    // Conecta na coleção "ocorrencias" do banco de dados
    public OcorrenciaRepository() {
        MongoDatabase db = ConexaoMongo.getDatabase();
        this.colecao = db.getCollection("ocorrencias");
    }

    // Salva uma nova ocorrência no MongoDB
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
                .append("bairro", o.getBairro())
                .append("latitude", o.getLatitude())
                .append("longitude", o.getLongitude())
                .append("imagem", o.getImagem())
                .append("receberNotificacoes", o.isReceberNotificacoes())
                .append("nomeContato", o.getNomeContato())
                .append("emailContato", o.getEmailContato())
                .append("telefoneContato", o.getTelefoneContato())
                .append("urgencia", o.getUrgencia())
                .append("status", o.getStatus())
                .append("observacaoInterna", o.getObservacaoInterna())
                .append("criadoEm", o.getCriadoEm())
                .append("atualizadoEm", o.getAtualizadoEm());

        colecao.insertOne(doc);
        return doc;
    }

    // Lista as ocorrências podendo filtrar por município, tipo, status, prioridade ou cidadão
    public List<Document> listarComFiltros(String municipioId, String tipoProblema, String status, String urgencia, String cidadaoId) {
        List<Bson> filtros = new ArrayList<>();

        if (municipioId != null && !municipioId.isBlank()) {
            filtros.add(Filters.regex("municipioId", "^" + municipioId + "$", "i"));
        }
        if (tipoProblema != null && !tipoProblema.isBlank()) {
            filtros.add(Filters.regex("tipoProblema", tipoProblema, "i"));
        }
        if (status != null && !status.isBlank()) {
            filtros.add(Filters.regex("status", "^" + status + "$", "i"));
        }
        if (urgencia != null && !urgencia.isBlank()) {
            filtros.add(Filters.regex("urgencia", "^" + urgencia + "$", "i"));
        }
        if (cidadaoId != null && !cidadaoId.isBlank()) {
            filtros.add(Filters.eq("cidadaoId", cidadaoId));
        }

        Bson query = filtros.isEmpty() ? new Document() : Filters.and(filtros);
        return colecao.find(query)
                .sort(Sorts.descending("criadoEm"))
                .into(new ArrayList<>());
    }

    // Busca uma ocorrência específica pelo ID
    public Document buscarPorId(String id) {
        return colecao.find(Filters.eq("_id", id)).first();
    }

    // Busca uma ocorrência pelo número de protocolo (ex: CH-123456)
    public Document buscarPorProtocolo(String protocolo) {
        return colecao.find(Filters.eq("protocolo", protocolo)).first();
    }

    // Atualiza o status do chamado no banco
    public boolean atualizarStatus(String id, String novoStatus, String observacao) {
        List<Bson> updates = new ArrayList<>();
        updates.add(Updates.set("status", novoStatus));
        updates.add(Updates.set("atualizadoEm", Instant.now().toString()));
        if (observacao != null && !observacao.isBlank()) {
            updates.add(Updates.set("observacaoInterna", observacao));
        }
        return colecao.updateOne(Filters.eq("_id", id), Updates.combine(updates)).getModifiedCount() > 0;
    }

    // Atualiza a prioridade (urgência) do chamado no banco
    public boolean atualizarPrioridade(String id, String novaUrgencia) {
        return colecao.updateOne(
                Filters.eq("_id", id),
                Updates.combine(
                        Updates.set("urgencia", novaUrgencia),
                        Updates.set("atualizadoEm", Instant.now().toString())
                )
        ).getModifiedCount() > 0;
    }

    // Atualiza a preferência de notificações de um chamado no MongoDB
    public boolean atualizarNotificacao(String id, boolean receber, String nome, String email, String telefone) {
        return colecao.updateOne(
                Filters.eq("_id", id),
                Updates.combine(
                        Updates.set("receberNotificacoes", receber),
                        Updates.set("nomeContato", nome),
                        Updates.set("emailContato", email),
                        Updates.set("telefoneContato", telefone),
                        Updates.set("atualizadoEm", Instant.now().toString())
                )
        ).getModifiedCount() > 0;
    }
}