package repository;

import java.util.Date;
import java.util.ArrayList;
import java.util.List;
import java.time.Instant;
import java.util.Optional;
import java.util.regex.Pattern;

import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import com.mongodb.MongoException;
import com.mongodb.MongoWriteException;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Collation;
import com.mongodb.client.model.CollationStrength;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;

import model.Colaborador;
import model.Equipe;

import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.elemMatch;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.exists;
import static com.mongodb.client.model.Filters.ne;
import static com.mongodb.client.model.Filters.nor;
import static com.mongodb.client.model.Filters.or;
import static com.mongodb.client.model.Filters.regex;

// Centraliza o acesso à coleção equipes do MongoDB.
public class EquipeRepository {

    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> ordensServico;

    // Obtém a coleção usando a conexão compartilhada pelo backend.
    public EquipeRepository() {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("equipes");
        this.ordensServico = banco.getCollection("ordens_servico");

        try {
            // Mantém a garantia no Mongo quando os dados existentes permitem criar o índice.
            this.colecao.createIndex(
                    Indexes.ascending("nome"),
                    new IndexOptions()
                            .unique(true)
                            .name("uk_equipes_nome")
                            .collation(Collation.builder()
                                    .locale("pt")
                                    .collationStrength(CollationStrength.SECONDARY)
                                    .build()));
        } catch (MongoException erro) {
            // Dados duplicados antigos não devem impedir a inicialização do servidor.
            if (erro.getCode() != 11000) {
                throw erro;
            }
            System.err.println(
                    "Não foi possível criar o índice único de equipes: há nomes duplicados "
                            + "na coleção. Novos cadastros continuam validados pela aplicação.");
        }

        // Cria uma restrição global para e-mails novos em colaboradores de equipes diferentes.
        try {
            this.colecao.createIndex(
                    Indexes.ascending("colaboradores.email"),
                    new IndexOptions()
                            .unique(true)
                            .sparse(true)
                            .name("uk_colaboradores_email")
                            .collation(Collation.builder()
                                    .locale("en")
                                    .collationStrength(CollationStrength.SECONDARY)
                                    .build()));
        } catch (MongoException erro) {
            // Duplicatas legadas não impedem o servidor de subir; o serviço ainda as verifica.
            if (erro.getCode() != 11000) {
                throw erro;
            }
            System.err.println(
                    "Não foi possível criar o índice único de e-mails: há colaboradores com "
                            + "e-mails repetidos. Novos cadastros continuam validados pela aplicação.");
        }
    }

    // Converte a equipe para o formato de documento usado pela coleção.
    public void salvar(Equipe equipe) {
        // Impede nomes duplicados sem executar alteração de índices ao iniciar o servidor.
        if (colecao.find(eq("nome", equipe.getNome()))
                .collation(Collation.builder()
                        .locale("pt")
                        .collationStrength(CollationStrength.SECONDARY)
                        .build())
                .first() != null) {
            throw new IllegalArgumentException(
                    "Já existe uma equipe cadastrada com esse nome.");
        }

        Document documento = new Document()
                .append("_id", equipe.getId())
                .append("nome", equipe.getNome())
                .append("regiao", equipe.getRegiaoAtuacao())
                .append("status", equipe.getStatus())
                .append("municipioId", equipe.getMunicipioId())
                .append("municipioNome", equipe.getMunicipioNome())
                .append("usuarioId", equipe.getUsuarioId())
                .append("usuarioNome", equipe.getUsuarioNome())
                .append("gestor", new Document("email", equipe.getGestor()))
                .append("dataCadastro", Date.from(equipe.getDataCadastro()))
                .append("colaboradores", new ArrayList<Document>());

        try {
            // Insere o documento pronto na coleção equipes.
            colecao.insertOne(documento);
        } catch (MongoWriteException erro) {
            // Também detecta uma duplicidade criada simultaneamente por outra requisição.
            if (erro.getError().getCode() == 11000) {
                throw new IllegalArgumentException(
                        "Já existe uma equipe cadastrada com esse nome.");
            }
            throw erro;
        }
    }

