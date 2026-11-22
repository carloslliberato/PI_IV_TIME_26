package testeIntraclasseDominio;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import protocolo.PedidoDeValidacaoArvore;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.PedidoDeValidacaoOrdemDeServico.Operacao;
import protocolo.ResultadoValidacaoArvore;
import protocolo.ResultadoValidacaoOrdemDeServico;
import service.ValidadorArvore;
import service.ValidadorOrdemDeServico;

/**
 * Suíte de testes INTRACLASSE em JUnit 5 para o domínio do servidor de validação.
 * Avalia isoladamente duas classes principais do domínio aplicando duas
 * abordagens distintas de particionamento:
 * 1) ValidadorArvore -> Particionamento por ATRIBUTOS (valores válidos, limites, inválidos e nulos).
 * 2) ValidadorOrdemDeServico -> Particionamento por CATEGORIAS DE MÉTODOS/OPERAÇÕES
 *    (CADASTRO, CONCLUSAO, ATRIBUICAO_EQUIPE, CANCELAMENTO e semDados).
 */
public class TesteIntraclasseDominio {

    // Identificadores hexadecimais de 24 caracteres no padrão ObjectId do MongoDB
    private static final String OBJECT_ID_ARVORE = "507f1f77bcf86cd799439011";
    private static final String OBJECT_ID_OCORRENCIA = "507f1f77bcf86cd799439012";
    private static final String OBJECT_ID_EQUIPE = "507f1f77bcf86cd799439013";

    // CLASSE 1: ValidadorArvore (Particionamento por ATRIBUTOS) — 7 Testes

    /**
     * Teste 1 - Partição 1 (Atributos dentro da faixa normal):
     * Testa coordenadas geográficas válidas (Campinas/SP) e medidas físicas positivas.
     * Resultado esperado: validação aprovada (isValido() == true) e lista de erros vazia.
     */
    @Test
    public void testValidadorArvore_AtributosValidos() {
        PedidoDeValidacaoArvore pedido = new PedidoDeValidacaoArvore(-22.9056, -47.0608, 12.5, 45.0);
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedido);

