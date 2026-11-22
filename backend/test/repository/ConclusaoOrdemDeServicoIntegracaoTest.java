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
 * arboriza_test_conclusao_<UUID>. Sem essa variável, os testes são ignorados.
 */
class ConclusaoOrdemDeServicoIntegracaoTest {
    private static final String PREFIXO_BANCO = "arboriza_test_conclusao_";
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
    void concluiERegistraIntervencaoComVinculosDaOrdemSemDuplicarAoRepetir(){
        OrdemDeServico ordem = salvarOrdem(MUNICIPIO, EQUIPE);
        Document antes = documento(ordem);

        var resultado = repositorio.concluirComIntervencao(
                ordem.getOrdemServicoId(), MUNICIPIO, USUARIO,
                "Inspeção", "Inspeção executada; nenhuma poda necessária.",
                List.of("https://example.org/foto.jpg"), EXECUCAO, CONCLUSAO);

        Document depois = documento(ordem);
        Document intervencao = banco.getCollection("intervencoes")
                .find(eq("ordemServicoId", ordem.getOrdemServicoId())).first();
        assertNotNull(intervencao);
        assertEquals("Concluída", depois.getString("status"));
        assertEquals(Date.from(CONCLUSAO), depois.getDate("dataConclusao"));
        assertEquals(Date.from(CONCLUSAO), depois.getDate("dataAtualizacao"));
        assertEquals(antes.get("codigo"), depois.get("codigo"));
        assertEquals(antes.get("dataCriacao"), depois.get("dataCriacao"));
        assertEquals(antes.get("descricao"), depois.get("descricao"));
        assertEquals(intervencao.getObjectId("_id"), depois.getObjectId("intervencaoConclusaoId"));
        assertEquals(MUNICIPIO, intervencao.getObjectId("municipioId"));
        assertEquals(ARVORE, intervencao.getObjectId("arvoreId"));
        assertEquals(EQUIPE, intervencao.getObjectId("equipeId"));
        assertEquals(USUARIO, intervencao.getObjectId("usuarioId"));
        assertEquals(Date.from(EXECUCAO), intervencao.getDate("dataExecucao"));
        assertEquals(List.of("https://example.org/foto.jpg"), intervencao.getList("fotos", String.class));
        assertEquals(intervencao.getObjectId("_id"), resultado.intervencao().getIntervencaoId());
        assertEquals(intervencao.getObjectId("_id"), resultado.ordem().getIntervencaoConclusaoId());
        assertEquals(intervencao.getObjectId("_id"), repositorio
                .buscarIntervencaoConclusao(resultado.ordem()).orElseThrow().getIntervencaoId());

        assertThrows(IllegalStateException.class, () -> concluir(ordem, MUNICIPIO));
        assertEquals(1L, banco.getCollection("intervencoes")
                .countDocuments(eq("ordemServicoId", ordem.getOrdemServicoId())));
        assertEquals(depois, documento(ordem));
    }

    @Test
    void concluiOcorrenciaVinculadaNaMesmaTransacaoDaOrdem(){
        ObjectId ocorrenciaId = new ObjectId();
        banco.getCollection("ocorrencias").insertOne(new Document("_id", ocorrenciaId)
                .append("municipioId", MUNICIPIO)
                .append("status", "Em Atendimento")
                .append("atualizadoEm", "2026-11-19T10:00:00Z"));
        OrdemDeServico ordem = salvarOrdem(MUNICIPIO, EQUIPE, ocorrenciaId);

        repositorio.concluirComIntervencao(ordem.getOrdemServicoId(), MUNICIPIO, USUARIO,
                "Poda", "Serviço executado.", List.of(), EXECUCAO, CONCLUSAO);

        Document ocorrencia = banco.getCollection("ocorrencias")
                .find(eq("_id", ocorrenciaId)).first();
        assertNotNull(ocorrencia);
        assertEquals("Concluída", ocorrencia.getString("status"));
        assertEquals(CONCLUSAO.toString(), ocorrencia.getString("atualizadoEm"));
    }

    @Test
    void naoConcluiOrdemSeOcorrenciaVinculadaNaoForEncontrada(){
        OrdemDeServico ordem = salvarOrdem(MUNICIPIO, EQUIPE, new ObjectId());
        Document antes = documento(ordem);

        assertThrows(NoSuchElementException.class, () -> concluir(ordem, MUNICIPIO));

        assertEquals(antes, documento(ordem));
        assertEquals(0L, banco.getCollection("intervencoes").countDocuments());
    }

