import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeout;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.EOFException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;

import protocolo.Comunicado;
import protocolo.PedidoDeValidacaoArvore;
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.PedidoParaSair;
import protocolo.ResultadoValidacaoArvore;
import protocolo.ResultadoValidacaoOrdemDeServico;
import service.ConexaoServidor;
import service.ValidacaoOrdemDeServicoIndisponivelException;

/**
 * Exercita o cliente e o despachante Socket de produção em uma porta efêmera.
 * Não usa MongoDB, processos iniciados manualmente nem o servidor da aplicação.
 * @author Marialvo Corrêa de Freitas Junior
 */
@Timeout(value = 20, unit = TimeUnit.SECONDS)
class OrdemDeServicoSocketTest {
    private static final String ARVORE = "200000000000000000000001";
    private static final String EQUIPE = "300000000000000000000001";
    private static final Instant AGORA = Instant.parse("2026-11-20T15:00:00Z");

    @Test
    void cadastroAprovadoENegadoPercorremOServidorReal() throws Exception {
        try (ServidorDeTeste servidor = new ServidorDeTeste()) {
            ConexaoServidor cliente = servidor.conectar();
            PedidoDeValidacaoOrdemDeServico pedido = cadastro("  Inspeção solicitada  ");
            ResultadoValidacaoOrdemDeServico resultado = cliente.validarOrdemDeServico(pedido);

            assertTrue(resultado.isValido());
            assertEquals(pedido.getRequisicaoId(), resultado.getRequisicaoId());
            assertEquals(pedido.getOperacao(), resultado.getOperacao());
            assertEquals(ARVORE, resultado.getCadastro().arvoreId());
            assertEquals("Inspeção solicitada", resultado.getCadastro().titulo());
            assertEquals("Descrição final editada.", resultado.getCadastro().descricao());
            assertNull(resultado.getCadastro().ocorrenciaId());

            ResultadoValidacaoOrdemDeServico negado = cliente.validarOrdemDeServico(cadastro("   "));
            assertFalse(negado.isValido());
            assertNotNull(negado.getErro());
            assertTrue(negado.getErro().contains("título"));
            assertNull(negado.getCadastro());
            assertNotNull(cliente.getParceiro(), "Reprovação de dados não é falha da conexão.");
            assertTrue(cliente.validarOrdemDeServico(cadastro("Nova tentativa corrigida")).isValido());
        }
    }

