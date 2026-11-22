package repository;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import model.Ocorrencia;

// Teste de integração opcional para códigos sequenciais; usa somente um banco descartável.
class OcorrenciaCodigoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_ocorrencia_codigo_";

    private MongoClient cliente;
    private MongoDatabase banco;

    @BeforeEach
    void abrirBancoExclusivoDeTeste() {
        // Exige uma URI de teste e impede que o teste aponte para o banco da aplicação.
        String uri = System.getenv("MONGODB_TEST_URI");
        assumeTrue(uri != null && !uri.isBlank(),
                "Integração não executada: configure MONGODB_TEST_URI para um MongoDB exclusivo de testes.");

        ConnectionString conexao = new ConnectionString(uri);
        String bancoDaUri = conexao.getDatabase();
        assertTrue(bancoDaUri == null || bancoDaUri.startsWith("arboriza_test"),
                "A URI de teste deve usar um banco arboriza_test ou não especificar banco.");

        // Conecta ao servidor de teste e cria um nome de banco exclusivo para esta execução.
        MongoClientSettings configuracao = MongoClientSettings.builder()
                .applyConnectionString(conexao)
                .applyToClusterSettings(config -> config.serverSelectionTimeout(5, TimeUnit.SECONDS))
                .build();
        cliente = MongoClients.create(configuracao);
        banco = cliente.getDatabase(
                PREFIXO_BANCO + UUID.randomUUID().toString().replace("-", ""));
    }

    @AfterEach
    void removerBancoDeTeste() {
        // Descarta somente o banco criado por este teste e fecha a conexão.
        try {
            if (banco != null && banco.getName().startsWith(PREFIXO_BANCO)) {
                banco.drop();
            }
        } finally {
            if (cliente != null) {
                cliente.close();
            }
        }
    }

    @Test
    void migraCodigoLegadoEGeraNovosCodigosSemAlterarObjectId() {
        // Insere um código legado e um código OC existente para testar migração e sequência.
        ObjectId idLegado = new ObjectId();
        banco.getCollection("ocorrencias").insertOne(
                new Document("_id", idLegado).append("id", "OCO20266943001"));
        banco.getCollection("ocorrencias").insertOne(
                new Document("_id", new ObjectId()).append("id", "OC-000041"));
        OcorrenciaRepository repositorio = new OcorrenciaRepository(banco);

        // Confirma que o legado foi atualizado e cria duas ocorrências sequenciais.
        Document migrada = banco.getCollection("ocorrencias")
                .find(com.mongodb.client.model.Filters.eq("_id", idLegado)).first();
        Document primeira = repositorio.criar(new Ocorrencia());
        Document segunda = repositorio.criar(new Ocorrencia());

        assertEquals("OC-000042", migrada.getString("id"));
        assertEquals("OC-000043", primeira.getString("id"));
        assertEquals("OC-000044", segunda.getString("id"));
        assertEquals(idLegado, migrada.getObjectId("_id"));
        assertTrue(primeira.get("_id") instanceof ObjectId);
    }
}
