// Autor: Carlos Luciano

package testeInterclasseServidor;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

import protocolo.Comunicado;
import protocolo.Parceiro;
import protocolo.PedidoDeValidacaoArvore;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.PedidoDeValidacaoOrdemDeServico.Operacao;
import protocolo.PedidoParaSair;
import protocolo.ResultadoValidacaoArvore;
import protocolo.ResultadoValidacaoOrdemDeServico;

/**
 * Suíte de testes INTERCLASSE (Integração) em JUnit 5.
 * Simula o funcionamento real do serviço principal do servidor (SupervisoraDeConexao)
 * recebendo conexões TCP via Socket, deserializando objetos Comunicado pelo Parceiro,
 * acionando os validadores de domínio (ValidadorOrdemDeServico e ValidadorArvore)
 * e devolvendo os resultados serializados ao cliente.
 */
public class TesteInterclasseServidor {

    /**
     * Instancia e inicia SupervisoraDeConexao (definida no pacote default do servidor)
     * via Reflection para manter a organização de pacotes dos testes.
     */
    private void iniciarSupervisora(Socket conexao, ArrayList<Parceiro> usuarios) throws Exception {
        Class<?> clazz = Class.forName("SupervisoraDeConexao");
        Thread supervisora = (Thread) clazz
                .getConstructor(Socket.class, ArrayList.class)
                .newInstance(conexao, usuarios);
        supervisora.start();
    }

    // CENÁRIO NORMAL: Fluxos completos aprovados via Socket TCP

    @Test
    public void testCenarioNormal_ValidacaoOrdemDeServicoAprovadaViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoOrdemDeServico pedidoOS = PedidoDeValidacaoOrdemDeServico.cadastro(
                        "507f1f77bcf86cd799439011",
                        "507f1f77bcf86cd799439012",
                        null,
                        "Poda de galhos baixos",
                        "Galhos obstruindo sinalizacao viaria",
                        "MEDIA",
                        "Realizar em horario comercial"
                );
                cliente.receba(pedidoOS);

                Comunicado resposta = cliente.envie();
                assertInstanceOf(ResultadoValidacaoOrdemDeServico.class, resposta);