    // Busca equipes da conta autenticada depois de normalizar status e dados antigos.
    public List<Equipe> listarPorMunicipioEUsuario(
            ObjectId municipioId,
            String municipioNome,
            ObjectId usuarioId,
            String usuarioNome,
            String busca,
            String status) {

        List<Equipe> equipes = new ArrayList<>();

        // Documentos antigos usam funcionarioId; os atuais usam usuarioId.
        Bson filtroBase = and(
                eq("municipioId", municipioId),
                or(
                        eq("usuarioId", usuarioId),
                        eq("funcionarioId", usuarioId)));

        // Atualiza vínculos legados e o status de ordem antes de aplicar os filtros.
        for (Document documento : colecao.find(filtroBase)) {
            ObjectId equipeId = documento.getObjectId("_id");

            // Persiste dados atuais do município e usuário autenticados na sessão.
            colecao.updateOne(
                    eq("_id", equipeId),
                    new Document("$set", new Document()
                            .append("municipioId", municipioId)
                            .append("municipioNome", municipioNome)
                            .append("usuarioId", usuarioId)
                            .append("usuarioNome", usuarioNome)));

            // Marca como indisponível toda equipe com uma ordem de serviço vinculada.
            if (temOrdemServico(equipeId)) {
                colecao.updateOne(
                        eq("_id", equipeId),
                        new Document("$set", new Document("status", "Indisponível")));
            }
        }

        // Combina o escopo autenticado, o status opcional e a busca textual.
        List<Bson> filtros = new ArrayList<>();
        filtros.add(filtroBase);
        if (status != null) {
            filtros.add(regex("status", "^" + Pattern.quote(status) + "$", "i"));
        }
        if (busca != null && !busca.isBlank()) {
            filtros.add(criarFiltroDeBusca(busca.trim()));
        }

        // Retorna somente os resultados correspondentes, ordenados pelo nome da equipe.
        for (Document documento : colecao.find(and(filtros))
                .sort(Sorts.ascending("nome"))) {
            equipes.add(converterParaEquipe(documento));
        }
        return equipes;
    }

    // Procura o termo literalmente, sem diferenciar maiúsculas de minúsculas.
    private Bson criarFiltroDeBusca(String busca) {
        String regexLiteral = Pattern.quote(busca);
        List<Bson> correspondencias = new ArrayList<>();

        // Pesquisa o nome da equipe nos campos usados por documentos atuais e legados.
        correspondencias.add(regex("nome", regexLiteral, "i"));
        correspondencias.add(regex("nomeEquipe", regexLiteral, "i"));

        // Pesquisa a região e o gestor em suas representações atuais e anteriores.
        correspondencias.add(regex("regiao", regexLiteral, "i"));
        correspondencias.add(regex("regiaoAtuacao", regexLiteral, "i"));
        correspondencias.add(regex("gestor.nome", regexLiteral, "i"));
        correspondencias.add(regex("gestor", regexLiteral, "i"));
        correspondencias.add(regex("gestorEquipe.nome", regexLiteral, "i"));
        correspondencias.add(regex("gestorEquipe", regexLiteral, "i"));

        // Converte o ID Mongo em texto para permitir também a pesquisa parcial.
        correspondencias.add(new Document(
                "$expr",
                new Document("$regexMatch", new Document()
                        .append("input", new Document("$toString", "$_id"))
                        .append("regex", regexLiteral)
                        .append("options", "i"))));

        return or(correspondencias);
    }

    // Adiciona um subdocumento de colaborador no array da equipe autorizada.
    public boolean adicionarColaborador(
            ObjectId equipeId,
            ObjectId usuarioId,
            Colaborador colaborador) {
        Document colaboradorDocumento = converterParaDocumento(colaborador);
        String regexEmail = "^" + Pattern.quote(colaborador.getEmail()) + "$";
        Bson filtroSemEmailRepetido = nor(
                elemMatch("colaboradores", regex("email", regexEmail, "i")),
                elemMatch("colaboradores", regex("contato", regexEmail, "i")));

        try {
            // O filtro também protege contra duplicatas concorrentes na mesma equipe.
            UpdateResult resultado = colecao.updateOne(
                    and(
                            filtroEquipeDoUsuario(equipeId, usuarioId),
                            filtroSemEmailRepetido),
                    new Document("$push", new Document(
                            "colaboradores",
                            colaboradorDocumento)));
            return resultado.getMatchedCount() > 0;
        } catch (MongoWriteException erro) {
            // O índice único bloqueia o mesmo e-mail em documentos de equipes diferentes.
            if (erro.getError().getCode() == 11000) {
                throw new IllegalArgumentException(
                        "Já existe um colaborador cadastrado com este e-mail.");
            }
            throw erro;
        }
    }

