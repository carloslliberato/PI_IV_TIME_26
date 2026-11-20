package repository;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.util.List;
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

class ArvoreRepositoryCodigoGlobalIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_codigos_arvores_";
    private static final ObjectId PRIMEIRA_ARVORE = new ObjectId("200000000000000000000001");
    private static final ObjectId SEGUNDA_ARVORE = new ObjectId("200000000000000000000002");
    private static final ObjectId TERCEIRA_ARVORE = new ObjectId("200000000000000000000003");

    private MongoClient cliente;
    private MongoDatabase banco;
    private ArvoreRepository repositorio;

    @BeforeEach
    void abrirBancoExclusivoDeTeste() {
        String uri = System.getenv("MONGODB_TEST_URI");
        assumeTrue(uri != null && !uri.isBlank(),
                "Integração não executada: configure MONGODB_TEST_URI para um MongoDB exclusivo de testes.");

        ConnectionString conexao = new ConnectionString(uri);
        String bancoDaUri = conexao.getDatabase();
        assertTrue(bancoDaUri == null || bancoDaUri.startsWith("arboriza_test"),
                "A URI de teste não pode apontar para um banco da aplicação.");

        MongoClientSettings configuracao = MongoClientSettings.builder()
                .applyConnectionString(conexao)
                .applyToClusterSettings(config -> config.serverSelectionTimeout(5, TimeUnit.SECONDS))
                .build();
        cliente = MongoClients.create(configuracao);
        banco = cliente.getDatabase(PREFIXO_BANCO + UUID.randomUUID().toString().replace("-", ""));
        banco.getCollection("arvores").insertMany(List.of(
                new Document("_id", PRIMEIRA_ARVORE).append("codigoArv", "ARV-CAM-00004"),
                new Document("_id", SEGUNDA_ARVORE).append("codigoArv", "ARV-RIO-00004"),
                new Document("_id", TERCEIRA_ARVORE).append("codigoArv", "ARV-CAM-00008")));

        repositorio = new ArvoreRepository(banco);
    }

    @AfterEach
    void removerSomenteOBancoCriadoPeloTeste() {
        try {
            if (banco != null && banco.getName().startsWith(PREFIXO_BANCO)) banco.drop();
        } finally {
            if (cliente != null) cliente.close();
        }
    }

    @Test
    void renumeraCodigosAntigosGlobalmenteEContinuaSequenciaSemAlterarObjectIds() {
        assertCodigo(PRIMEIRA_ARVORE, "AR-00004");
        assertCodigo(SEGUNDA_ARVORE, "AR-00009");
        assertCodigo(TERCEIRA_ARVORE, "AR-00008");
        assertEquals(PRIMEIRA_ARVORE, repositorio.buscarPorCodARV("AR-00004").orElseThrow().getId());
        assertEquals("AR-00010", repositorio.gerarCodigoArv());

        new ArvoreRepository(banco);

        assertCodigo(PRIMEIRA_ARVORE, "AR-00004");
        assertCodigo(SEGUNDA_ARVORE, "AR-00009");
        assertCodigo(TERCEIRA_ARVORE, "AR-00008");
        assertEquals("AR-00011", repositorio.gerarCodigoArv());
    }

    private void assertCodigo(ObjectId id, String codigo) {
        Document arvore = banco.getCollection("arvores").find(eq("_id", id)).first();
        assertNotNull(arvore);
        assertEquals(id, arvore.getObjectId("_id"));
        assertEquals(codigo, arvore.getString("codigoArv"));
        assertNull(arvore.get("codigoArvMigracaoOrigem"));
    }
}
