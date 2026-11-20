package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.PedidoDeValidacaoOrdemDeServico.Operacao;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico.CadastroValidado;
import protocolo.ResultadoValidacaoOrdemDeServico.ConclusaoValidada;

/**
 * Contribuição: Marialvo Corrêa de Freitas Junior.
 * Verifica cadastro, conclusão, equipe e motivo obrigatório do cancelamento no servidor.
 * Exercita valores ausentes, válidos, inválidos e limites, sem Socket ou MongoDB.
 */
class ValidadorOrdemDeServicoTest {
    private static final String ARVORE = "200000000000000000000001";
    private static final String OCORRENCIA = "300000000000000000000001";
    private static final Instant AGORA = Instant.parse("2026-11-20T15:00:00Z");

    @Test
    void preservaOsDadosFinaisEditadosPeloUsuarioERemoveEspacosExternos() {
        var validado = aprovarCadastro(cadastro(ARVORE, OCORRENCIA, null,
                "  Inspeção solicitada  ", "  Descrição editada pelo funcionário.  ", "  Alta  ", "  Texto final.  "));
        assertEquals(ARVORE, validado.arvoreId());
        assertEquals(OCORRENCIA, validado.ocorrenciaId());
        assertEquals("Inspeção solicitada", validado.titulo());
        assertEquals("Descrição editada pelo funcionário.", validado.descricao());
        assertEquals("Alta", validado.prioridade());
        assertEquals("Texto final.", validado.observacoes());
    }