    // Pesquisa e-mails tanto no formato atual quanto no campo legado contato.
    public boolean existeEmailColaborador(String email) {
        String regexEmail = "^" + Pattern.quote(email.trim()) + "$";
        return colecao.find(or(
                regex("colaboradores.email", regexEmail, "i"),
                regex("colaboradores.contato", regexEmail, "i"))).first() != null;
    }

    // Exclui uma equipe somente se continuar disponível e sem colaboradores nem ordens.
    public boolean excluirEquipe(ObjectId equipeId, ObjectId usuarioId) {
        var filtroPropriedade = filtroEquipeDoUsuario(equipeId, usuarioId);
        Document equipe = colecao.find(filtroPropriedade).first();
        if (equipe == null) {
            return false;
        }

        validarElegibilidadeParaExclusao(equipe, equipeId, filtroPropriedade);

        var filtroExclusao = and(
                filtroPropriedade,
                eq("status", "Disponível"),
                or(
                        eq("colaboradores", List.of()),
                        exists("colaboradores", false)));
        DeleteResult resultado = colecao.deleteOne(filtroExclusao);
        if (resultado.getDeletedCount() > 0) {
            return true;
        }

        Document equipeAtualizada = colecao.find(filtroPropriedade).first();
        if (equipeAtualizada == null) {
            return false;
        }
        validarElegibilidadeParaExclusao(equipeAtualizada, equipeId, filtroPropriedade);
        throw new IllegalStateException(
                "A equipe foi alterada durante a exclusão. Atualize a página e tente novamente.");
    }

    // Remove apenas o colaborador solicitado se a equipe ainda estiver disponível.
    public boolean removerColaborador(
            ObjectId equipeId,
            ObjectId usuarioId,
            ObjectId colaboradorId) {
        var filtro = and(
                filtroEquipeDoUsuario(equipeId, usuarioId),
                ne("status", "Indisponível"),
                elemMatch("colaboradores", eq("_id", colaboradorId)));
        UpdateResult resultado = colecao.updateOne(
                filtro,
                new Document("$pull", new Document(
                        "colaboradores",
                        new Document("_id", colaboradorId))));
        return resultado.getModifiedCount() > 0;
    }

    // Marca o estado da equipe na base quando há ordem de serviço relacionada.
    public boolean sincronizarStatusComOrdens(
            ObjectId equipeId,
            ObjectId usuarioId) {
        Document equipe = colecao.find(
                filtroEquipeDoUsuario(equipeId, usuarioId)).first();
        if (equipe == null) {
            return false;
        }

        if (temOrdemServico(equipeId)) {
            colecao.updateOne(
                    eq("_id", equipeId),
                    new Document("$set", new Document("status", "Indisponível")));
            return true;
        }

        return "Indisponível".equals(equipe.getString("status"));
    }

    // Verifica se uma equipe existe e pertence à conta da sessão atual.
    public boolean pertenceAoUsuario(ObjectId equipeId, ObjectId usuarioId) {
        return colecao.find(filtroEquipeDoUsuario(equipeId, usuarioId)).first() != null;
    }

    // Recupera a região da equipe somente quando ela pertence à conta informada.
    public Optional<String> buscarRegiaoPorIdEUsuario(
            ObjectId equipeId,
            ObjectId usuarioId) {
        Document equipe = colecao.find(
                filtroEquipeDoUsuario(equipeId, usuarioId)).first();
        return equipe == null
                ? Optional.empty()
                : Optional.ofNullable(equipe.getString("regiao"));
    }

    // Informa se a equipe tem qualquer ordem de serviço vinculada.
    private boolean temOrdemServico(ObjectId equipeId) {
        var filtroOrdem = or(
                eq("equipeId", equipeId),
                eq("equipeId", equipeId.toHexString()));
        return ordensServico.find(filtroOrdem).first() != null;
    }

