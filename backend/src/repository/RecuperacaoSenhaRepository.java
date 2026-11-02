package repository;

import model.RecuperacaoSenha;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;

import org.bson.Document;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.Date;
import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;

public class RecuperacaoSenhaRepository {

    private final MongoCollection<Document> colecao;

    public RecuperacaoSenhaRepository() {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("recuperacoes_senha");
    }

    // Salva uma nova recuperação
    public void salvar(RecuperacaoSenha recuperacao) {

        Document documento = converterParaDocumento(recuperacao);

        colecao.insertOne(documento);
    }

    // Busca uma recuperação pelo ID da conta
    public Optional<RecuperacaoSenha> buscarPorContaId(ObjectId contaId) {

        Document documento = colecao.find(
                eq("contaId", contaId))
                .sort(new Document("dataExpiracao", -1))
                .first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(converterParaRecuperacao(documento));
    }

    // Invalida todas as recuperações anteriores de uma conta
    public void invalidarPorContaId(ObjectId contaId) {

        colecao.updateMany(
                eq("contaId", contaId),
                new Document("$set", new Document("utilizado", true)));
    }

    // Atualiza o número de tentativas
    public void atualizarTentativas(ObjectId id, int tentativas) {

        UpdateResult resultado = colecao.updateOne(
                eq("_id", id),
                new Document("$set", new Document("tentativas", tentativas)));

        if (resultado.getMatchedCount() == 0) {
            throw new IllegalArgumentException(
                    "Recuperação de senha não encontrada.");
        }
    }

    // Marca uma recuperação como utilizada
    public void marcarComoUtilizado(ObjectId id) {

        UpdateResult resultado = colecao.updateOne(
                eq("_id", id),
                new Document("$set", new Document("utilizado", true)));

        if (resultado.getMatchedCount() == 0) {
            throw new IllegalArgumentException(
                    "Recuperação de senha não encontrada.");
        }
    }

    // Converte RecuperacaoSenha em Document
    private Document converterParaDocumento(RecuperacaoSenha recuperacao) {

        Document documento = new Document();

        documento.append("_id", recuperacao.getId());
        documento.append("contaId", recuperacao.getContaId());
        documento.append("codigoHash", recuperacao.getCodigoHash());
        documento.append(
                "dataExpiracao",
                Date.from(recuperacao.getDataExpiracao()));
        documento.append("tentativas", recuperacao.getTentativas());
        documento.append("utilizado", recuperacao.isUtilizado());

        return documento;
    }

    // Converte Document em RecuperacaoSenha
    private RecuperacaoSenha converterParaRecuperacao(Document documento) {

        Date dataExpiracao = documento.getDate("dataExpiracao");

        Instant instanteExpiracao = dataExpiracao == null
                ? null
                : dataExpiracao.toInstant();

        return new RecuperacaoSenha(
                documento.getObjectId("_id"),
                documento.getObjectId("contaId"),
                documento.getString("codigoHash"),
                instanteExpiracao,
                documento.getInteger("tentativas"),
                documento.getBoolean("utilizado"));
    }
}