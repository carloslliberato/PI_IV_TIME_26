// Autor: Sophia Fernandes

package repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.mongodb.MongoException;
import com.mongodb.MongoWriteException;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.Updates;
import com.mongodb.client.model.UpdateOptions;

import model.Ocorrencia;

// Classe responsável por salvar, buscar e atualizar as ocorrências no MongoDB
public class OcorrenciaRepository {

    private static final String ID_CONTADOR_CODIGO = "codigo_ocorrencia";
    private static final Pattern PADRAO_CODIGO = Pattern.compile("^OC-(?:\\d{4}-)?(\\d+)$");
    private static final Pattern PADRAO_CODIGO_CANONICO = Pattern.compile("^OC-\\d{6,}$");

    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> arvores;
    private final MongoCollection<Document> sequencias;

    // Conecta na coleção "ocorrencias" do banco de dados
    public OcorrenciaRepository() {
        this(ConexaoMongo.getDatabase());
    }

    // Permite testar a geração usando um banco Mongo exclusivo.
    public OcorrenciaRepository(MongoDatabase banco) {
        this.colecao = banco.getCollection("ocorrencias");
        this.arvores = banco.getCollection("arvores");
        this.sequencias = banco.getCollection("sequencias_ocorrencias");
        inicializarSequenciaCodigo();
        normalizarStatusLegados();
        migrarUrgenciaParaPrioridade();
        removerCamposDeNotificacao();
    }

    private void removerCamposDeNotificacao() {
        colecao.updateMany(
                Filters.or(
                        Filters.exists("receberNotificacoes", true),
                        Filters.exists("nomeContato", true),
                        Filters.exists("emailContato", true),
                        Filters.exists("telefoneContato", true)),
                Updates.combine(
                        Updates.unset("receberNotificacoes"),
                        Updates.unset("nomeContato"),
                        Updates.unset("emailContato"),
                        Updates.unset("telefoneContato")));
    }

    private void migrarUrgenciaParaPrioridade(){
        colecao.updateMany(Filters.and(Filters.exists("urgencia", true), Filters.exists("prioridade", false)),
                Updates.combine(Updates.rename("urgencia", "prioridade")));
        colecao.updateMany(Filters.exists("urgencia", true), Updates.unset("urgencia"));
    }

    private void normalizarStatusLegados(){
        colecao.updateMany(Filters.eq("status", "Em Atendimento"), Updates.set("status", "Em andamento"));
        colecao.updateMany(Filters.eq("status", "Em Análise"), Updates.set("status", "Em andamento"));
        colecao.updateMany(Filters.eq("status", "Pendente"), Updates.set("status", "Recebida"));
    }

    // Salva uma nova ocorrência no MongoDB
    public Document criar(Ocorrencia o) {
        // Gera o código na camada persistente para manter sequência e unicidade entre requisições.
        ObjectId arvoreId = null;
        if (o.getArvoreId() != null && !o.getArvoreId().isBlank()) {
            if (!ObjectId.isValid(o.getArvoreId().trim())) {
                throw new IllegalArgumentException("A árvore selecionada é inválida.");
            }
            arvoreId = new ObjectId(o.getArvoreId().trim());
            Document arvore = arvores.find(Filters.and(
                    Filters.eq("_id", arvoreId),
                    Filters.eq("municipioId", o.getMunicipioId()),
                    Filters.ne("ativa", false))).first();
            if (arvore == null) {
                throw new IllegalArgumentException("A árvore selecionada não está cadastrada ou ativa neste município.");
            }
        }
        o.setId(gerarProximoCodigo());
        Document doc = new Document("_id", o.getOcorrenciaId())
                .append("id", o.getId())
                .append("protocolo", o.getProtocolo())
                .append("municipioId", o.getMunicipioId())
                .append("cidadaoId", identificadorMongoCidadao(o.getCidadaoId()))
                .append("emailCidadao", o.getEmailCidadao())
                .append("arvoreId", arvoreId)
                .append("tipoProblema", o.getTipoProblema())
                .append("descricao", o.getDescricao())
                .append("localizacao", o.getLocalizacao())
                .append("numero", o.getNumero())
                .append("bairro", o.getBairro())
                .append("latitude", o.getLatitude())
                .append("longitude", o.getLongitude())
                .append("imagem", o.getImagem())
                .append("prioridade", o.getUrgencia())
                .append("status", o.getStatus())
                .append("observacaoInterna", o.getObservacaoInterna())
                .append("criadoEm", o.getCriadoEm())
                .append("atualizadoEm", o.getAtualizadoEm());

        colecao.insertOne(doc);
        return doc;
    }

