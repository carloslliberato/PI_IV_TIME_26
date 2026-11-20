
package service;

import java.net.Socket;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import protocolo.Parceiro;
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;
import protocolo.PedidoDeValidacaoArvore;
import protocolo.ResultadoValidacaoArvore;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.Comunicado;

public class ConexaoServidor {

    private static final int TEMPO_RESPOSTA_OS_MS = 5000;

    private String host;
    private int porta;

    private Socket conexao;
    private ObjectOutputStream transmissor;
    private ObjectInputStream receptor;

    private Parceiro parceiro;

    public ConexaoServidor(String host, int porta) {
        this.host = host;
        this.porta = porta;
    }

    public boolean conectar() {

        try {
            conexao = new Socket(host, porta);

            transmissor = new ObjectOutputStream(
                    conexao.getOutputStream());

            receptor = new ObjectInputStream(
                    conexao.getInputStream());

            parceiro = new Parceiro(
                    conexao,
                    receptor,
                    transmissor);

            return true;

        } catch (Exception erro) {
            System.err.println(
                    "Não foi possível conectar ao servidor Socket: "
                            + erro.getMessage());

            fechar();
            return false;
        }
    }

    public void fechar() {

        try {
            if (receptor != null) {
                receptor.close();
                receptor = null;
            }
        } catch (Exception erro) {
            System.err.println(
                    "Erro ao fechar receptor: "
                            + erro.getMessage());
        }

        try {
            if (transmissor != null) {
                transmissor.close();
                transmissor = null;
            }
        } catch (Exception erro) {
            System.err.println(
                    "Erro ao fechar transmissor: "
                            + erro.getMessage());
        }

        boolean conexaoFechada = false;

        try {
            if (conexao != null) {
                conexao.close();
                conexao = null;
                conexaoFechada = true;
            }
        } catch (Exception erro) {
            System.err.println(
                    "Erro ao fechar Socket: "
                            + erro.getMessage());
        }

        parceiro = null;

        if (conexaoFechada) {
            System.out.println(
                    "Conexão com o servidor Socket encerrada!");
        }
    }

    public Parceiro getParceiro() {
        return parceiro;
    }

    public synchronized ResultadoValidacaoCadastro validarCadastro(
            PedidoDeValidacaoCadastro pedido) throws Exception {

        if (parceiro == null) {
            throw new Exception(
                    "Não existe conexão com o servidor Socket.");
        }

        parceiro.receba(pedido);

        Comunicado resposta = parceiro.envie();

        if (!(resposta instanceof ResultadoValidacaoCadastro)) {
            throw new Exception(
                    "Resposta inesperada do servidor.");
        }

        return (ResultadoValidacaoCadastro) resposta;
    }

    public synchronized ResultadoValidacaoArvore validarArvore(
            PedidoDeValidacaoArvore pedido) throws Exception {

        if (parceiro == null) {
            throw new Exception(
                    "Não existe conexão com o servidor Socket.");
        }

        parceiro.receba(pedido);

        Comunicado resposta = parceiro.envie();

        if (!(resposta instanceof ResultadoValidacaoArvore)) {
            throw new Exception(
                    "Resposta inesperada na validacao da arvore.");
        }

        return (ResultadoValidacaoArvore) resposta;
    }

    // A troca inteira usa o mesmo bloqueio das demais validações da conexão compartilhada.
    public synchronized ResultadoValidacaoOrdemDeServico validarOrdemDeServico(
            PedidoDeValidacaoOrdemDeServico pedido) {
        if (pedido == null) throw new IllegalArgumentException("O pedido de validação da OS é obrigatório.");
        if (parceiro == null || conexao == null) {
            throw new ValidacaoOrdemDeServicoIndisponivelException(
                    new IllegalStateException("Não existe conexão com o servidor Socket."));
        }

        try {
            int tempoAnterior = conexao.getSoTimeout();
            // Um servidor antigo pode desconhecer o pedido; a espera não fica ilimitada.
            conexao.setSoTimeout(TEMPO_RESPOSTA_OS_MS);
            parceiro.receba(pedido);
            Comunicado resposta = parceiro.envie();
            if (!(resposta instanceof ResultadoValidacaoOrdemDeServico resultado)
                    || !pedido.getRequisicaoId().equals(resultado.getRequisicaoId())
                    || pedido.getOperacao() != resultado.getOperacao()
                    || !respostaOsCompleta(resultado)) {
                throw new IllegalStateException("Resposta inesperada na validação da OS.");
            }
            conexao.setSoTimeout(tempoAnterior);
            return resultado;
        } catch (Exception erro) {
            // Após falha/timeout, uma resposta atrasada não pode atender a outro pedido.
            fechar();
            throw new ValidacaoOrdemDeServicoIndisponivelException(erro);
        }
    }

    private static boolean respostaOsCompleta(ResultadoValidacaoOrdemDeServico resultado) {
        if (!resultado.isValido()) {
            return resultado.getErro() != null && !resultado.getErro().isBlank()
                    && resultado.getCadastro() == null && resultado.getConclusao() == null
                    && resultado.getEquipeId() == null;
        }
        if (resultado.getErro() != null) return false;
        return switch (resultado.getOperacao()) {
            case CADASTRO -> resultado.getCadastro() != null && resultado.getConclusao() == null
                    && resultado.getEquipeId() == null;
            case CONCLUSAO -> resultado.getConclusao() != null && resultado.getCadastro() == null
                    && resultado.getEquipeId() == null;
            case ATRIBUICAO_EQUIPE -> resultado.getEquipeId() != null && resultado.getCadastro() == null
                    && resultado.getConclusao() == null;
        };
    }
}