    @Test
    void conclusaoAprovadaENegadaPercorremOServidorReal() throws Exception {
        try (ServidorDeTeste servidor = new ServidorDeTeste()) {
            ConexaoServidor cliente = servidor.conectar();
            PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.conclusao(
                    "  Inspeção  ", "  Serviço executado.  ", "2026-11-20T11:30:00-03:00",
                    List.of("  https://example.org/foto.jpg  "), AGORA);
            ResultadoValidacaoOrdemDeServico resultado = cliente.validarOrdemDeServico(pedido);

            assertTrue(resultado.isValido());
            assertEquals(pedido.getRequisicaoId(), resultado.getRequisicaoId());
            assertEquals("Inspeção", resultado.getConclusao().tipo());
            assertEquals("Serviço executado.", resultado.getConclusao().descricao());
            assertEquals(Instant.parse("2026-11-20T14:30:00Z"), resultado.getConclusao().dataExecucao());
            assertEquals(List.of("https://example.org/foto.jpg"), resultado.getConclusao().fotos());

            ResultadoValidacaoOrdemDeServico negado = cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.conclusao("Poda", "Serviço executado.",
                            "2026-11-20T15:00:01Z", List.of(), AGORA));
            assertFalse(negado.isValido());
            assertTrue(negado.getErro().contains("futuro"));
            assertNull(negado.getConclusao());
            assertNotNull(cliente.getParceiro());
        }
    }

    @Test
    void atribuicaoAprovadaENegadaPercorremOServidorReal() throws Exception {
        try (ServidorDeTeste servidor = new ServidorDeTeste()) {
            ConexaoServidor cliente = servidor.conectar();
            PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe(
                    "  " + EQUIPE + "  ");
            ResultadoValidacaoOrdemDeServico resultado = cliente.validarOrdemDeServico(pedido);

            assertTrue(resultado.isValido());
            assertEquals(pedido.getRequisicaoId(), resultado.getRequisicaoId());
            assertEquals(EQUIPE, resultado.getEquipeId());

            ResultadoValidacaoOrdemDeServico negado = cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe("EQ020261"));
            assertFalse(negado.isValido());
            assertTrue(negado.getErro().contains("inválido"));
            assertNull(negado.getEquipeId());
            assertNotNull(cliente.getParceiro());
        }
    }

    @Test
    void cancelamentoComMotivoERejeicaoPercorremOServidorReal() throws Exception {
        try (ServidorDeTeste servidor = new ServidorDeTeste()) {
            ConexaoServidor cliente = servidor.conectar();
            PedidoDeValidacaoOrdemDeServico pedido = PedidoDeValidacaoOrdemDeServico.cancelamento(
                    "  Solicitação duplicada.\nMantida a ordem original.  ");
            ResultadoValidacaoOrdemDeServico resultado = cliente.validarOrdemDeServico(pedido);
            assertTrue(resultado.isValido());
            assertEquals(pedido.getRequisicaoId(), resultado.getRequisicaoId());
            assertEquals(pedido.getOperacao(), resultado.getOperacao());
            assertEquals("Solicitação duplicada.\nMantida a ordem original.", resultado.getMotivoCancelamento());
            assertNull(resultado.getCadastro());
            assertNull(resultado.getConclusao());
            assertNull(resultado.getEquipeId());

            ResultadoValidacaoOrdemDeServico negado = cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.cancelamento(" \n\t"));
            assertFalse(negado.isValido());
            assertEquals("O motivo do cancelamento deve ser informado.", negado.getErro());
            assertNull(negado.getMotivoCancelamento());
            assertNotNull(cliente.getParceiro(), "Reprovação de conteúdo mantém a conexão utilizável.");
            assertTrue(cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.cancelamento("Motivo corrigido")).isValido());
        }
    }

    @Test
    void mesmaConexaoPreservaDespachoDeArvoreCadastroDeContaEOrdens() throws Exception {
        try (ServidorDeTeste servidor = new ServidorDeTeste()) {
            ConexaoServidor cliente = servidor.conectar();
            assertTrue(cliente.validarArvore(new PedidoDeValidacaoArvore(-22.9, -47.0, 5.0, 30.0)).isValido());
            assertTrue(cliente.validarOrdemDeServico(cadastro("Inspeção")).isValido());
            assertTrue(cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.cancelamento("Solicitação duplicada")).isValido());
            assertFalse(cliente.validarArvore(new PedidoDeValidacaoArvore(91.0, -47.0, 5.0, 30.0)).isValido());

            PedidoDeValidacaoCadastro conta = new PedidoDeValidacaoCadastro(
                    "CIDADAO", "Teste Socket", "socket@example.org", "19999999999",
                    "campinas", "SenhaTeste123", "SenhaTeste123", null, null, null, false, null);
            assertTrue(cliente.validarCadastro(conta).isValido());
            // Um pedido novo evita que o cache de serialização reutilize o objeto anterior.
            PedidoDeValidacaoCadastro contaInvalida = new PedidoDeValidacaoCadastro(
                    "CIDADAO", null, "socket@example.org", "19999999999",
                    "campinas", "SenhaTeste123", "SenhaTeste123", null, null, null, false, null);
            assertFalse(cliente.validarCadastro(contaInvalida).isValido());
            assertTrue(cliente.validarOrdemDeServico(
                    PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe(EQUIPE)).isValido());
        }
    }

    @Test
    void respostaDeOutroTipoFechaConexaoEDisparaErroDeIndisponibilidade() throws Exception {
        verificarFalhaDeComunicacao(ModoDoPar.OUTRO_TIPO);
    }

    @Test
    void respostaDeOutraRequisicaoFechaConexaoEDisparaErroDeIndisponibilidade() throws Exception {
        verificarFalhaDeComunicacao(ModoDoPar.OUTRA_REQUISICAO);
    }

    @Test
    void cancelamentoAprovadoSemMotivoOuComDadosDeOutraOperacaoFechaConexao() throws Exception {
        verificarFalhaDeComunicacao(ModoDoPar.CANCELAMENTO_SEM_MOTIVO);
        verificarFalhaDeComunicacao(ModoDoPar.CANCELAMENTO_COM_EQUIPE);
    }

    @Test
    void servidorQueNaoRespondeProvocaTimeoutEFechamentoDaConexao() throws Exception {
        verificarFalhaDeComunicacao(ModoDoPar.SEM_RESPOSTA);
    }

    @Test
    void clienteSemConexaoFalhaRapidamenteComExcecaoEspecifica() {
        ConexaoServidor cliente = new ConexaoServidor("127.0.0.1", 1);
        try {
            assertTimeout(Duration.ofSeconds(1), () -> assertThrows(
                    ValidacaoOrdemDeServicoIndisponivelException.class,
                    () -> cliente.validarOrdemDeServico(cadastro("Inspeção"))));
            assertNull(cliente.getParceiro());
        } finally {
            cliente.fechar();
        }
    }

    private static PedidoDeValidacaoOrdemDeServico cadastro(String titulo) {
        return PedidoDeValidacaoOrdemDeServico.cadastro(ARVORE, null, null,
                titulo, "  Descrição final editada.  ", null, null);
    }

    private enum ModoDoPar {
        OUTRO_TIPO, OUTRA_REQUISICAO, SEM_RESPOSTA, CANCELAMENTO_SEM_MOTIVO, CANCELAMENTO_COM_EQUIPE
    }

    /** Somente os testes de protocolo usam um par incompatível, não um validador simulado. */
    private static void verificarFalhaDeComunicacao(ModoDoPar modo) throws Exception {
        try (ServerSocket listener = novoListener()) {
            CompletableFuture<Socket> aceito = new CompletableFuture<>();
            CompletableFuture<Void> clienteEncerrou = new CompletableFuture<>();
            Thread parIncompativel = new Thread(() -> {
                try (Socket socket = listener.accept()) {
                    aceito.complete(socket);
                    // No caso sem resposta, o timeout do cliente (5 s) deve ocorrer primeiro.
                    socket.setSoTimeout(modo == ModoDoPar.SEM_RESPOSTA ? 10000 : 3000);
                    ObjectOutputStream saida = new ObjectOutputStream(socket.getOutputStream());
                    saida.flush();
                    ObjectInputStream entrada = new ObjectInputStream(socket.getInputStream());
                    Object recebido = entrada.readObject();
                    if (!(recebido instanceof PedidoDeValidacaoOrdemDeServico pedido))
                        throw new AssertionError("O cliente deve enviar o pedido de OS de produção.");

                    if (modo != ModoDoPar.SEM_RESPOSTA) {
                        Comunicado resposta;
                        if (modo == ModoDoPar.CANCELAMENTO_SEM_MOTIVO || modo == ModoDoPar.CANCELAMENTO_COM_EQUIPE) {
                            var incompleta = ResultadoValidacaoOrdemDeServico.cancelamentoAprovado(pedido, "Duplicada");
                            // Simula um par antigo ou defeituoso que envia uma resposta de conteúdo incompatível.
                            var campo = ResultadoValidacaoOrdemDeServico.class.getDeclaredField(
                                    modo == ModoDoPar.CANCELAMENTO_SEM_MOTIVO ? "motivoCancelamento" : "equipeId");
                            campo.setAccessible(true);
                            campo.set(incompleta, modo == ModoDoPar.CANCELAMENTO_SEM_MOTIVO ? null : EQUIPE);
                            resposta = incompleta;
                        } else {
                            resposta = modo == ModoDoPar.OUTRA_REQUISICAO
                                    ? ResultadoValidacaoOrdemDeServico.reprovado(cadastro("Outra requisição"), "Reprovada.")
                                    : new ResultadoValidacaoArvore(true, List.of());
                        }
                        saida.writeObject(resposta);
                        saida.flush();
                    }
                    try {
                        entrada.readObject();
                        throw new AssertionError("O cliente deveria fechar o Socket após falha de protocolo ou timeout.");
                    } catch (EOFException | SocketException encerrado) {
                        clienteEncerrou.complete(null);
                    }
                } catch (Throwable erro) {
                    aceito.completeExceptionally(erro);
                    clienteEncerrou.completeExceptionally(erro);
                }
            }, "teste-os-par-incompativel");
            parIncompativel.setDaemon(true);
            parIncompativel.start();
            ConexaoServidor cliente = new ConexaoServidor("127.0.0.1", listener.getLocalPort());
            try {
                assertTrue(cliente.conectar());
                long inicio = System.nanoTime();
                PedidoDeValidacaoOrdemDeServico pedido = modo == ModoDoPar.CANCELAMENTO_SEM_MOTIVO
                        || modo == ModoDoPar.CANCELAMENTO_COM_EQUIPE
                        ? PedidoDeValidacaoOrdemDeServico.cancelamento("Duplicada") : cadastro("Inspeção");
                assertTimeout(Duration.ofSeconds(8), () -> assertThrows(
                        ValidacaoOrdemDeServicoIndisponivelException.class,
                        () -> cliente.validarOrdemDeServico(pedido)));
                if (modo == ModoDoPar.SEM_RESPOSTA) {
                    assertTrue(System.nanoTime() - inicio >= TimeUnit.SECONDS.toNanos(4),
                            "A falha deve ocorrer após a espera real pela resposta, não por desconexão imediata.");
                }
                assertNull(cliente.getParceiro(), "A conexão incompatível não pode continuar disponível.");
                clienteEncerrou.get(4, TimeUnit.SECONDS);
            } finally {
                cliente.fechar();
                listener.close();
                if (aceito.isDone() && !aceito.isCompletedExceptionally()) aceito.get().close();
                parIncompativel.join(2000);
                assertFalse(parIncompativel.isAlive(), "O par de teste deve encerrar.");
            }
        }
    }

    private static ServerSocket novoListener() throws Exception {
        return new ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"));
    }

    private static final class ServidorDeTeste implements AutoCloseable {
        private final ServerSocket listener;
        private final CompletableFuture<SupervisoraDeConexao> supervisora = new CompletableFuture<>();
        private final Thread aceitadora;
        private volatile Socket socket;
        private ConexaoServidor cliente;

        private ServidorDeTeste() throws Exception {
            listener = novoListener();
            aceitadora = new Thread(() -> {
                try {
                    socket = listener.accept();
                    SupervisoraDeConexao real = new SupervisoraDeConexao(socket, new ArrayList<>());
                    real.setDaemon(true);
                    real.start();
                    supervisora.complete(real);
                } catch (Throwable erro) {
                    supervisora.completeExceptionally(erro);
                }
            }, "teste-os-aceitadora");
            aceitadora.setDaemon(true);
            aceitadora.start();
        }

        private ConexaoServidor conectar() throws Exception {
            cliente = new ConexaoServidor("127.0.0.1", listener.getLocalPort());
            assertTrue(cliente.conectar(), "A porta efêmera do servidor de teste deve aceitar a conexão.");
            supervisora.get(3, TimeUnit.SECONDS);
            return cliente;
        }

        @Override
        public void close() throws Exception {
            try {
                if (cliente != null && cliente.getParceiro() != null) {
                    cliente.getParceiro().receba(new PedidoParaSair());
                    if (supervisora.isDone() && !supervisora.isCompletedExceptionally())
                        supervisora.get().join(2000);
                }
            } finally {
                if (cliente != null) cliente.fechar();
                listener.close();
                if (socket != null) socket.close();
                aceitadora.join(2000);
                assertFalse(aceitadora.isAlive(), "A aceitadora de teste deve encerrar.");
                if (supervisora.isDone() && !supervisora.isCompletedExceptionally()) {
                    Thread real = supervisora.get();
                    real.join(2000);
                    assertFalse(real.isAlive(), "A SupervisoraDeConexao de produção deve encerrar.");
                }
            }
        }
    }
}