    private void validarElegibilidadeParaExclusao(
            Document equipe,
            ObjectId equipeId,
            org.bson.conversions.Bson filtroPropriedade) {
        Object colaboradores = equipe.get("colaboradores");
        if (colaboradores instanceof List<?> lista && !lista.isEmpty()) {
            throw new IllegalStateException(
                    "Não é possível excluir a equipe porque há colaboradores cadastrados.");
        }
        if (colaboradores != null && !(colaboradores instanceof List<?>)) {
            throw new IllegalStateException(
                    "Não foi possível confirmar os colaboradores cadastrados nesta equipe.");
        }

        if (temOrdemServico(equipeId)) {
            colecao.updateOne(
                    filtroPropriedade,
                    new Document("$set", new Document("status", "Indisponível")));
            throw new IllegalStateException(
                    "Não é possível excluir a equipe porque há uma ordem de serviço vinculada.");
        }

        if (!"Disponível".equals(equipe.getString("status"))) {
            throw new IllegalStateException(
                    "Não é possível excluir uma equipe indisponível.");
        }
    }

    // Cria o filtro de propriedade e mantém compatibilidade com funcionarioId antigo.
    private org.bson.conversions.Bson filtroEquipeDoUsuario(
            ObjectId equipeId,
            ObjectId usuarioId) {
        return and(
                eq("_id", equipeId),
                or(
                        eq("usuarioId", usuarioId),
                        eq("funcionarioId", usuarioId)));
    }

    // Converte os dados do colaborador para o subdocumento persistido na equipe.
    private Document converterParaDocumento(Colaborador colaborador) {
        return new Document()
                .append("_id", colaborador.getId())
                .append("nomeCompleto", colaborador.getNomeCompleto())
                .append("funcao", colaborador.getFuncao())
                .append("email", colaborador.getEmail())
                .append("regiaoAtuacao", colaborador.getRegiaoAtuacao())
                .append("disponivel", colaborador.isDisponivel())
                .append("dataCadastro", Date.from(colaborador.getDataCadastro()));
    }

    // Lê uma lista de subdocumentos e cria os objetos de domínio correspondentes.
    private List<Colaborador> converterColaboradores(Object valor) {
        List<Colaborador> colaboradores = new ArrayList<>();
        if (!(valor instanceof List<?> documentos)) {
            return colaboradores;
        }

        for (Object item : documentos) {
            if (!(item instanceof Document documento)) {
                continue;
            }

            Date dataCadastro = documento.getDate("dataCadastro");
            String email = documento.getString("email");
            if (email == null) {
                email = documento.getString("contato");
            }
            colaboradores.add(new Colaborador(
                    documento.getObjectId("_id"),
                    documento.getString("nomeCompleto"),
                    documento.getString("funcao"),
                    email,
                    documento.getString("regiaoAtuacao"),
                    !Boolean.FALSE.equals(documento.getBoolean("disponivel")),
                    dataCadastro == null ? Instant.EPOCH : dataCadastro.toInstant()));
        }
        return colaboradores;
    }

    // Converte os documentos encontrados em objetos do domínio.
    private Equipe converterParaEquipe(Document documento) {

        Object gestorArmazenado = documento.get("gestor");
        String emailGestor = gestorArmazenado instanceof Document gestor
                ? gestor.getString("email") == null
                        ? gestor.getString("nome")
                        : gestor.getString("email")
                : gestorArmazenado instanceof String gestor
                        ? gestor
                        : null;

        Date dataCadastro = documento.getDate("dataCadastro");
        return new Equipe(
                documento.getObjectId("_id"),
                documento.getString("nome"),
                documento.getString("regiao") == null
                        ? documento.getString("regiaoAtuacao")
                        : documento.getString("regiao"),
                emailGestor,
                documento.getString("status"),
                documento.getObjectId("municipioId"),
                documento.getString("municipioNome"),
                documento.getObjectId("usuarioId"),
                documento.getString("usuarioNome"),
                dataCadastro == null ? Instant.EPOCH : dataCadastro.toInstant(),
                converterColaboradores(documento.get("colaboradores")));
    }
}
