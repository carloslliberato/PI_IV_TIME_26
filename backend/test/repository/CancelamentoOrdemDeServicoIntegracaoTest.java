package repository;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.NoSuchElementException;
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
import model.OrdemDeServico;

/**
 * Integração opcional: exige MONGODB_TEST_URI exclusivo de testes, com replica set
 * ou cluster sharded. Não usa ConexaoMongo nem o banco da aplicação. Cria e remove
 * apenas o banco arboriza_test_cancelamento_<UUID> de cada teste.
 * @author Marialvo Corrêa de Freitas Junior
 */
class CancelamentoOrdemDeServicoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_cancelamento_";
    private static final ObjectId MUNICIPIO = new ObjectId("100000000000000000000001");
    private static final ObjectId OUTRO_MUNICIPIO = new ObjectId("100000000000000000000002");
    private static final ObjectId ARVORE = new ObjectId("200000000000000000000001");
    private static final ObjectId EQUIPE = new ObjectId("300000000000000000000001");
    private static final Instant CANCELAMENTO = Instant.parse("2026-11-20T17:00:00Z");

    private MongoClient cliente;
    private MongoDatabase banco;
    private OrdemDeServicoRepository repositorio;
    private int proximoCodigo = 1;

    @BeforeEach
    void abrirBancoExclusivoDeTeste(){
        String uri = System.getenv("MONGODB_TEST_URI");
        assumeTrue(uri != null && !uri.isBlank(),
                "Integração não executada: configure MONGODB_TEST_URI para um MongoDB exclusivo de testes.");
        ConnectionString conexao = new ConnectionString(uri);
        String bancoDaUri = conexao.getDatabase();
        assertTrue(bancoDaUri == null || bancoDaUri.startsWith("arboriza_test"),
                "A URI de teste não pode apontar para um banco da aplicação; use banco arboriza_test ou omita o banco.");
        MongoClientSettings configuracao = MongoClientSettings.builder().applyConnectionString(conexao)
                .applyToClusterSettings(config -> config.serverSelectionTimeout(5, TimeUnit.SECONDS)).build();
        cliente = MongoClients.create(configuracao);
        banco = cliente.getDatabase(PREFIXO_BANCO + UUID.randomUUID().toString().replace("-", ""));
        Document servidor = banco.runCommand(new Document("hello", 1));
        assertTrue(servidor.getString("setName") != null || "isdbgrid".equals(servidor.getString("msg")),
                "Este teste exige replica set ou cluster sharded para executar transações.");
        banco.createCollection("ordens_servico");
        banco.createCollection("intervencoes");
        banco.createCollection("equipes");
        repositorio = new OrdemDeServicoRepository(banco, cliente::startSession);
    }

    @AfterEach
    void removerSomenteOBancoCriadoPeloTeste(){
        try {
            if (banco != null && banco.getName().startsWith(PREFIXO_BANCO)) banco.drop();
        } finally {
            if (cliente != null) cliente.close();
        }
    }

    @Test
    void gravaMotivoComStatusPreservaObservacoesELiberaEquipe(){
        banco.getCollection("equipes").insertOne(new Document("_id", EQUIPE)
                .append("municipioId", MUNICIPIO).append("status", "Indisponível"));
        OrdemDeServico ordem = salvarOrdem(EQUIPE);
        Document antes = documento(ordem);

        OrdemDeServico cancelada = repositorio.cancelar(ordem.getOrdemServicoId(), MUNICIPIO,
                "  Solicitação duplicada.\n", CANCELAMENTO);
        Document depois = documento(ordem);

        assertEquals("Cancelada", cancelada.getStatus());
        assertEquals("Solicitação duplicada.", cancelada.getMotivoCancelamento());
        assertEquals("Solicitação duplicada.", depois.getString("motivoCancelamento"));
        assertEquals("Cancelada", depois.getString("status"));
        assertEquals("Observação original.", cancelada.getObservacoes());
        assertEquals(antes.get("observacoes"), depois.get("observacoes"));
        assertEquals(antes.get("dataCriacao"), depois.get("dataCriacao"));
        assertEquals(Date.from(CANCELAMENTO), depois.get("dataAtualizacao"));
        assertNull(cancelada.getDataConclusao());
        assertEquals(EQUIPE, cancelada.getEquipeId());
        assertEquals("Disponível", banco.getCollection("equipes").find(eq("_id", EQUIPE)).first().getString("status"));
        assertEquals(0L, banco.getCollection("intervencoes").countDocuments());
        assertEquals("Solicitação duplicada.", repositorio.buscarPorId(ordem.getOrdemServicoId())
                .orElseThrow().getMotivoCancelamento());
    }

    @Test
    void rejeitaMotivoAusenteSemAlterarDocumento(){
        OrdemDeServico ordem = salvarOrdem(null);
        Document antes = documento(ordem);
        for (String motivo : new String[]{null, "", " \t\n", "\u2003", "\u00A0", "\uFEFF", " \u00A0\uFEFF\t"}){
            assertThrows(IllegalArgumentException.class, () -> repositorio.cancelar(
                    ordem.getOrdemServicoId(), MUNICIPIO, motivo, CANCELAMENTO));
            assertEquals(antes, documento(ordem));
        }
    }

    @Test
    void municipioIncorretoEEstadosFinaisNaoPermitemRegravarMotivo(){
        OrdemDeServico ordem = salvarOrdem(null);
        Document antes = documento(ordem);
        assertThrows(NoSuchElementException.class, () -> repositorio.cancelar(
                ordem.getOrdemServicoId(), OUTRO_MUNICIPIO, "Motivo indevido.", CANCELAMENTO));
        assertEquals(antes, documento(ordem));

        repositorio.cancelar(ordem.getOrdemServicoId(), MUNICIPIO, "Motivo original.", CANCELAMENTO);
        Document cancelada = documento(ordem);
        assertThrows(IllegalStateException.class, () -> repositorio.cancelar(
                ordem.getOrdemServicoId(), MUNICIPIO, "Outro motivo.", CANCELAMENTO.plusSeconds(60)));
        assertEquals(cancelada, documento(ordem));

        OrdemDeServico concluida = salvarOrdem(null);
        banco.getCollection("ordens_servico").updateOne(eq("_id", concluida.getOrdemServicoId()),
                new Document("$set", new Document("status", "Concluída")));
        Document finalizada = documento(concluida);
        assertThrows(IllegalStateException.class, () -> repositorio.cancelar(
                concluida.getOrdemServicoId(), MUNICIPIO, "Motivo indevido.", CANCELAMENTO));
        assertEquals(finalizada, documento(concluida));
    }

    @Test
    void consultaCancelamentoAntigoComMotivoAusenteOuNuloSemMigrarRegistro(){
        for (boolean campoAusente : new boolean[]{true, false}){
            OrdemDeServico ordem = salvarOrdem(null);
            Document atualizacao = new Document("$set", new Document("status", "Cancelada"));
            if (campoAusente) atualizacao.append("$unset", new Document("motivoCancelamento", ""));
            banco.getCollection("ordens_servico").updateOne(eq("_id", ordem.getOrdemServicoId()), atualizacao);
            Document antes = documento(ordem);

            OrdemDeServico lida = repositorio.buscarPorId(ordem.getOrdemServicoId()).orElseThrow();
            assertEquals("Cancelada", lida.getStatus());
            assertNull(lida.getMotivoCancelamento());
            List<OrdemDeServico> lista = repositorio.listarPorMunicipio(MUNICIPIO);
            assertNull(lista.stream().filter(item -> item.getOrdemServicoId().equals(ordem.getOrdemServicoId()))
                    .findFirst().orElseThrow().getMotivoCancelamento());
            assertEquals(antes, documento(ordem));
        }
    }

    private OrdemDeServico salvarOrdem(ObjectId equipeId){
        OrdemDeServico ordem = new OrdemDeServico(MUNICIPIO, ARVORE, null, equipeId,
                "[TESTE] Cancelamento de OS", "Serviço de teste.", "Baixa", "Observação original.",
                "OS02026" + proximoCodigo++);
        repositorio.salvar(ordem);
        return ordem;
    }

    private Document documento(OrdemDeServico ordem){
        return banco.getCollection("ordens_servico").find(eq("_id", ordem.getOrdemServicoId())).first();
    }
}
