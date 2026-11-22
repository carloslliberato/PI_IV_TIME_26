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
 * arboriza_test_cadastro_<UUID>. Sem essa variável, os testes são ignorados.
 */
class CadastroOrdemDeServicoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_cadastro_";
    private static final ObjectId MUNICIPIO = new ObjectId("100000000000000000000001");
    private static final ObjectId OUTRO_MUNICIPIO = new ObjectId("100000000000000000000002");
    private static final ObjectId ARVORE = new ObjectId("200000000000000000000001");
    private static final ObjectId OCORRENCIA = new ObjectId("300000000000000000000001");

    private MongoClient cliente;
    private MongoDatabase banco;
    private OrdemDeServicoRepository repositorio;

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
        banco.createCollection("arvores");
        banco.createCollection("ocorrencias");
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
    void criaAbertaComReferenciasCanonicasEDadosEditadosSemModificarOcorrencia(){
        arvore(ARVORE, MUNICIPIO, true);
        Document origem = new Document("_id", OCORRENCIA).append("municipioId", MUNICIPIO)
                .append("arvoreId", ARVORE).append("tipoProblema", "Tipo original")
                .append("descricao", "Descrição original da ocorrência.");
        banco.getCollection("ocorrencias").insertOne(origem);
        Document antes = banco.getCollection("ocorrencias").find(eq("_id", OCORRENCIA)).first();
        OrdemDeServico nova = novaOrdem(ARVORE, OCORRENCIA, "OS020261");

        var salva = repositorio.criarComReferencias(nova);
        Document persistida = banco.getCollection("ordens_servico").find(eq("_id", salva.getOrdemServicoId())).first();
        assertNotNull(persistida);
        assertEquals("Aberta", salva.getStatus());
        assertNull(salva.getEquipeId());
        assertEquals(MUNICIPIO, persistida.getObjectId("municipioId"));
        assertEquals(ARVORE, persistida.getObjectId("arvoreId"));
        assertEquals(OCORRENCIA, persistida.getObjectId("ocorrenciaId"));
        assertEquals("Título editado pelo funcionário", persistida.getString("titulo"));
        assertEquals("Descrição final do serviço.", persistida.getString("descricao"));
        assertEquals("OS020261", persistida.getString("codigo"));
        assertEquals(salva.getDataCriacao(), persistida.getDate("dataCriacao").toInstant());
        assertEquals("OS020261", repositorio.buscarPorId(salva.getOrdemServicoId()).orElseThrow().getCodigo());
        assertEquals(antes, banco.getCollection("ocorrencias").find(eq("_id", OCORRENCIA)).first());
    }

    @Test
    void criaSemOcorrenciaEIsolaContadoresPorAno(){
        arvore(ARVORE, MUNICIPIO, true);
        assertEquals(1L, repositorio.gerarProximoNumero(2026));
        assertEquals(2L, repositorio.gerarProximoNumero(2026));
        assertEquals(1L, repositorio.gerarProximoNumero(2027));
        var salva = repositorio.criarComReferencias(novaOrdem(ARVORE, null, "OS020262"));
        assertNull(salva.getOcorrenciaId());
        assertNull(salva.getEquipeId());
        assertEquals("Aberta", salva.getStatus());
    }

    @Test
    void criaOrdemSemArvorePersistindoEnderecoBairroECoordenadas(){
        OrdemDeServico nova = new OrdemDeServico(MUNICIPIO, null, null, null,
                "Galho quebrado", "Remover o galho.", "Alta", null, "OS020263",
                "Rua das Flores, 25", "Centro", -22.9, -47.06);

        OrdemDeServico salva = repositorio.criarComReferencias(nova);
        Document persistida = banco.getCollection("ordens_servico")
                .find(eq("_id", salva.getOrdemServicoId())).first();

        assertNull(salva.getArvoreId());
        assertEquals("Rua das Flores, 25", persistida.getString("endereco"));
        assertEquals("Centro", persistida.getString("bairro"));
        assertEquals(-22.9, persistida.getDouble("latitude"));
        assertEquals(-47.06, persistida.getDouble("longitude"));
        OrdemDeServico reconstruida = repositorio.buscarPorId(salva.getOrdemServicoId()).orElseThrow();
        assertEquals("Rua das Flores, 25", reconstruida.getEndereco());
        assertEquals(-22.9, reconstruida.getLatitude());
    }

    @Test
    void criaOSDaOcorrenciaEReservaEquipeDisponivelNaMesmaTransacao(){
        ObjectId equipeId = new ObjectId("400000000000000000000001");
        ObjectId equipeIndisponivelId = new ObjectId("400000000000000000000002");
        ObjectId equipeOutroMunicipioId = new ObjectId("400000000000000000000003");
        ObjectId equipeComOrdemAtivaId = new ObjectId("400000000000000000000004");
        banco.getCollection("ocorrencias").insertOne(new Document("_id", OCORRENCIA)
                .append("municipioId", MUNICIPIO).append("status", "Recebida"));
        banco.getCollection("equipes").insertMany(List.of(
                new Document("_id", equipeId).append("municipioId", MUNICIPIO)
                        .append("nome", "Equipe Centro").append("status", "Disponível"),
                new Document("_id", equipeIndisponivelId).append("municipioId", MUNICIPIO)
                        .append("nome", "Equipe Ocupada").append("status", "Indisponível"),
                new Document("_id", equipeOutroMunicipioId).append("municipioId", OUTRO_MUNICIPIO)
                        .append("nome", "Equipe Externa").append("status", "Disponível"),
                new Document("_id", equipeComOrdemAtivaId).append("municipioId", MUNICIPIO)
                        .append("nome", "Equipe com OS").append("status", "Disponível")));
        banco.getCollection("ordens_servico").insertOne(new Document("_id", new ObjectId())
                .append("municipioId", MUNICIPIO).append("equipeId", equipeComOrdemAtivaId)
                .append("status", "Em andamento"));
        assertEquals("Equipe Centro", repositorio.buscarNomesEquipes(
                List.of(equipeId), MUNICIPIO).get(equipeId));
        assertEquals(List.of(equipeId), repositorio.listarEquipesDisponiveisParaOcorrencia(
                OCORRENCIA, MUNICIPIO).stream().map(equipe -> equipe.id()).toList());

        OrdemDeServico ordem = new OrdemDeServico(MUNICIPIO, null, OCORRENCIA, equipeId,
                "Atendimento de ocorrência", "Descrição do atendimento.", "Alta", null, "OS020261");
        OrdemDeServico salva = repositorio.criarParaOcorrencia(ordem,
                "Ordem OS020261 atribuída à equipe Equipe Centro");

        assertEquals("Em andamento", salva.getStatus());
        assertEquals(equipeId, salva.getEquipeId());
        assertNull(salva.getArvoreId());
        assertEquals("Indisponível", banco.getCollection("equipes")
                .find(eq("_id", equipeId)).first().getString("status"));
        assertEquals("Em Atendimento", banco.getCollection("ocorrencias")
                .find(eq("_id", OCORRENCIA)).first().getString("status"));
        assertTrue(repositorio.listarEquipesDisponiveisParaOcorrencia(
                OCORRENCIA, MUNICIPIO).isEmpty());
    }

    @Test
    void rejeitaArvoreAusenteArquivadaDeOutroMunicipioOuComTipoBsonIncompativel(){
        assertThrows(NoSuchElementException.class,
                () -> repositorio.criarComReferencias(novaOrdem(ARVORE, null, "OS020261")));
        for (Document documento : List.of(
                new Document("_id", ARVORE).append("municipioId", OUTRO_MUNICIPIO).append("ativa", true),
                new Document("_id", ARVORE).append("municipioId", MUNICIPIO).append("ativa", false),
                new Document("_id", ARVORE.toHexString()).append("municipioId", MUNICIPIO).append("ativa", true),
                new Document("_id", ARVORE).append("municipioId", MUNICIPIO.toHexString()).append("ativa", true))) {
            banco.getCollection("arvores").insertOne(documento);
            assertThrows(NoSuchElementException.class,
                    () -> repositorio.criarComReferencias(novaOrdem(ARVORE, null, "OS020261")));
            banco.getCollection("arvores").deleteMany(new Document());
        }
        assertEquals(0L, banco.getCollection("ordens_servico").countDocuments());
    }

    @Test
    void rejeitaOcorrenciaInexistenteExternaOuIncompativelSemSalvarParcialmente(){
        arvore(ARVORE, MUNICIPIO, true);
        assertThrows(NoSuchElementException.class,
                () -> repositorio.criarComReferencias(novaOrdem(ARVORE, OCORRENCIA, "OS020261")));
        for (Document documento : List.of(
                new Document("_id", OCORRENCIA).append("municipioId", OUTRO_MUNICIPIO),
                new Document("_id", OCORRENCIA.toHexString()).append("municipioId", MUNICIPIO),
                new Document("_id", OCORRENCIA).append("municipioId", "campinas"))) {
            banco.getCollection("ocorrencias").insertOne(documento);
            assertThrows(NoSuchElementException.class,
                    () -> repositorio.criarComReferencias(novaOrdem(ARVORE, OCORRENCIA, "OS020261")));
            banco.getCollection("ocorrencias").deleteMany(new Document());
        }
        assertEquals(0L, banco.getCollection("ordens_servico").countDocuments());
    }

    @Test
    void codigoUnicoNaoBloqueiaOrdensLegadasComCodigoNuloOuAusente(){
        arvore(ARVORE, MUNICIPIO, true);
        banco.getCollection("ordens_servico").insertMany(List.of(
                new Document("_id", new ObjectId()).append("codigo", null),
                new Document("_id", new ObjectId()).append("codigo", null),
                new Document("_id", new ObjectId())));
        repositorio.criarComReferencias(novaOrdem(ARVORE, null, "OS020261"));
        assertThrows(IllegalStateException.class,
                () -> repositorio.criarComReferencias(novaOrdem(ARVORE, null, "OS020261")));
        assertEquals(4L, banco.getCollection("ordens_servico").countDocuments());
    }

    @Test
    @SuppressWarnings("unchecked")
    void opcoesExibemSomenteReferenciasCompativeisDoMunicipio(){
        arvore(ARVORE, MUNICIPIO, true);
        arvore(new ObjectId(), OUTRO_MUNICIPIO, true);
        arvore(new ObjectId(), MUNICIPIO, false);
        banco.getCollection("arvores").insertOne(new Document("_id", "uuid-legado")
                .append("municipioId", MUNICIPIO).append("ativa", true));
        banco.getCollection("ocorrencias").insertMany(List.of(
                new Document("_id", OCORRENCIA).append("municipioId", MUNICIPIO).append("tipoProblema", "Inspeção"),
                new Document("_id", new ObjectId()).append("municipioId", OUTRO_MUNICIPIO),
                new Document("_id", "oco_legada").append("municipioId", "campinas")));
        var opcoes = repositorio.opcoesDeCadastro(MUNICIPIO);
        List<java.util.Map<String, Object>> arvores = (List<java.util.Map<String, Object>>) opcoes.get("arvores");
        List<java.util.Map<String, Object>> ocorrencias = (List<java.util.Map<String, Object>>) opcoes.get("ocorrencias");
        assertEquals(List.of(ARVORE.toHexString()), arvores.stream().map(item -> item.get("id")).toList());
        assertEquals(List.of(OCORRENCIA.toHexString()), ocorrencias.stream().map(item -> item.get("id")).toList());
    }

    private void arvore(ObjectId id, ObjectId municipioId, boolean ativa){
        banco.getCollection("arvores").insertOne(new Document("_id", id).append("municipioId", municipioId)
                .append("nomePopular", "Árvore de teste").append("ativa", ativa));
    }

    private OrdemDeServico novaOrdem(ObjectId arvoreId, ObjectId ocorrenciaId, String codigo){
        return new OrdemDeServico(MUNICIPIO, arvoreId, ocorrenciaId, null,
                "Título editado pelo funcionário", "Descrição final do serviço.", "Alta", "Observação editada.", codigo);
    }
}