    private void inicializarSequenciaCodigo() {
        // Etapa 1: identifica o maior código já existente para continuar sem reutilizar números.
        long maiorCodigo = 0;
        List<Document> documentos = colecao.find()
                .projection(new Document("id", 1).append("_id", 1))
                .into(new ArrayList<>());
        for (Document documento : documentos) {
            Object valorCodigo = documento.get("id");
            if (!(valorCodigo instanceof String)) {
                valorCodigo = documento.get("_id");
            }
            if (!(valorCodigo instanceof String codigo)) {
                continue;
            }

            Matcher correspondencia = PADRAO_CODIGO.matcher(codigo);
            if (correspondencia.matches()) {
                try {
                    maiorCodigo = Math.max(
                            maiorCodigo,
                            Long.parseLong(correspondencia.group(1)));
                } catch (NumberFormatException erro) {
                    throw new IllegalStateException(
                            "Há um código de ocorrência fora do limite suportado.", erro);
                }
            }
        }

        // Etapa 2: inicializa ou avança o contador atômico, sem sobrescrever uma sequência maior.
        Bson filtroContador = Filters.eq("_id", ID_CONTADOR_CODIGO);
        try {
            sequencias.updateOne(
                    filtroContador,
                    Updates.max("sequencia", maiorCodigo),
                    new UpdateOptions().upsert(true));
        } catch (MongoWriteException erro) {
            // Outra instância pode ter criado o contador ao mesmo tempo.
            if (erro.getError().getCode() != 11000) {
                throw erro;
            }
            sequencias.updateOne(
                    filtroContador,
                    Updates.max("sequencia", maiorCodigo));
        }

        // Etapa 3: converte IDs legados para o formato OC-000001 sem alterar o _id do Mongo.
        migrarCodigosLegados(documentos);

        // Etapa 4: pede ao MongoDB para impedir códigos repetidos quando os dados permitirem.
        try {
            colecao.createIndex(
                    com.mongodb.client.model.Indexes.ascending("id"),
                    new IndexOptions()
                            .unique(true)
                            .name("uk_ocorrencia_codigo")
                            .partialFilterExpression(new Document(
                                    "id",
                                    new Document("$type", "string").append("$gt", ""))));
        } catch (MongoException erro) {
            // Registros legados duplicados não impedem o serviço; a sequência evita reutilizá-los.
            if (erro.getCode() != 11000) {
                throw erro;
            }
            System.err.println(
                    "Não foi possível criar o índice único dos códigos de ocorrência: "
                            + "há códigos duplicados no banco.");
        }
    }

    private void migrarCodigosLegados(List<Document> documentos) {
        for (Document documento : documentos) {
            Object codigoAtual = documento.get("id");
            if (codigoAtual instanceof String codigo
                    && PADRAO_CODIGO_CANONICO.matcher(codigo).matches()) {
                continue;
            }

            String codigoNovo = gerarProximoCodigo();
            Bson filtroCodigoAtual = codigoAtual == null
                    ? Filters.or(Filters.exists("id", false), Filters.eq("id", null))
                    : Filters.eq("id", codigoAtual);
            colecao.updateOne(
                    Filters.and(
                            Filters.eq("_id", documento.get("_id")),
                            filtroCodigoAtual),
                    Updates.set("id", codigoNovo));
        }
    }

    private String gerarProximoCodigo() {
        // Reserva um número indivisível entre requisições/instâncias e monta o código legível.
        Document contador = sequencias.findOneAndUpdate(
                Filters.eq("_id", ID_CONTADOR_CODIGO),
                Updates.inc("sequencia", 1L),
                new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(ReturnDocument.AFTER));
        Object sequencia = contador == null ? null : contador.get("sequencia");
        if (!(sequencia instanceof Number numero) || numero.longValue() <= 0) {
            throw new IllegalStateException(
                    "Não foi possível gerar o próximo código da ocorrência.");
        }
        return String.format(Locale.ROOT, "OC-%06d", numero.longValue());
    }

    private Object identificadorMongoCidadao(String cidadaoId) {
        return ObjectId.isValid(cidadaoId)
                ? new ObjectId(cidadaoId)
                : cidadaoId;
    }

    public List<Document> listarPorCidadaoId(String cidadaoId) {
        Object identificador = identificadorMongoCidadao(cidadaoId);
        Bson filtro = Filters.or(
                Filters.eq("cidadaoId", identificador),
                Filters.eq("cidadaoId", cidadaoId));
        return colecao.find(filtro)
                .projection(new Document("emailCidadao", 0))
                .sort(Sorts.descending("criadoEm"))
                .into(new ArrayList<>());
    }

    // Lista as ocorrências podendo filtrar por município, tipo, status, prioridade ou cidadão
    public List<Document> listarComFiltros(String municipioId, String tipoProblema, String status, String urgencia, String cidadaoId, String emailCidadao) {
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
            filtros.add(Filters.regex("prioridade", "^" + urgencia + "$", "i"));
        }
        if (cidadaoId != null && !cidadaoId.isBlank()) {
            if (ObjectId.isValid(cidadaoId)) {
                filtros.add(Filters.or(
                        Filters.eq("cidadaoId", new ObjectId(cidadaoId)),
                        Filters.eq("cidadaoId", cidadaoId)));
            } else {
                filtros.add(Filters.eq("cidadaoId", cidadaoId));
            }
        }
        if (emailCidadao != null && !emailCidadao.isBlank()) {
            filtros.add(Filters.eq("emailCidadao", emailCidadao.trim().toLowerCase(Locale.ROOT)));
        }

        Bson query = filtros.isEmpty() ? new Document() : Filters.and(filtros);
        return colecao.find(query)
                .projection(new Document("emailCidadao", 0))
                .sort(Sorts.descending("criadoEm"))
                .into(new ArrayList<>());
    }

    // Busca uma ocorrência específica pelo ID
    public Document buscarPorId(String id) {
        return colecao.find(filtroPorId(id))
                .projection(new Document("emailCidadao", 0))
                .first();
    }

    // Busca uma ocorrência pelo número de protocolo (ex: CH-123456)
    public Document buscarPorProtocolo(String protocolo) {
        return colecao.find(Filters.eq("protocolo", protocolo))
                .projection(new Document("emailCidadao", 0))
                .first();
    }

    // Atualiza o status do chamado no banco
    public boolean atualizarStatus(String id, String novoStatus, String observacao) {
        if (!List.of("Recebida", "Em andamento", "Cancelada", "Concluída").contains(novoStatus)) {
            throw new IllegalArgumentException("Status de ocorrência inválido.");
        }
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
                        Updates.set("prioridade", novaUrgencia),
                        Updates.unset("urgencia"),
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
