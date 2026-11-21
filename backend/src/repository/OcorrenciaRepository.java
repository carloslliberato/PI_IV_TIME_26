// Autor: Sophia Fernandes

package repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

import org.bson.BsonType;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.Updates;
import com.mongodb.client.model.UpdateOptions;

import model.Ocorrencia;

// Classe responsável por salvar, buscar e atualizar as ocorrências no MongoDB
public class OcorrenciaRepository {

    private static final String ID_CONTADOR_CODIGO_GLOBAL = "codigo_ocorrencia_global";
    private static final String CAMPO_MIGRACAO_CODIGO_GLOBAL = "codigoGlobalMigrado";

    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> contadores;

    // Conecta na coleção "ocorrencias" do banco de dados
    public OcorrenciaRepository() {
        this(ConexaoMongo.getDatabase());
    }

    public OcorrenciaRepository(MongoDatabase db) {
        Objects.requireNonNull(db, "O banco de ocorrências não pode ser nulo.");
        this.colecao = db.getCollection("ocorrencias");
        this.contadores = db.getCollection("contadores_ocorrencias");
        migrarCodigosParaSequenciaGlobal();
        this.colecao.createIndex(
                com.mongodb.client.model.Indexes.ascending("id"),
                new IndexOptions()
                        .name("codigo_ocorrencia_unico")
                        .unique(true)
                        .partialFilterExpression(Filters.type("id", BsonType.STRING)));
    }

    // Salva uma nova ocorrência no MongoDB
    public Document criar(Ocorrencia o) {
        if (o == null) {
            throw new IllegalArgumentException("Os dados da ocorrência são obrigatórios.");
        }
        o.setId(gerarCodigoOcorrencia());
        Document doc = new Document("_id", o.getOcorrenciaId())
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

    private String gerarCodigoOcorrencia() {
        Document contador = contadores.findOneAndUpdate(
                Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL),
                Updates.inc("sequencia", 1L),
                new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(ReturnDocument.AFTER));
        if (contador == null) {
            throw new IllegalStateException("Não foi possível gerar o código da ocorrência.");
        }
        long sequencia = ((Number) contador.get("sequencia")).longValue();
        return String.format(Locale.ROOT, "OC-%06d", sequencia);
    }

    private void migrarCodigosParaSequenciaGlobal() {
        Document contador = contadores.find(Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL)).first();
        if (contador != null && Boolean.TRUE.equals(contador.get(CAMPO_MIGRACAO_CODIGO_GLOBAL))) {
            return;
        }

        List<Document> documentos = colecao.find()
                .projection(new Document("_id", 1).append("id", 1))
                .sort(Sorts.ascending("_id"))
                .into(new ArrayList<>());

        for (int indice = 0; indice < documentos.size(); indice++) {
            Document documento = documentos.get(indice);
            Object id = documento.get("_id");
            String codigoNovo = formatarCodigoOcorrencia(indice + 1L);
            Object codigoAtual = documento.get("id");
            if (!codigoNovo.equals(codigoAtual)) {
                colecao.updateOne(
                        Filters.eq("_id", id),
                        Updates.set("id", "MIGRANDO-OC-" + new ObjectId().toHexString()));
            }
        }

        for (int indice = 0; indice < documentos.size(); indice++) {
            Document documento = documentos.get(indice);
            Object id = documento.get("_id");
            String codigoNovo = formatarCodigoOcorrencia(indice + 1L);
            colecao.updateOne(
                    Filters.eq("_id", id),
                    Updates.set("id", codigoNovo));
        }

        long sequencia = documentos.size();
        contadores.updateOne(
                Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL),
                Updates.combine(
                        Updates.set("sequencia", sequencia),
                        Updates.set(CAMPO_MIGRACAO_CODIGO_GLOBAL, true)),
                new UpdateOptions().upsert(true));
    }

    private static String formatarCodigoOcorrencia(long sequencia) {
        return String.format(Locale.ROOT, "OC-%06d", sequencia);
    }

    // Lista as ocorrências podendo filtrar por município, tipo, status, prioridade ou cidadão
    public List<Document> listarComFiltros(String municipioId, String tipoProblema, String status, String urgencia, String cidadaoId) {
        List<Bson> filtros = new ArrayList<>();

        if (municipioId != null && !municipioId.isBlank()) {
            if (ObjectId.isValid(municipioId)) {
                filtros.add(Filters.eq("municipioId", new ObjectId(municipioId)));
            } else {
                // Compatibilidade com registros antigos que guardavam o município como texto.
                filtros.add(Filters.regex("municipioId", "^" + municipioId + "$", "i"));
            }
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
        return colecao.find(filtroPorId(id)).first();
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
        return colecao.updateOne(filtroPorId(id), Updates.combine(updates)).getModifiedCount() > 0;
    }

    // Atualiza a prioridade (urgência) do chamado no banco
    public boolean atualizarPrioridade(String id, String novaUrgencia) {
        return colecao.updateOne(
                filtroPorId(id),
                Updates.combine(
                        Updates.set("urgencia", novaUrgencia),
                        Updates.set("atualizadoEm", Instant.now().toString())
                )
        ).getModifiedCount() > 0;
    }

    // Atualiza a preferência de notificações de um chamado no MongoDB
    public boolean atualizarNotificacao(String id, boolean receber, String nome, String email, String telefone) {
        return colecao.updateOne(
                filtroPorId(id),
                Updates.combine(
                        Updates.set("receberNotificacoes", receber),
                        Updates.set("nomeContato", nome),
                        Updates.set("emailContato", email),
                        Updates.set("telefoneContato", telefone),
                        Updates.set("atualizadoEm", Instant.now().toString())
                )
        ).getModifiedCount() > 0;
    }

    // A API aceita o ID textual personalizado; ObjectId e registros antigos também são aceitos.
    private Bson filtroPorId(String id) {
        List<Bson> alternativas = new ArrayList<>();
        alternativas.add(Filters.eq("id", id));
        // Também localiza documentos legados cujo identificador textual estava em _id.
        alternativas.add(Filters.eq("_id", id));
        if (ObjectId.isValid(id)) {
            ObjectId objectId = new ObjectId(id);
            alternativas.add(Filters.eq("_id", objectId));
            // Compatibilidade com documentos criados antes da migração para _id ObjectId.
            alternativas.add(Filters.eq("ocorrenciaId", objectId));
        }
        return Filters.or(alternativas);
    }
}
