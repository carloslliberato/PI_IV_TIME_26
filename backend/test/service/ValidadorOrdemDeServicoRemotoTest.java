package service;

import static org.junit.jupiter.api.Assertions.*;

import com.google.gson.Gson;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;
import dto.CadastroOrdemDeServicoDTO;
import dto.CancelamentoOrdemDeServicoDTO;
import dto.ConclusaoOrdemDeServicoDTO;
import java.time.Instant;
import java.util.List;
import java.util.function.Function;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico.CadastroValidado;
import protocolo.ResultadoValidacaoOrdemDeServico.ConclusaoValidada;

/** Confere o adaptador HTTP/protocolo sem abrir banco ou Socket.
 * A comunicação real é exercitada em OrdemDeServicoSocketTest, no módulo servidor.
 * @author Marialvo Corrêa de Freitas Junior
 */
class ValidadorOrdemDeServicoRemotoTest {
    private static final String ARVORE = "000000000000000000000001";
    private static final String OCORRENCIA = "000000000000000000000003";
    private static final String EQUIPE = "000000000000000000000004";
    private static final Instant AGORA = Instant.parse("2026-11-20T17:00:00Z");
    private final Gson gson = new Gson();

    @Test
    void cadastroEnviaDtoEUtilizaDadosNormalizadosDoServidor() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertEquals("  Título enviado  ", pedido.getTitulo());
            assertEquals(ARVORE, pedido.getArvoreId());
            assertNull(pedido.getOcorrenciaId());
            return ResultadoValidacaoOrdemDeServico.cadastroAprovado(pedido,
                    new CadastroValidado(ARVORE, null, "Título normalizado", "Descrição normalizada", null, null));
        });
        CadastroOrdemDeServicoDTO dto = gson.fromJson("""
                {"arvoreId":"000000000000000000000001","titulo":"  Título enviado  ","descricao":"Texto enviado"}
                """, CadastroOrdemDeServicoDTO.class);
        var resultado = new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto);
        assertEquals("Título normalizado", resultado.titulo());
        assertEquals("Descrição normalizada", resultado.descricao());
        assertEquals(1, conexao.chamadas);
    }

    @Test
    void cadastroDeOcorrenciaSemArvoreNaoFechaConexao() {
        ConexaoControlada conexao = new ConexaoControlada(pedido ->
                ResultadoValidacaoOrdemDeServico.cadastroAprovado(pedido,
                        new CadastroValidado(null, OCORRENCIA, "Atendimento", "Descrição", null, null)));
        CadastroOrdemDeServicoDTO dto = gson.fromJson(
                "{\"ocorrenciaId\":\"" + OCORRENCIA
                        + "\",\"titulo\":\"Atendimento\",\"descricao\":\"Descrição\"}",
                CadastroOrdemDeServicoDTO.class);

        var resultado = new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto);

        assertNull(resultado.arvoreId());
        assertEquals(OCORRENCIA, resultado.ocorrenciaId());
        assertFalse(conexao.fechada);
    }

    @Test
    void respostaSemArvoreNemOcorrenciaContinuaInvalida() {
        ConexaoControlada conexao = new ConexaoControlada(pedido ->
                ResultadoValidacaoOrdemDeServico.cadastroAprovado(pedido,
                        new CadastroValidado(null, null, "Título", "Descrição", null, null)));
        var dto = gson.fromJson(
                "{\"titulo\":\"Título\",\"descricao\":\"Descrição\"}",
                CadastroOrdemDeServicoDTO.class);

        assertThrows(ValidacaoOrdemDeServicoIndisponivelException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto));
        assertTrue(conexao.fechada);
    }

    @Test
    void conclusaoPreservaReferenciaTemporalEUsaResultadoRemoto() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertEquals(AGORA, pedido.getAgora());
            assertNull(pedido.getDataExecucao());
            assertEquals(" Inspeção ", pedido.getTipo());
            return ResultadoValidacaoOrdemDeServico.conclusaoAprovada(pedido,
                    new ConclusaoValidada("Inspeção", "Executado", AGORA, List.of("https://exemplo.com/foto.jpg")));
        });
        var dto = gson.fromJson("{\"tipo\":\" Inspeção \",\"descricao\":\" Executado \"}", ConclusaoOrdemDeServicoDTO.class);
        var resultado = new ValidadorOrdemDeServicoRemoto(conexao).prepararConclusao(dto, AGORA);
        assertEquals("Inspeção", resultado.tipo());
        assertEquals(AGORA, resultado.dataExecucao());
        assertEquals(List.of("https://exemplo.com/foto.jpg"), resultado.fotos());
    }

    @Test
    void equipeEnviaValorOriginalEConverteIdentificadorAprovado() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertEquals(" " + EQUIPE + " ", pedido.getEquipeId());
            return ResultadoValidacaoOrdemDeServico.equipeAprovada(pedido, EQUIPE);
        });
        var dto = gson.fromJson("{\"equipeId\":\" " + EQUIPE + " \"}", AtribuicaoEquipeOrdemDeServicoDTO.class);
        assertEquals(new ObjectId(EQUIPE), new ValidadorOrdemDeServicoRemoto(conexao).validarIdEquipe(dto));
    }

    @Test
    void rejeicaoRemotaMantemMensagemSemRepetirPedido() {
        ConexaoControlada conexao = new ConexaoControlada(pedido ->
                ResultadoValidacaoOrdemDeServico.reprovado(pedido, "O título deve ser informado."));
        var dto = gson.fromJson("{}", CadastroOrdemDeServicoDTO.class);
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto));
        assertEquals("O título deve ser informado.", erro.getMessage());
        assertEquals(1, conexao.chamadas);
        assertFalse(conexao.fechada);
    }

    @Test
    void corpoAusenteTambemEValidadoNoServidorNasQuatroOperacoes() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertFalse(pedido.isDadosPresentes());
            return ResultadoValidacaoOrdemDeServico.reprovado(pedido, "Dados ausentes.");
        });
        ValidadorOrdemDeServicoRemoto validador = new ValidadorOrdemDeServicoRemoto(conexao);
        assertThrows(IllegalArgumentException.class, () -> validador.prepararCadastro(null));
        assertThrows(IllegalArgumentException.class, () -> validador.prepararConclusao(null, AGORA));
        assertThrows(IllegalArgumentException.class, () -> validador.validarIdEquipe(null));
        assertThrows(IllegalArgumentException.class, () -> validador.validarCancelamento(null));
        assertEquals(4, conexao.chamadas);
    }

    @Test
    void indisponibilidadeInterrompeSemAprovacaoLocal() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            throw new ValidacaoOrdemDeServicoIndisponivelException(new IllegalStateException("Socket desligado"));
        });
        var dto = gson.fromJson("{}", CadastroOrdemDeServicoDTO.class);
        assertThrows(ValidacaoOrdemDeServicoIndisponivelException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto));
        assertEquals(1, conexao.chamadas);
    }

    @Test
    void respostaComIdentificadorInvalidoETratadaComoFalhaDeContrato() {
        ConexaoControlada conexao = new ConexaoControlada(pedido ->
                ResultadoValidacaoOrdemDeServico.cadastroAprovado(pedido,
                        new CadastroValidado("ARV-123", null, "Título", "Descrição", null, null)));
        var dto = gson.fromJson("{}", CadastroOrdemDeServicoDTO.class);
        assertThrows(ValidacaoOrdemDeServicoIndisponivelException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).prepararCadastro(dto));
        assertTrue(conexao.fechada);
    }

    @Test
    void cancelamentoEnviaMotivoOriginalEUtilizaOTextoNormalizadoDoServidor() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertEquals(PedidoDeValidacaoOrdemDeServico.Operacao.CANCELAMENTO, pedido.getOperacao());
            assertEquals("  Solicitação duplicada  ", pedido.getMotivoCancelamento());
            return ResultadoValidacaoOrdemDeServico.cancelamentoAprovado(pedido, "Solicitação duplicada");
        });
        var dto = gson.fromJson("{\"motivoCancelamento\":\"  Solicitação duplicada  \"}", CancelamentoOrdemDeServicoDTO.class);
        assertEquals("Solicitação duplicada", new ValidadorOrdemDeServicoRemoto(conexao).validarCancelamento(dto));
        assertEquals(1, conexao.chamadas);
    }

    @Test
    void cancelamentoReprovadoMantemErroRemotoENaoTentaValidacaoLocal() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            assertNull(pedido.getMotivoCancelamento());
            return ResultadoValidacaoOrdemDeServico.reprovado(pedido, "O motivo do cancelamento deve ser informado.");
        });
        var dto = gson.fromJson("{}", CancelamentoOrdemDeServicoDTO.class);
        IllegalArgumentException erro = assertThrows(IllegalArgumentException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).validarCancelamento(dto));
        assertEquals("O motivo do cancelamento deve ser informado.", erro.getMessage());
        assertEquals(1, conexao.chamadas);
        assertFalse(conexao.fechada);
    }

    @Test
    void cancelamentoComRespostaInvalidaBloqueiaOperacaoEFechaConexao() {
        var dto = gson.fromJson("{\"motivoCancelamento\":\"Duplicada\"}", CancelamentoOrdemDeServicoDTO.class);
        for (String invalido : List.of("", " \n\t", "\u00A0", "\uFEFF\u00A0\u202F", " Não normalizado ",
                "\u00A0Motivo\uFEFF", "X".repeat(1001))) {
            ConexaoControlada conexao = new ConexaoControlada(pedido ->
                    ResultadoValidacaoOrdemDeServico.cancelamentoAprovado(pedido, invalido));
            assertThrows(ValidacaoOrdemDeServicoIndisponivelException.class,
                    () -> new ValidadorOrdemDeServicoRemoto(conexao).validarCancelamento(dto));
            assertTrue(conexao.fechada);
            assertEquals(1, conexao.chamadas);
        }
    }

    @Test
    void cancelamentoIndisponivelInterrompeSemUsarMotivoLocalComoAprovacao() {
        ConexaoControlada conexao = new ConexaoControlada(pedido -> {
            throw new ValidacaoOrdemDeServicoIndisponivelException(new IllegalStateException("Socket desligado"));
        });
        var dto = gson.fromJson("{\"motivoCancelamento\":\"Duplicada\"}", CancelamentoOrdemDeServicoDTO.class);
        assertThrows(ValidacaoOrdemDeServicoIndisponivelException.class,
                () -> new ValidadorOrdemDeServicoRemoto(conexao).validarCancelamento(dto));
        assertEquals(1, conexao.chamadas);
    }

    private static class ConexaoControlada extends ConexaoServidor {
        private final Function<PedidoDeValidacaoOrdemDeServico, ResultadoValidacaoOrdemDeServico> responder;
        private int chamadas;
        private boolean fechada;

        ConexaoControlada(Function<PedidoDeValidacaoOrdemDeServico, ResultadoValidacaoOrdemDeServico> responder) {
            super("127.0.0.1", 0);
            this.responder = responder;
        }

        @Override
        public synchronized ResultadoValidacaoOrdemDeServico validarOrdemDeServico(PedidoDeValidacaoOrdemDeServico pedido) {
            chamadas++;
            return responder.apply(pedido);
        }

        @Override
        public void fechar() { fechada = true; }
    }
}
