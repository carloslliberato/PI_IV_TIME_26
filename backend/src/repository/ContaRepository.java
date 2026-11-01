
package repository;

import model.Conta;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;

import org.bson.Document;
import org.bson.types.ObjectId;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;

public class ContaRepository implements Repository<Conta> {

    private final MongoCollection<Document> colecao;

    public ContaRepository() {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("contas");
    }

    // Salva uma nova conta
    @Override
    public void salvar(Conta conta) {

        Document documento = converterParaDocumento(conta);

        colecao.insertOne(documento);
    }

    // Atualiza uma conta existente
    // Atualiza uma conta existente
    public void atualizar(Conta conta) {

        Document documento = converterParaDocumento(conta);

        documento.remove("_id");

        UpdateResult resultado = colecao.updateOne(
                eq("_id", conta.getId()),
                new Document("$set", documento));

        if (resultado.getMatchedCount() == 0) {
            throw new IllegalArgumentException(
                    "Não foi possível encontrar a conta para atualização.");
        }
    }

    // Busca uma conta pelo ID
    @Override
    public Optional<Conta> buscarPorId(ObjectId id) {

        Document documento = colecao.find(eq("_id", id)).first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(converterParaConta(documento));
    }

    // Busca uma conta pelo e-mail
    public Optional<Conta> buscarPorEmail(String email) {

        Document documento = colecao.find(eq("email", email)).first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(converterParaConta(documento));
    }

    // Verifica se um e-mail já está cadastrado
    public boolean existeEmail(String email) {

        return colecao.find(eq("email", email)).first() != null;
    }

    // Exclui uma conta pelo ID
    @Override
    public boolean excluir(ObjectId id) {

        DeleteResult resultado = colecao.deleteOne(eq("_id", id));

        return resultado.getDeletedCount() > 0;
    }

    // Converte uma Conta em Document
    private Document converterParaDocumento(Conta conta) {

        Document documento = new Document();

        documento.append("_id", conta.getId());
        documento.append("nome", conta.getNome());
        documento.append("email", conta.getEmail());
        documento.append("senhaHash", conta.getSenhaHash());
        documento.append("telefone", conta.getTelefone());
        documento.append("perfis", conta.getPerfis());
        documento.append("municipioId", conta.getMunicipioId());

        // Campos especificos do funcioário
        if (conta.getSetor() != null) {
            documento.append("setor", conta.getSetor());
        }

        if (conta.getOutroSetor() != null) {
            documento.append("outroSetor", conta.getOutroSetor());
        }

        if (conta.getCargo() != null) {
            documento.append("cargo", conta.getCargo());
        }

        // Campos específicos do cidadão
        if (conta.getReceberNotificacoes() != null) {
            documento.append(
                    "receberNotificacoes",
                    conta.getReceberNotificacoes());
        }

        if (conta.getPreferenciasNotificacoes() != null) {
            documento.append(
                    "preferenciasNotificacoes",
                    conta.getPreferenciasNotificacoes());
        }

        documento.append("dataCadastro", Date.from(conta.getDataCadastro()));

        if (conta.getDataAtualizacao() != null) {
            documento.append(
                    "dataAtualizacao",
                    Date.from(conta.getDataAtualizacao()));
        }

        return documento;
    }

    // Converte um Document em Conta
    private Conta converterParaConta(Document documento) {

        List<String> perfis = documento.getList(
                "perfis", String.class);

        List<String> preferencias = documento.getList(
                "preferenciasNotificacoes", String.class);

        Date dataCadastro = documento.getDate("dataCadastro");
        Date dataAtualizacao = documento.getDate("dataAtualizacao");

        Instant instanteCadastro = dataCadastro == null
                ? null
                : dataCadastro.toInstant();

        Instant instanteAtualizacao = dataAtualizacao == null
                ? null
                : dataAtualizacao.toInstant();

        Boolean receberNotificacoes = documento.getBoolean("receberNotificacoes");

        return new Conta(
                documento.getObjectId("_id"),
                documento.getString("nome"),
                documento.getString("email"),
                documento.getString("senhaHash"),
                documento.getString("telefone"),
                perfis,
                documento.getObjectId("municipioId"),
                documento.getString("setor"),
                documento.getString("outroSetor"),
                documento.getString("cargo"),
                receberNotificacoes,
                preferencias,
                instanteCadastro,
                instanteAtualizacao);
    }
}