    @Test
    void falhaNaInsercaoDaIntervencaoDesfazTambemAConclusaoDaOrdem(){
        OrdemDeServico ordem = salvarOrdem(MUNICIPIO, null);
        Document antes = documento(ordem);

        // Rejeita a segunda gravação no servidor, sem simular a transação.
        banco.runCommand(new Document("collMod", "intervencoes")
                .append("validator", new Document("tipo", "__REJEITAR_TIPO_DO_TESTE__"))
                .append("validationAction", "error")
                .append("validationLevel", "strict"));

        assertThrows(MongoException.class, () -> concluir(ordem, MUNICIPIO));

        assertEquals(antes, documento(ordem),
                "A OS deve continuar exatamente como estava antes da transação abortada.");
        assertEquals(0L, banco.getCollection("intervencoes").countDocuments());
    }

    @Test
    void naoConcluiOrdemDeOutroMunicipioNemRetornaSeuRelatorio(){
        OrdemDeServico ordem = salvarOrdem(OUTRO_MUNICIPIO, EQUIPE);
        Document antes = documento(ordem);

        assertThrows(NoSuchElementException.class, () -> concluir(ordem, MUNICIPIO));
        assertEquals(antes, documento(ordem));
        assertEquals(0L, banco.getCollection("intervencoes").countDocuments());

        var resultado = repositorio.concluirComIntervencao(
                ordem.getOrdemServicoId(), OUTRO_MUNICIPIO, USUARIO,
                "Poda", "Serviço executado.", List.of(), EXECUCAO, CONCLUSAO);
        IntervencaoRepository intervencoes = new IntervencaoRepository(banco);
        assertTrue(intervencoes.buscarConclusao(
                resultado.intervencao().getIntervencaoId(), ordem.getOrdemServicoId(), MUNICIPIO).isEmpty());
    }

    @Test
    void preservaOrdemCanceladaEPermiteConcluirAbertaSemInventarEquipe(){
        OrdemDeServico cancelada = salvarOrdem(MUNICIPIO, null);
        banco.getCollection("ordens_servico").updateOne(eq("_id", cancelada.getOrdemServicoId()),
                new Document("$set", new Document("status", "Cancelada")));
        Document antes = documento(cancelada);

        assertThrows(IllegalStateException.class, () -> concluir(cancelada, MUNICIPIO));
        assertEquals(antes, documento(cancelada));
        assertEquals(0L, banco.getCollection("intervencoes").countDocuments());

        OrdemDeServico aberta = salvarOrdem(MUNICIPIO, null);
        var resultado = repositorio.concluirComIntervencao(
                aberta.getOrdemServicoId(), MUNICIPIO, USUARIO,
                "Inspeção", "Serviço executado.", List.of(), EXECUCAO, CONCLUSAO);
        assertEquals("Concluída", resultado.ordem().getStatus());
        assertNull(resultado.intervencao().getEquipeId());
        assertEquals(1L, banco.getCollection("intervencoes").countDocuments());
    }

    private OrdemDeServico salvarOrdem(ObjectId municipioId, ObjectId equipeId){
        return salvarOrdem(municipioId, equipeId, null);
    }

    private OrdemDeServico salvarOrdem(
            ObjectId municipioId, ObjectId equipeId, ObjectId ocorrenciaId){
        OrdemDeServico ordem = new OrdemDeServico(
                municipioId, ARVORE, ocorrenciaId, equipeId,
                "[TESTE] Conclusão transacional", "Descrição original da ordem.",
                "Baixa", null, "OS02026" + proximoCodigo++);
        repositorio.salvar(ordem);
        return ordem;
    }

    private void concluir(OrdemDeServico ordem, ObjectId municipioId){
        repositorio.concluirComIntervencao(ordem.getOrdemServicoId(), municipioId, USUARIO,
                "Poda", "Serviço executado.", List.of(), EXECUCAO, CONCLUSAO);
    }

    private Document documento(OrdemDeServico ordem){
        Document documento = banco.getCollection("ordens_servico")
                .find(eq("_id", ordem.getOrdemServicoId())).first();
        assertNotNull(documento);
        return documento;
    }
}
