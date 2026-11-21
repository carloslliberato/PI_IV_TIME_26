package repository;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import com.mongodb.MongoException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import model.OrdemDeServico;

/*
 * Teste real, opcional: exige MONGODB_TEST_URI de um ambiente exclusivo de testes
 * com transações (replica set ou cluster sharded). Não usa ConexaoMongo, .env ou
 * o banco da aplicação. Cada teste cria e remove somente seu próprio banco
 * arboriza_test_equipes_<UUID>. Sem essa variável, os testes são ignorados.
 */
class AtribuicaoEquipeOrdemDeServicoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_equipes_";
    private static final ObjectId MUNICIPIO = new ObjectId("100000000000000000000001");
    private static final ObjectId OUTRO_MUNICIPIO = new ObjectId("100000000000000000000002");
    private static final ObjectId ARVORE = new ObjectId("200000000000000000000001");
    private static final ObjectId EQUIPE = new ObjectId("300000000000000000000001");
    private static final ObjectId USUARIO = new ObjectId("400000000000000000000001");
    private static final Instant EXECUCAO = Instant.parse("2026-11-20T13:00:00Z");
    private static final Instant CONCLUSAO = Instant.parse("2026-11-20T14:00:00Z");

    private MongoClient cliente;
    private MongoDatabase banco;
    private OrdemDeServicoRepository repositorio;
    private long proximoCodigo = 1;

    @BeforeEach
    void abrirBancoExclusivoDeTeste(){
        String uri = System.getenv("MONGODB_TEST_URI");
        assumeTrue(uri != null && !uri.isBlank(),
                "Integração não executada: configure MONGODB_TEST_URI para um MongoDB exclusivo de testes.");

        ConnectionString conexao = new ConnectionString(uri);
        String bancoDaUri = conexao.getDatabase();
        assertTrue(bancoDaUri == null || bancoDaUri.startsWith("arboriza_test"),
                "A URI de teste não pode apontar para um banco da aplicação; use banco arboriza_test ou omita o banco.");

        MongoClientSettings configuracao = MongoClientSettings.builder()
                .applyConnectionString(conexao)
                .applyToClusterSettings(config -> config.serverSelectionTimeout(5, TimeUnit.SECONDS))
                .build();
        cliente = MongoClients.create(configuracao);
        String nomeBanco = PREFIXO_BANCO + UUID.randomUUID().toString().replace("-", "");
        banco = cliente.getDatabase(nomeBanco);

        Document servidor = banco.runCommand(new Document("hello", 1));
        assertTrue(servidor.getString("setName") != null || "isdbgrid".equals(servidor.getString("msg")),
                "Este teste exige replica set ou cluster sharded; MongoDB standalone não oferece a transação necessária.");

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
    void atribuiEquipeDeOutroCriadorDoMesmoMunicipioEBloqueiaSegundaOrdem(){
        ObjectId equipe = salvarEquipe(MUNICIPIO, new ObjectId(), "Equipe A");
        OrdemDeServico primeira = salvarOrdem(MUNICIPIO);
        OrdemDeServico segunda = salvarOrdem(MUNICIPIO);
        assertTrue(repositorio.listarEquipesParaOrdem(primeira.getOrdemServicoId(), MUNICIPIO)
                .stream().anyMatch(item -> item.id().equals(equipe) && item.disponivel()));

        var atualizada = repositorio.atribuirEquipe(primeira.getOrdemServicoId(), MUNICIPIO, equipe, CONCLUSAO);
        assertEquals("Em andamento", atualizada.getStatus());
        assertEquals(equipe, atualizada.getEquipeId());
        assertEquals("Indisponível", equipe(equipe).getString("status"));
        assertThrows(IllegalStateException.class,
                () -> repositorio.atribuirEquipe(segunda.getOrdemServicoId(), MUNICIPIO, equipe, CONCLUSAO));
        assertNull(ordem(segunda).get("equipeId"));
    }

    @Test
    void trocaEquipeELiberaAsEquipesAoCancelarEConcluir(){
        ObjectId primeira = salvarEquipe(MUNICIPIO, USUARIO, "Equipe A");
        ObjectId segunda = salvarEquipe(MUNICIPIO, USUARIO, "Equipe B");
        OrdemDeServico os = salvarOrdem(MUNICIPIO);
        repositorio.atribuirEquipe(os.getOrdemServicoId(), MUNICIPIO, primeira, CONCLUSAO);
        repositorio.atribuirEquipe(os.getOrdemServicoId(), MUNICIPIO, segunda, CONCLUSAO);
        assertEquals("Disponível", equipe(primeira).getString("status"));
        assertEquals("Indisponível", equipe(segunda).getString("status"));
        repositorio.cancelar(os.getOrdemServicoId(), MUNICIPIO, "Serviço duplicado no teste de equipe.", CONCLUSAO);
        assertEquals("Disponível", equipe(segunda).getString("status"));
        assertEquals(segunda, ordem(os).getObjectId("equipeId"));
        assertThrows(IllegalStateException.class,
                () -> repositorio.atribuirEquipe(os.getOrdemServicoId(), MUNICIPIO, primeira, CONCLUSAO));

        OrdemDeServico outra = salvarOrdem(MUNICIPIO);
        repositorio.atribuirEquipe(outra.getOrdemServicoId(), MUNICIPIO, segunda, CONCLUSAO);
        repositorio.concluirComIntervencao(outra.getOrdemServicoId(), MUNICIPIO, USUARIO,
                "Inspeção", "Serviço executado.", List.of(), EXECUCAO, CONCLUSAO);
        assertEquals("Disponível", equipe(segunda).getString("status"));
        assertEquals(1L, banco.getCollection("intervencoes").countDocuments());
    }

    @Test
    void indiceImpedeDuasOrdensAtivasMesmoAoGravarDiretamenteNoBanco(){
        ObjectId equipe = salvarEquipe(MUNICIPIO, USUARIO, "Equipe única");
        OrdemDeServico primeira = salvarOrdem(MUNICIPIO);
        OrdemDeServico segunda = salvarOrdem(MUNICIPIO);
        repositorio.atribuirEquipe(primeira.getOrdemServicoId(), MUNICIPIO, equipe, CONCLUSAO);
        assertThrows(MongoException.class, () -> banco.getCollection("ordens_servico").updateOne(
                eq("_id", segunda.getOrdemServicoId()), new Document("$set", new Document()
                        .append("equipeId", equipe).append("status", "Em andamento"))));
        assertNull(ordem(segunda).get("equipeId"));
    }

    @Test
    void municipioDaOrdemEEquipeSaoObrigatoriamenteOsDaConta(){
        ObjectId equipeLocal = salvarEquipe(MUNICIPIO, USUARIO, "Equipe local");
        ObjectId equipeExterna = salvarEquipe(OUTRO_MUNICIPIO, USUARIO, "Equipe externa");
        OrdemDeServico local = salvarOrdem(MUNICIPIO);
        OrdemDeServico externa = salvarOrdem(OUTRO_MUNICIPIO);
        assertTrue(repositorio.listarEquipesParaOrdem(local.getOrdemServicoId(), MUNICIPIO)
                .stream().noneMatch(item -> item.id().equals(equipeExterna)));
        assertThrows(NoSuchElementException.class,
                () -> repositorio.atribuirEquipe(externa.getOrdemServicoId(), MUNICIPIO, equipeLocal, CONCLUSAO));
        assertThrows(NoSuchElementException.class,
                () -> repositorio.atribuirEquipe(local.getOrdemServicoId(), MUNICIPIO, equipeExterna, CONCLUSAO));
        assertNull(ordem(local).get("equipeId"));
        assertNull(ordem(externa).get("equipeId"));
    }

    @Test
    void listagemNaoReocupaEquipeComHistoricoTerminalNemAlteraoStatusPersistido(){
        ObjectId equipe = salvarEquipe(MUNICIPIO, USUARIO, "Equipe com histórico");
        OrdemDeServico os = salvarOrdem(MUNICIPIO);
        repositorio.atribuirEquipe(os.getOrdemServicoId(), MUNICIPIO, equipe, CONCLUSAO);
        repositorio.cancelar(os.getOrdemServicoId(), MUNICIPIO, "Serviço duplicado no teste de equipe.", CONCLUSAO);
        EquipeRepository equipes = new EquipeRepository(banco);
        var lista = equipes.listarPorMunicipioEUsuario(
                MUNICIPIO, "Município teste", USUARIO, "Usuário teste", null, "Disponível");
        assertEquals(1, lista.size());
        assertEquals("Disponível", lista.get(0).getStatus());
        assertEquals("Disponível", equipe(equipe).getString("status"));
        assertTrue(!equipes.sincronizarStatusComOrdens(equipe, USUARIO));
        assertThrows(IllegalStateException.class, () -> equipes.excluirEquipe(equipe, USUARIO));
        assertEquals("Disponível", equipe(equipe).getString("status"));
    }

    private ObjectId salvarEquipe(ObjectId municipioId, ObjectId criador, String nome){
        ObjectId id = new ObjectId();
        banco.getCollection("equipes").insertOne(new Document("_id", id)
                .append("municipioId", municipioId).append("usuarioId", criador)
                .append("nome", nome).append("regiao", "Região de teste")
                .append("gestor", new Document("email", "gestor@example.org"))
                .append("status", "Disponível").append("colaboradores", List.of())
                .append("dataCadastro", Date.from(EXECUCAO)));
        return id;
    }

    private OrdemDeServico salvarOrdem(ObjectId municipioId){
        OrdemDeServico ordem = new OrdemDeServico(municipioId, ARVORE, null, null,
                "[TESTE] Atribuição de equipe", "Serviço de teste.", "Baixa", null,
                "OS02026" + proximoCodigo++);
        repositorio.salvar(ordem);
        return ordem;
    }

    private Document equipe(ObjectId id){
        return banco.getCollection("equipes").find(eq("_id", id)).first();
    }

    private Document ordem(OrdemDeServico ordem){
        return banco.getCollection("ordens_servico").find(eq("_id", ordem.getOrdemServicoId())).first();
    }
}