    @Test
    void exigeCorpoTituloDescricaoEArvore() {
        assertEquals("O pedido de validação da OS não foi informado.", reprovar(null));
        assertEquals("Informe os dados da nova ordem de serviço.",
                reprovar(PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CADASTRO, null)));
        for (String vazio : Arrays.asList(null, "", "   ")) {
            assertEquals("O identificador da árvore deve ser informado.",
                    reprovar(cadastro(vazio, null, null, "Título", "Descrição", null, null)));
            assertEquals("O título deve ser informado.",
                    reprovar(cadastro(ARVORE, null, null, vazio, "Descrição", null, null)));
            assertEquals("A descrição deve ser informado.",
                    reprovar(cadastro(ARVORE, null, null, "Título", vazio, null, null)));
        }
    }

    @Test
    void ocorrenciaPrioridadeEObservacoesSaoOpcionais() {
        for (String vazio : Arrays.asList(null, "", "   ")) {
            var dados = aprovarCadastro(cadastro(ARVORE, vazio, vazio,
                    "Título", "Descrição", vazio, vazio));
            assertNull(dados.ocorrenciaId());
            assertNull(dados.prioridade());
            assertNull(dados.observacoes());
        }
    }

    @Test
    void ocorrenciaPodeCriarOsSemArvoreVinculada() {
        var dados = aprovarCadastro(cadastro(null, OCORRENCIA, null,
                "Atendimento de ocorrência", "Descrição informada na ocorrência.", null, null));
        assertNull(dados.arvoreId());
        assertEquals(OCORRENCIA, dados.ocorrenciaId());
    }

    @Test
    void naoConverteUuidProtocoloOuIdentificadorInvalidoEmObjectId() {
        for (String id : List.of("abc", "d9428888-122b-11e1-b85c-61cd3cbb3210", "oco_12345678",
                "OC020261", "00000000000000000000001", "zzzzzzzzzzzzzzzzzzzzzzzz")) {
            reprovar(cadastro(id, null, null, "Título", "Descrição", null, null));
            reprovar(cadastro(ARVORE, id, null, "Título", "Descrição", null, null));
        }
    }

    @Test
    void aceitaLimitesDeTextoERejeitaExcessoSemTruncar() {
        String titulo = "T".repeat(160);
        String descricao = "D".repeat(4000);
        String prioridade = "P".repeat(40);
        String observacoes = "O".repeat(4000);
        var valido = aprovarCadastro(cadastro(ARVORE, null, null, titulo, descricao, prioridade, observacoes));
        assertEquals(titulo, valido.titulo());
        assertEquals(descricao, valido.descricao());
        assertEquals(prioridade, valido.prioridade());
        assertEquals(observacoes, valido.observacoes());
        assertEquals("O título deve ter no máximo 160 caracteres.",
                reprovar(cadastro(ARVORE, null, null, titulo + "X", descricao, prioridade, observacoes)));
        assertEquals("A descrição deve ter no máximo 4000 caracteres.",
                reprovar(cadastro(ARVORE, null, null, titulo, descricao + "X", prioridade, observacoes)));
        assertEquals("A prioridade deve ter no máximo 40 caracteres.",
                reprovar(cadastro(ARVORE, null, null, titulo, descricao, prioridade + "X", observacoes)));
        assertEquals("As observações deve ter no máximo 4000 caracteres.",
                reprovar(cadastro(ARVORE, null, null, titulo, descricao, prioridade, observacoes + "X")));
    }

    @Test
    void recusaAtribuicaoDeEquipeNoCadastroInicial() {
        assertEquals("Crie a OS sem equipe e use a opção Atribuir equipe após o cadastro.",
                reprovar(cadastro(ARVORE, null, "400000000000000000000001", "Título", "Descrição", null, null)));
    }

    @Test
    void normalizaTextoEConverteHorarioComFusoSemAlterarOConteudoDoServico() {
        var dados = aprovarConclusao(conclusao("  Inspeção  ", "  Inspeção realizada.\nSem necessidade de poda.  ",
                "2026-11-20T11:30:00-03:00", List.of("  https://example.org/foto-1.jpg  ")));
        assertEquals("Inspeção", dados.tipo());
        assertEquals("Inspeção realizada.\nSem necessidade de poda.", dados.descricao());
        assertEquals(Instant.parse("2026-11-20T14:30:00Z"), dados.dataExecucao());
        assertEquals(List.of("https://example.org/foto-1.jpg"), dados.fotos());
    }

    @Test
    void aceitaConclusaoSemFotosEUsaHorarioDoBackendQuandoExecucaoNaoFoiInformada() {
        var dados = aprovarConclusao(conclusao("Poda", "Poda executada e resíduos recolhidos.", null, null));
        assertEquals(AGORA, dados.dataExecucao());
        assertTrue(dados.fotos().isEmpty());
        assertTrue(aprovarConclusao(conclusao("Poda", "Serviço executado.", null, List.of())).fotos().isEmpty());
        assertEquals("O horário de referência da conclusão não foi informado.",
                reprovar(PedidoDeValidacaoOrdemDeServico.conclusao("Poda", "Serviço executado.", null, null, null)));
    }

    @Test
    void exigeCorpoTipoEDescricaoMesmoQuandoContemSomenteEspacos() {
        assertEquals("Informe os dados da conclusão da OS.",
                reprovar(PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CONCLUSAO, AGORA)));
        for (String vazio : Arrays.asList(null, "", "   ", "\n\t")) {
            assertEquals("O tipo de serviço deve ser informado.",
                    reprovar(conclusao(vazio, "Serviço executado.", null, null)));
            assertEquals("A descrição do serviço executado deve ser informado.",
                    reprovar(conclusao("Poda", vazio, null, null)));
        }
    }

    @Test
    void respeitaLimitesDeTextoSemTruncarORegistro() {
        String tipo = "T".repeat(80);
        String descricao = "D".repeat(4000);
        var valido = aprovarConclusao(conclusao(tipo, descricao, null, null));
        assertEquals(tipo, valido.tipo());
        assertEquals(descricao, valido.descricao());
        assertEquals("O tipo de serviço deve ter no máximo 80 caracteres.",
                reprovar(conclusao(tipo + "X", descricao, null, null)));
        assertEquals("A descrição do serviço executado deve ter no máximo 4000 caracteres.",
                reprovar(conclusao(tipo, descricao + "X", null, null)));
    }

    @Test
    void rejeitaExecucaoFuturaSemFusoOuComDataInvalida() {
        for (String data : List.of(
                "2026-11-20T15:00:01Z", "2026-11-20T12:00:01-03:00",
                "2026-11-20T12:00:00", "2026-11-20", "", "   ",
                "2026-02-30T12:00:00Z", "0000-01-01T00:00:00Z",
                "+10000-01-01T00:00:00Z")) {
            reprovar(conclusao("Poda", "Serviço executado.", data, null));
        }
        assertEquals(AGORA,
                aprovarConclusao(conclusao("Poda", "Serviço executado.", "2026-11-20T12:00:00-03:00", null)).dataExecucao());
    }

    @Test
    void aceitaSomenteReferenciasHttpOuHttpsAbsolutasSemCredenciais() {
        for (String foto : List.of(
                "javascript:alert(1)", "data:image/png;base64,AAAA", "file:///tmp/foto.png",
                "ftp://example.org/foto.jpg", "/foto.jpg", "//example.org/foto.jpg",
                "https:///foto.jpg", "https://usuario:senha@example.org/foto.jpg",
                "https://example.org/foto com espaco.jpg", "")) {
            reprovar(conclusao("Poda", "Serviço executado.", null, List.of(foto)));
        }
        var fotos = List.of("https://example.org/foto.jpg?versao=2", "http://example.org/foto-2.jpg");
        assertEquals(fotos, aprovarConclusao(conclusao("Poda", "Serviço executado.", null, fotos)).fotos());
    }

    @Test
    void limitaQuantidadeETamanhoDasReferenciasERejeitaEntradasNulas() {
        List<String> dezFotos = new ArrayList<>();
        for (int i = 0; i < 10; i++) dezFotos.add("https://example.org/foto-" + i + ".jpg");
        assertEquals(10, aprovarConclusao(conclusao("Poda", "Serviço executado.", null, dezFotos)).fotos().size());
        dezFotos.add("https://example.org/foto-10.jpg");
        assertEquals("Informe no máximo 10 referências de fotos.",
                reprovar(conclusao("Poda", "Serviço executado.", null, dezFotos)));

        String prefixo = "https://example.org/";
        String referenciaLimite = prefixo + "a".repeat(2048 - prefixo.length());
        assertEquals(referenciaLimite,
                aprovarConclusao(conclusao("Poda", "Serviço executado.", null, List.of(referenciaLimite))).fotos().get(0));
        assertEquals("Cada referência de foto deve ter no máximo 2048 caracteres.",
                reprovar(conclusao("Poda", "Serviço executado.", null, List.of(referenciaLimite + "a"))));
        assertEquals("As referências de fotos não podem estar vazias.",
                reprovar(conclusao("Poda", "Serviço executado.", null, Arrays.asList((String) null))));
    }

    @Test
    void mantemCopiaImutavelDasFotosDepoisDaValidacao() {
        List<String> fotos = new ArrayList<>(List.of("https://example.org/foto.jpg"));
        var pedido = conclusao("Poda", "Serviço executado.", null, fotos);
        fotos.clear();
        pedido.getFotos().clear();
        var dados = aprovarConclusao(pedido);
        assertEquals(List.of("https://example.org/foto.jpg"), dados.fotos());
        assertThrows(UnsupportedOperationException.class,
                () -> dados.fotos().add("https://example.org/outra.jpg"));
    }

    @Test
    void exigeCorpoEIdentificadorDaEquipe() {
        assertEquals("Selecione uma equipe para a ordem de serviço.",
                reprovar(PedidoDeValidacaoOrdemDeServico.semDados(Operacao.ATRIBUICAO_EQUIPE, null)));
        for (String valor : Arrays.asList(null, "", "   ", "abc", "00000000000000000000001",
                "0000000000000000000000011", "zzzzzzzzzzzzzzzzzzzzzzzz")) {
            reprovar(PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe(valor));
        }
    }

    @Test
    void converteSomenteObjectIdValidoSemConfundirComCodigoDeExibicao() {
        String id = "6ae666a7680e8a4330a1ab66";
        var pedido = PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe("  " + id.toUpperCase(java.util.Locale.ROOT) + "  ");
        var resultado = aprovar(pedido);
        assertEquals(id, resultado.getEquipeId());
        assertNull(resultado.getCadastro());
        assertNull(resultado.getConclusao());
        assertNull(resultado.getMotivoCancelamento());
        assertEquals("O identificador da equipe é inválido.",
                reprovar(PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe("EQ020261")));
    }

    @Test
    void cancelamentoExigeMotivoMesmoQuandoNaoHaCorpoOuSoHaEspacos() {
        String mensagem = "O motivo do cancelamento deve ser informado.";
        assertEquals(mensagem, reprovar(PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CANCELAMENTO, null)));
        for (String vazio : Arrays.asList(null, "", "   ", "\n\t", "\u2003\n", "\u00A0", "\uFEFF\u00A0\t\u202F")) {
            assertEquals(mensagem, reprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(vazio)));
        }
    }

    @Test
    void cancelamentoNormalizaSomenteEspacosExternosEPreservaTextoEAcentos() {
        String motivo = "Solicitação duplicada.\nMantida a ordem original <OS-123> & sua descrição.";
        var pedido = PedidoDeValidacaoOrdemDeServico.cancelamento("\uFEFF\u00A0\u2003  " + motivo + " \t\n\u202F");
        var resultado = aprovar(pedido);
        assertEquals(motivo, resultado.getMotivoCancelamento());
        assertNull(resultado.getCadastro());
        assertNull(resultado.getConclusao());
        assertNull(resultado.getEquipeId());
        assertEquals("<script>alert('texto');</script>", aprovar(
                PedidoDeValidacaoOrdemDeServico.cancelamento("<script>alert('texto');</script>"))
                .getMotivoCancelamento(), "O transporte preserva texto; a apresentação deve escapá-lo.");
    }

    @Test
    void cancelamentoAceitaLimitesERejeitaExcessoSemTruncar() {
        assertEquals("X", aprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(" X ")).getMotivoCancelamento());
        String limite = "á".repeat(1000);
        assertEquals(limite, aprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(" " + limite + " "))
                .getMotivoCancelamento());
        String mensagem = "O motivo do cancelamento deve ter no máximo 1000 caracteres.";
        assertEquals(mensagem, reprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(limite + "X")));
        String emojisNoLimite = "\uD83C\uDF33".repeat(500);
        assertEquals(emojisNoLimite, aprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(emojisNoLimite))
                .getMotivoCancelamento());
        assertEquals(mensagem, reprovar(PedidoDeValidacaoOrdemDeServico.cancelamento(emojisNoLimite + "X")));
    }

    private static PedidoDeValidacaoOrdemDeServico cadastro(String arvore, String ocorrencia,
            String equipe, String titulo, String descricao, String prioridade, String observacoes) {
        return PedidoDeValidacaoOrdemDeServico.cadastro(arvore, ocorrencia, equipe,
                titulo, descricao, prioridade, observacoes);
    }

    private static PedidoDeValidacaoOrdemDeServico conclusao(String tipo, String descricao,
            String dataExecucao, List<String> fotos) {
        return PedidoDeValidacaoOrdemDeServico.conclusao(tipo, descricao, dataExecucao, fotos, AGORA);
    }

    private static ResultadoValidacaoOrdemDeServico aprovar(PedidoDeValidacaoOrdemDeServico pedido) {
        var resultado = ValidadorOrdemDeServico.validar(pedido);
        assertTrue(resultado.isValido(), resultado.getErro());
        assertEquals(pedido.getRequisicaoId(), resultado.getRequisicaoId());
        assertEquals(pedido.getOperacao(), resultado.getOperacao());
        assertNull(resultado.getErro());
        return resultado;
    }

    private static CadastroValidado aprovarCadastro(PedidoDeValidacaoOrdemDeServico pedido) {
        var resultado = aprovar(pedido);
        assertNotNull(resultado.getCadastro());
        assertNull(resultado.getConclusao());
        assertNull(resultado.getEquipeId());
        assertNull(resultado.getMotivoCancelamento());
        return resultado.getCadastro();
    }

    private static ConclusaoValidada aprovarConclusao(PedidoDeValidacaoOrdemDeServico pedido) {
        var resultado = aprovar(pedido);
        assertNotNull(resultado.getConclusao());
        assertNull(resultado.getCadastro());
        assertNull(resultado.getEquipeId());
        assertNull(resultado.getMotivoCancelamento());
        return resultado.getConclusao();
    }

    private static String reprovar(PedidoDeValidacaoOrdemDeServico pedido) {
        var resultado = ValidadorOrdemDeServico.validar(pedido);
        assertFalse(resultado.isValido());
        assertNotNull(resultado.getErro());
        assertFalse(resultado.getErro().isBlank());
        assertNull(resultado.getCadastro());
        assertNull(resultado.getConclusao());
        assertNull(resultado.getEquipeId());
        assertNull(resultado.getMotivoCancelamento());
        assertEquals(pedido == null ? null : pedido.getRequisicaoId(), resultado.getRequisicaoId());
        assertEquals(pedido == null ? null : pedido.getOperacao(), resultado.getOperacao());
        return resultado.getErro();
    }
}