        assertTrue(res.isValido(), "Coordenadas e medidas válidas devem ser aprovadas.");
        assertTrue(res.getErros().isEmpty(), "Não deve haver mensagens de erro para dados válidos.");
    }

    /**
     * Teste 2 - Partição 2 (Análise de Valores Limite / Fronteira):
     * Testa os extremos exatos permitidos pela regra de negócio:
     * latitude = -90.0 (mínimo), longitude = 180.0 (máximo), altura = 0.0 e diâmetro = 0.0.
     * Resultado esperado: validação aprovada sem erros.
     */
    @Test
    public void testValidadorArvore_LimitesExatosCoordenadasEMedidasZero() {
        PedidoDeValidacaoArvore pedidoLimite = new PedidoDeValidacaoArvore(-90.0, 180.0, 0.0, 0.0);
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedidoLimite);

        assertTrue(res.isValido(), "Valores nos limites exatos [-90, 90], [-180, 180] e 0.0 devem ser aceitos.");
    }

    /**
     * Teste 3 - Partição 3 (Atributos de coordenadas fora do domínio):
     * Testa latitude acima de 90.0 e longitude abaixo de -180.0.
     * Resultado esperado: validação reprovada contendo a mensagem de erro de coordenadas.
     */
    @Test
    public void testValidadorArvore_CoordenadasForaDaFaixa() {
        PedidoDeValidacaoArvore pedido = new PedidoDeValidacaoArvore(95.0, -185.0, 10.0, 30.0);
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedido);

        assertFalse(res.isValido(), "Coordenadas fora da faixa geográfica devem ser reprovadas.");
        assertTrue(res.getErros().contains("Latitude ou longitude invalida."));
    }

    /**
     * Teste 4 - Partição 4 (Atributos de medidas físicas inválidas):
     * Testa altura negativa (-2.0) e diâmetro não finito (Double.NaN).
     * Resultado esperado: validação reprovada informando erro nas medidas físicas.
     */
    @Test
    public void testValidadorArvore_MedidasNegativasENaoFinitas() {
        PedidoDeValidacaoArvore pedido = new PedidoDeValidacaoArvore(-22.9, -47.0, -2.0, Double.NaN);
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedido);

        assertFalse(res.isValido(), "Altura negativa e diâmetro NaN devem ser reprovados.");
        assertTrue(res.getErros().contains("Altura ou diametro invalido: informe valores nao negativos."));
    }

    /**
     * Teste 5 - Partição 5 (Objeto nulo):
     * Testa a resiliência do validador ao receber referência null em vez de um pedido instanciado.
     * Resultado esperado: retorno controlado (sem NullPointerException) com mensagem de pedido ausente.
     */
    @Test
    public void testValidadorArvore_PedidoNulo() {
        ResultadoValidacaoArvore res = ValidadorArvore.validar(null);

        assertFalse(res.isValido(), "Pedido nulo deve retornar resultado reprovado.");
        assertEquals("Pedido de validacao de arvore ausente.", res.getErros().get(0));
    }

    /**
     * Teste 6 - Caso Complexo 1 (Valores IEEE 754 extremos e -0.0):
     * Testa latitude -0.0, longitude +0.0, altura mínima positiva (Double.MIN_VALUE)
     * e diâmetro infinito positivo (POSITIVE_INFINITY).
     * Objetivo: Verificar se Double.isFinite() barra o infinito sem confundir -0.0 com negativo.
     */
    @Test
    public void testValidadorArvore_CasoComplexo_PontosFlutuantesExtremos() {
        PedidoDeValidacaoArvore pedido = new PedidoDeValidacaoArvore(
                -0.0, +0.0, Double.MIN_VALUE, Double.POSITIVE_INFINITY
        );
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedido);

        assertFalse(res.isValido(), "POSITIVE_INFINITY deve ser barrado por Double.isFinite().");
        assertEquals(1, res.getErros().size(), "Apenas o diâmetro infinito deve gerar erro; -0.0 é válido.");
    }

    /**
     * Teste 7 - Defeito de Domínio (Altura física impossível):
     * Testa o cadastro de uma árvore com 5000 metros de altura (fisicamente impossível).
     * FALHA ESPERADA: ValidadorArvore aceita como válido porque verifica apenas altura < 0.
     */
    @Test
    public void testValidadorArvore_FalhaLimiteMaximoAltura() {
        PedidoDeValidacaoArvore pedido = new PedidoDeValidacaoArvore(-22.9056, -47.0608, 5000.0, 45.0);
        ResultadoValidacaoArvore res = ValidadorArvore.validar(pedido);

        assertFalse(res.isValido(), "Uma árvore urbana não deveria ser aceita com 5000 metros de altura.");
    }

    // CLASSE 2: ValidadorOrdemDeServico (Particionamento por CATEGORIAS DE OPERAÇÃO) — 10 Testes

    /**
     * Teste 8 - Categoria 1A (Operacao.CADASTRO - Fluxo válido):
     * Testa o cadastro de uma nova OS vinculada a árvore e ocorrência válidas,
     * sem equipe atribuída inicialmente, e verifica a normalização (strip) do título.
     */
    @Test
    public void testValidadorOS_CategoriaCadastroValido() {
        PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.cadastro(
                OBJECT_ID_ARVORE, OBJECT_ID_OCORRENCIA, null,
                "  Poda preventiva  ", "Galhos proximos a rede eletrica", "ALTA", "Acesso livre"
        );
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertTrue(res.isValido(), "Cadastro com ObjectIds válidos e sem equipe deve ser aprovado.");
        assertEquals(Operacao.CADASTRO, res.getOperacao());
        assertNotNull(res.getCadastro(), "Deve retornar o record CadastroValidado preenchido.");
        assertEquals("Poda preventiva", res.getCadastro().titulo(), "Espaços externos devem ser removidos.");
    }

    /**
     * Teste 9 - Categoria 1B (Operacao.CADASTRO - Regra de negócio de equipe):
     * Testa a tentativa de cadastrar uma OS já informando um equipeId.
     * Resultado esperado: reprovação exigindo que a atribuição seja feita em operação separada.
     */
    @Test
    public void testValidadorOS_CategoriaCadastroComEquipe_Reprovado() {
        PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.cadastro(
                OBJECT_ID_ARVORE, null, OBJECT_ID_EQUIPE,
                "Supressao", "Arvore condenada", "URGENTE", null
        );
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertFalse(res.isValido(), "Não deve permitir vincular equipe diretamente no cadastro da OS.");
        assertEquals("Crie a OS sem equipe e use a opção Atribuir equipe após o cadastro.", res.getErro());
    }

    /**
     * Teste 10 - Categoria 2 (Operacao.CONCLUSAO - Fluxo válido):
     * Testa o encerramento técnico da OS com tipo de serviço, descrição, data ISO com fuso
     * anterior ao instante de referência ('agora') e URL HTTPS válida da foto comprobatória.
     */
    @Test
    public void testValidadorOS_CategoriaConclusaoValida() {
        Instant agora = Instant.parse("2026-11-21T15:00:00Z");
        List<String> fotos = List.of("https://storage.arboriza.gov.br/os/foto1.jpg");

        PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.conclusao(
                "PODA", "Servico executado com sucesso", "2026-11-21T11:30:00-03:00", fotos, agora
        );
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertTrue(res.isValido(), "Conclusão com data passada e URL HTTPS válida deve ser aprovada.");
        assertEquals(Operacao.CONCLUSAO, res.getOperacao());
        assertNotNull(res.getConclusao());
        assertEquals(1, res.getConclusao().fotos().size());
    }

    /**
     * Teste 11 - Categoria 3 (Operacao.ATRIBUICAO_EQUIPE - Fluxo válido):
     * Testa a validação do identificador ObjectId de uma equipe operacional.
     */
    @Test
    public void testValidadorOS_CategoriaAtribuicaoEquipeValida() {
        PedidoDeValidacaoOrdemDeServico pedido =
                PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe(OBJECT_ID_EQUIPE);
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertTrue(res.isValido(), "Atribuição com ObjectId de equipe válido deve ser aprovada.");
        assertEquals(Operacao.ATRIBUICAO_EQUIPE, res.getOperacao());
        assertEquals(OBJECT_ID_EQUIPE, res.getEquipeId());
    }

    /**
     * Teste 12 - Categoria 4 (Operacao.CANCELAMENTO - Fluxo válido):
     * Testa o cancelamento de uma OS informando motivo textual com espaços nas bordas.
     */
    @Test
    public void testValidadorOS_CategoriaCancelamentoValido() {
        PedidoDeValidacaoOrdemDeServico pedido =
                PedidoDeValidacaoOrdemDeServico.cancelamento("  Ocorrencia duplicada no sistema  ");
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertTrue(res.isValido(), "Cancelamento com justificativa preenchida deve ser aprovado.");
        assertEquals(Operacao.CANCELAMENTO, res.getOperacao());
        assertEquals("Ocorrencia duplicada no sistema", res.getMotivoCancelamento());
    }

    /**
     * Teste 13 - Categoria 5 (Pedido sem payload / dadosPresentes == false):
     * Testa o método fábrica semDados() simulando uma requisição vazia enviada pelo cliente.
     */
    @Test
    public void testValidadorOS_CategoriaSemDados_Reprovado() {
        PedidoDeValidacaoOrdemDeServico pedido =
                PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CADASTRO, Instant.now());
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertFalse(res.isValido(), "Pedido marcado com dadosPresentes = false deve ser reprovado.");
        assertEquals("Informe os dados da nova ordem de serviço.", res.getErro());
    }

    /**
     * Teste 14 - Caso Complexo 2 (OS Conclusão - URL maliciosa com credenciais e data futura por 1ms):
     * Testa o bloqueio de data 1 milissegundo no futuro e o bloqueio de URL contendo
     * usuário e senha embutidos (rawUserInfo).
     */
    @Test
    public void testValidadorOS_CasoComplexo_ConclusaoComUrlMaliciosaEDataFutura() {
        Instant agora = Instant.parse("2026-11-21T15:00:00.000Z");
        String dataUmMilissegundoNoFuturo = "2026-11-21T15:00:00.001Z";
        List<String> fotosComCredenciais = List.of("https://usuario:123456@storage.arboriza.gov.br/foto.jpg");

        PedidoDeValidacaoOrdemDeServico pedidoDataFutura = PedidoDeValidacaoOrdemDeServico.conclusao(
                "SUPRESSAO", "Corte realizado", dataUmMilissegundoNoFuturo, fotosComCredenciais, agora
        );
        ResultadoValidacaoOrdemDeServico resData = ValidadorOrdemDeServico.validar(pedidoDataFutura);
        assertFalse(resData.isValido(), "Data mesmo 1ms no futuro deve ser rejeitada.");
        assertEquals("A data de execução não pode estar no futuro.", resData.getErro());

        PedidoDeValidacaoOrdemDeServico pedidoUrlInsegura = PedidoDeValidacaoOrdemDeServico.conclusao(
                "SUPRESSAO", "Corte realizado", "2026-11-21T14:59:59.999Z", fotosComCredenciais, agora
        );
        ResultadoValidacaoOrdemDeServico resUrl = ValidadorOrdemDeServico.validar(pedidoUrlInsegura);
        assertFalse(resUrl.isValido(), "URL contendo usuário/senha (rawUserInfo) deve ser bloqueada.");
        assertEquals("Use referências de fotos HTTP ou HTTPS completas, com domínio e sem credenciais.", resUrl.getErro());
    }

    /**
     * Teste 15 - Caso Complexo 3 (OS Cancelamento - Caracteres Unicode invisíveis / BOM):
     * Tenta burlar a validação de motivo vazio enviando uma string composta apenas por
     * Byte Order Mark (\uFEFF), Non-Breaking Space (\u00A0) e espaço ideográfico (\u3000).
     */
    @Test
    public void testValidadorOS_CasoComplexo_CancelamentoComCaracteresInvisiveisUnicode() {
        String motivoFalsoInvisivel = "\uFEFF\u00A0\u3000 \t\n ";
        PedidoDeValidacaoOrdemDeServico pedido =
                PedidoDeValidacaoOrdemDeServico.cancelamento(motivoFalsoInvisivel);

        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertFalse(res.isValido(), "String contendo apenas caracteres invisíveis Unicode deve ser rejeitada.");
        assertEquals("O motivo do cancelamento deve ser informado.", res.getErro());
    }

    /**
     * Teste 16 - Caso Complexo 4 (OS Cadastro - Limite exato de 160 caracteres e estouro em 161):
     * Testa a regra condicional onde ocorrenciaId é null e o título está exatamente
     * na fronteira de 160 caracteres vs 161 caracteres.
     */
    @Test
    public void testValidadorOS_CasoComplexo_CadastroLimite160CharsESemOcorrencia() {
        String tituloExato160 = "A".repeat(160);
        PedidoDeValidacaoOrdemDeServico pedidoLimite = PedidoDeValidacaoOrdemDeServico.cadastro(
                OBJECT_ID_ARVORE, null, null,
                "   " + tituloExato160 + "   ", "Descrição válida", null, null
        );
        ResultadoValidacaoOrdemDeServico resOk = ValidadorOrdemDeServico.validar(pedidoLimite);
        assertTrue(resOk.isValido(), "Título com exatamente 160 caracteres após strip() deve passar.");
        assertEquals(160, resOk.getCadastro().titulo().length());

        PedidoDeValidacaoOrdemDeServico pedidoEstourado = PedidoDeValidacaoOrdemDeServico.cadastro(
                OBJECT_ID_ARVORE, null, null,
                "A".repeat(161), "Descrição válida", null, null
        );
        ResultadoValidacaoOrdemDeServico resErro = ValidadorOrdemDeServico.validar(pedidoEstourado);
        assertFalse(resErro.isValido(), "Título com 161 caracteres deve falhar.");
        assertEquals("O título deve ter no máximo 160 caracteres.", resErro.getErro());
    }

    /**
     * Teste 17 - Defeito de Domínio (OS Cadastro - Prioridade fora do domínio):
     * Testa o envio de uma prioridade inexistente ("PRIORIDADE_INVENTADA").
     * FALHA ESPERADA: ValidadorOrdemDeServico aceita qualquer string de até 40 caracteres.
     */
    @Test
    public void testValidadorOS_FalhaPrioridadeInvalida() {
        PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.cadastro(
                OBJECT_ID_ARVORE, null, null,
                "Poda de galhos", "Galhos baixos", "PRIORIDADE_INVENTADA", null
        );
        ResultadoValidacaoOrdemDeServico res = ValidadorOrdemDeServico.validar(pedido);

        assertFalse(res.isValido(), "Prioridades fora de [BAIXA, MEDIA, ALTA, URGENTE] deveriam ser rejeitadas.");
    }
}