                ResultadoValidacaoOrdemDeServico resultado = (ResultadoValidacaoOrdemDeServico) resposta;
                assertTrue(resultado.isValido(), "A OS válida deve ser aprovada pelo servidor.");
                assertEquals(Operacao.CADASTRO, resultado.getOperacao());
                assertEquals(pedidoOS.getRequisicaoId(), resultado.getRequisicaoId());
                assertNotNull(resultado.getCadastro());
                assertNull(resultado.getErro());

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }

    @Test
    public void testCenarioNormal_ValidacaoArvoreAprovadaViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoArvore pedidoArvore =
                        new PedidoDeValidacaoArvore(-22.8858, -47.2111, 8.5, 32.0);
                cliente.receba(pedidoArvore);

                Comunicado resposta = cliente.envie();
                assertInstanceOf(ResultadoValidacaoArvore.class, resposta);

                ResultadoValidacaoArvore resultado = (ResultadoValidacaoArvore) resposta;
                assertTrue(resultado.isValido(), "Dados válidos da árvore devem ser aprovados.");
                assertTrue(resultado.getErros().isEmpty());

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }

    // CENÁRIO ALTERNATIVO / DE ERRO: Rejeição controlada de dados inválidos

    @Test
    public void testCenarioErro_ValidacaoOrdemDeServicoReprovadaViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoOrdemDeServico pedidoInvalido = PedidoDeValidacaoOrdemDeServico.cadastro(
                        "id-invalido-123",
                        null,
                        null,
                        "Remocao de toco",
                        "Toco na calcada",
                        "BAIXA",
                        null
                );
                cliente.receba(pedidoInvalido);

                Comunicado resposta = cliente.envie();
                assertInstanceOf(ResultadoValidacaoOrdemDeServico.class, resposta);

                ResultadoValidacaoOrdemDeServico resultado = (ResultadoValidacaoOrdemDeServico) resposta;
                assertFalse(resultado.isValido(), "OS com arvoreId inválido deve ser reprovada.");
                assertEquals(pedidoInvalido.getRequisicaoId(), resultado.getRequisicaoId());
                assertEquals("O identificador da árvore é inválido.", resultado.getErro());

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }

    @Test
    public void testCenarioErro_ValidacaoArvoreReprovadaViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoArvore pedidoInvalido =
                        new PedidoDeValidacaoArvore(120.0, -200.0, -3.0, 25.0);
                cliente.receba(pedidoInvalido);

                Comunicado resposta = cliente.envie();
                assertInstanceOf(ResultadoValidacaoArvore.class, resposta);

                ResultadoValidacaoArvore resultado = (ResultadoValidacaoArvore) resposta;
                assertFalse(resultado.isValido(), "Árvore com dados inválidos deve ser reprovada.");
                assertEquals(2, resultado.getErros().size(), "Deve acumular os 2 erros de validação.");

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }

    // TESTES COMPLEXOS INTERCLASSE: Rajada na mesma sessão e Concorrência TCP

    @Test
    public void testCenarioComplexo_RajadaSequencialMistaNaMesmaConexao() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                // 1. Árvore válida
                cliente.receba(new PedidoDeValidacaoArvore(-22.90, -47.06, 10.0, 40.0));
                ResultadoValidacaoArvore r1 = (ResultadoValidacaoArvore) cliente.envie();
                assertTrue(r1.isValido());

                // 2. Cadastro OS inválido (título em branco) -> não deve derrubar a conexão
                cliente.receba(PedidoDeValidacaoOrdemDeServico.cadastro(
                        "507f1f77bcf86cd799439011", null, null, "   ", "Desc", "ALTA", null));
                ResultadoValidacaoOrdemDeServico r2 = (ResultadoValidacaoOrdemDeServico) cliente.envie();
                assertFalse(r2.isValido());
                assertEquals("O título deve ser informado.", r2.getErro());

                // 3. Atribuição de equipe válida na mesma sessão
                cliente.receba(PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe("507f1f77bcf86cd799439013"));
                ResultadoValidacaoOrdemDeServico r3 = (ResultadoValidacaoOrdemDeServico) cliente.envie();
                assertTrue(r3.isValido());
                assertEquals("507f1f77bcf86cd799439013", r3.getEquipeId());

                // 4. Encerramento limpo
                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }

            Thread.sleep(100);
            synchronized (usuarios) {
                assertTrue(usuarios.isEmpty(), "A lista de usuários ativos deve ficar vazia após PedidoParaSair.");
            }
        }
    }

    @Test
    public void testCenarioComplexo_MultiplosClientesConcorrentes() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();
        int qtdClientes = 5;

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    for (int i = 0; i < qtdClientes; i++) {
                        Socket conexao = servidorTeste.accept();
                        iniciarSupervisora(conexao, usuarios);
                    }
                } catch (Exception ignored) {
                }
            });
            threadAceitadora.start();

            List<Thread> clientesThreads = new ArrayList<>();
            List<Throwable> errosConcorrencia = new ArrayList<>();

            for (int i = 0; i < qtdClientes; i++) {
                final int indice = i;
                Thread tCliente = new Thread(() -> {
                    try (Socket socket = new Socket("127.0.0.1", porta)) {
                        ObjectOutputStream out = new ObjectOutputStream(socket.getOutputStream());
                        ObjectInputStream in = new ObjectInputStream(socket.getInputStream());
                        Parceiro cliente = new Parceiro(socket, in, out);

                        PedidoDeValidacaoOrdemDeServico pedido =
                                PedidoDeValidacaoOrdemDeServico.cancelamento("Cancelamento concorrente #" + indice);
                        cliente.receba(pedido);

                        ResultadoValidacaoOrdemDeServico res =
                                (ResultadoValidacaoOrdemDeServico) cliente.envie();

                        assertTrue(res.isValido());
                        assertEquals(pedido.getRequisicaoId(), res.getRequisicaoId());
                        assertEquals("Cancelamento concorrente #" + indice, res.getMotivoCancelamento());

                        cliente.receba(new PedidoParaSair());
                        cliente.adeus();
                    } catch (Throwable t) {
                        synchronized (errosConcorrencia) {
                            errosConcorrencia.add(t);
                        }
                    }
                });
                clientesThreads.add(tCliente);
                tCliente.start();
            }

            for (Thread t : clientesThreads) {
                t.join(5000);
            }

            assertTrue(errosConcorrencia.isEmpty(), "Nenhum cliente concorrente deve falhar: " + errosConcorrencia);
        }
    }

    /**
     * Subclasse fictícia de Comunicado para simular uma mensagem não suportada
     * enviada pelo cliente ao servidor Socket.
     */
    private static class ComunicadoDesconhecido extends Comunicado {
        private static final long serialVersionUID = 1L;
    }

    /**
     * Teste 7 - Falha de Protocolo (Comunicado desconhecido sem resposta):
     * Envia um Comunicado não mapeado na cadeia de instanceof de SupervisoraDeConexao.
     * FALHA ESPERADA: O servidor ignora a mensagem sem responder, causando
     * SocketTimeoutException no cliente ao aguardar retorno em cliente.envie().
     */
    @Test
    public void testFalhaIntegracao_ComunicadoDesconhecidoSemResposta() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                // Define timeout de 500ms para não travar a suíte caso o servidor não responda
                socketCliente.setSoTimeout(500);

                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                cliente.receba(new ComunicadoDesconhecido());

                // Espera-se que o servidor devolva alguma resposta de erro, mas ocorre timeout
                assertDoesNotThrow(() -> {
                    Comunicado resposta = cliente.envie();
                    assertNotNull(resposta, "O servidor deveria responder mesmo para comunicados desconhecidos.");
                }, "Falha: SupervisoraDeConexao ignorou o Comunicado desconhecido e deixou o cliente em timeout.");
            }
        }
    }

    /**
     * Teste 8 - Falha de Domínio Integrado (OS Conclusão com tipo de serviço inválido via Socket):
     * Envia pelo socket uma conclusão de OS com tipo = "TIPO_SERVICO_INEXISTENTE".
     * FALHA ESPERADA: O servidor aprova a conclusão porque ValidadorOrdemDeServico
     * verifica apenas se o texto tem até 80 caracteres, sem validar o domínio do tipo de serviço.
     */
    @Test
    public void testFalhaIntegracao_ConclusaoComTipoServicoInvalidoViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoOrdemDeServico pedidoInvalido = PedidoDeValidacaoOrdemDeServico.conclusao(
                        "TIPO_SERVICO_INEXISTENTE",
                        "Serviço concluído",
                        "2026-11-21T10:00:00-03:00",
                        List.of("https://storage.arboriza.gov.br/foto.jpg"),
                        java.time.Instant.parse("2026-11-21T15:00:00Z")
                );
                cliente.receba(pedidoInvalido);

                ResultadoValidacaoOrdemDeServico resultado =
                        (ResultadoValidacaoOrdemDeServico) cliente.envie();

                assertFalse(resultado.isValido(),
                        "Falha: O servidor aprovou um tipo de serviço fora do domínio permitido.");

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }

    /**
     * Teste 9 - Falha de Domínio Integrado (Árvore com altura e diâmetro zerados via Socket):
     * Envia pelo socket o cadastro de uma árvore com altura = 0.0 e diâmetro = 0.0.
     * FALHA ESPERADA: O servidor aprova o registro porque ValidadorArvore rejeita apenas
     * valores estritamente menores que zero (< 0).
     */
    @Test
    public void testFalhaIntegracao_ArvoreComMedidasZeradasViaSocket() throws Exception {
        ArrayList<Parceiro> usuarios = new ArrayList<>();

        try (ServerSocket servidorTeste = new ServerSocket(0)) {
            int porta = servidorTeste.getLocalPort();

            Thread threadAceitadora = new Thread(() -> {
                try {
                    Socket conexaoServidor = servidorTeste.accept();
                    iniciarSupervisora(conexaoServidor, usuarios);
                } catch (Exception e) {
                    fail("Falha ao iniciar SupervisoraDeConexao: " + e.getMessage());
                }
            });
            threadAceitadora.start();

            try (Socket socketCliente = new Socket("127.0.0.1", porta)) {
                ObjectOutputStream outCliente = new ObjectOutputStream(socketCliente.getOutputStream());
                ObjectInputStream inCliente = new ObjectInputStream(socketCliente.getInputStream());
                Parceiro cliente = new Parceiro(socketCliente, inCliente, outCliente);

                PedidoDeValidacaoArvore pedidoZerado =
                        new PedidoDeValidacaoArvore(-22.9056, -47.0608, 0.0, 0.0);
                cliente.receba(pedidoZerado);

                ResultadoValidacaoArvore resultado =
                        (ResultadoValidacaoArvore) cliente.envie();

                assertFalse(resultado.isValido(),
                        "Falha: O servidor aprovou uma árvore com altura 0.0m e diâmetro 0.0cm.");

                cliente.receba(new PedidoParaSair());
                cliente.adeus();
            }
        }
    }
}