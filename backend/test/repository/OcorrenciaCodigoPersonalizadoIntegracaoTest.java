package repository;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import model.Ocorrencia;

class OcorrenciaCodigoPersonalizadoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_codigos_ocorrencias_";
    private static final ObjectId PRIMEIRA_OCORRENCIA = new ObjectId("500000000000000000000001");
    private static final ObjectId SEGUNDA_OCORRENCIA = new ObjectId("500000000000000000000002");

    private MongoClient cliente;
    private MongoDatabase banco;
    private OcorrenciaRepository repositorio;

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
        banco.getCollection("ocorrencias").insertMany(List.of(
                new Document("_id", PRIMEIRA_OCORRENCIA)
                        .append("id", "OCO2026123456789")
                        .append("protocolo", "CH-1795207568591"),
                new Document("_id", SEGUNDA_OCORRENCIA)
                        .append("id", "OCO2026987654321")
                        .append("protocolo", "CH-1795207568592")));

        repositorio = new OcorrenciaRepository(banco);
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
    void migraCodigosMantemObjectIdsEPermiteBuscaPorCodigoPersonalizado() {
        Document primeira = obterOcorrencia(PRIMEIRA_OCORRENCIA);
        Document segunda = obterOcorrencia(SEGUNDA_OCORRENCIA);
        assertEquals("OC-000001", primeira.getString("id"));
        assertEquals("OC-000002", segunda.getString("id"));
        assertEquals("CH-1795207568591", primeira.getString("protocolo"));
        assertEquals(PRIMEIRA_OCORRENCIA,
                repositorio.buscarPorId("OC-000001").getObjectId("_id"));

        Ocorrencia nova = new Ocorrencia();
        nova.setLocalizacao("Rua das Árvores");
        nova.setNumero("42");
        nova.setBairro("Centro");
        ObjectId novoObjectId = nova.getOcorrenciaId();
        String protocolo = nova.getProtocolo();
        Document criada = repositorio.criar(nova);
        assertEquals("OC-000003", criada.getString("id"));
        assertEquals(novoObjectId, criada.getObjectId("_id"));
        assertEquals(protocolo, criada.getString("protocolo"));
        assertEquals("Rua das Árvores", criada.getString("localizacao"));
        assertEquals("42", criada.getString("numero"));
        assertEquals("Centro", criada.getString("bairro"));
        assertEquals(novoObjectId,
                repositorio.buscarPorId("OC-000003").getObjectId("_id"));
        assertNotNull(criada.getString("id"));
    }

    private Document obterOcorrencia(ObjectId id) {
        Document ocorrencia = banco.getCollection("ocorrencias").find(eq("_id", id)).first();
        assertNotNull(ocorrencia);
        assertEquals(id, ocorrencia.getObjectId("_id"));
        return ocorrencia;
    }
}
