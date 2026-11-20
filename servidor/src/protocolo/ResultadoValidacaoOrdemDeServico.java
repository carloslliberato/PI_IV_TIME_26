package protocolo;

import java.io.Serializable;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import protocolo.PedidoDeValidacaoOrdemDeServico.Operacao;

/**
 * Contribuição: Marialvo Corrêa de Freitas Junior.
 * Correlaciona a resposta ao pedido e devolve somente os dados aprovados.
 */
public final class ResultadoValidacaoOrdemDeServico extends Comunicado {
    private static final long serialVersionUID = 1L;

    private final UUID requisicaoId;
    private final Operacao operacao;
    private final boolean valido;
    private final String erro;
    private final CadastroValidado cadastro;
    private final ConclusaoValidada conclusao;
    private final String equipeId;

    private ResultadoValidacaoOrdemDeServico(PedidoDeValidacaoOrdemDeServico pedido,
            boolean valido, String erro, CadastroValidado cadastro,
            ConclusaoValidada conclusao, String equipeId) {
        this.requisicaoId = pedido == null ? null : pedido.getRequisicaoId();
        this.operacao = pedido == null ? null : pedido.getOperacao();
        this.valido = valido;
        this.erro = erro;
        this.cadastro = cadastro;
        this.conclusao = conclusao;
        this.equipeId = equipeId;
    }

    public static ResultadoValidacaoOrdemDeServico cadastroAprovado(
            PedidoDeValidacaoOrdemDeServico pedido, CadastroValidado cadastro) {
        exigirOperacao(pedido, Operacao.CADASTRO);
        return new ResultadoValidacaoOrdemDeServico(pedido, true, null,
                Objects.requireNonNull(cadastro), null, null);
    }

    public static ResultadoValidacaoOrdemDeServico conclusaoAprovada(
            PedidoDeValidacaoOrdemDeServico pedido, ConclusaoValidada conclusao) {
        exigirOperacao(pedido, Operacao.CONCLUSAO);
        return new ResultadoValidacaoOrdemDeServico(pedido, true, null,
                null, Objects.requireNonNull(conclusao), null);
    }

    public static ResultadoValidacaoOrdemDeServico equipeAprovada(
            PedidoDeValidacaoOrdemDeServico pedido, String equipeId) {
        exigirOperacao(pedido, Operacao.ATRIBUICAO_EQUIPE);
        return new ResultadoValidacaoOrdemDeServico(pedido, true, null,
                null, null, Objects.requireNonNull(equipeId));
    }

    public static ResultadoValidacaoOrdemDeServico reprovado(
            PedidoDeValidacaoOrdemDeServico pedido, String erro) {
        return new ResultadoValidacaoOrdemDeServico(pedido, false, erro, null, null, null);
    }

    private static void exigirOperacao(PedidoDeValidacaoOrdemDeServico pedido, Operacao esperada) {
        if (pedido == null || pedido.getOperacao() != esperada) {
            throw new IllegalArgumentException("A resposta não corresponde à operação de validação da OS.");
        }
    }

    public UUID getRequisicaoId() { return requisicaoId; }
    public Operacao getOperacao() { return operacao; }
    public boolean isValido() { return valido; }
    public String getErro() { return erro; }
    public CadastroValidado getCadastro() { return cadastro; }
    public ConclusaoValidada getConclusao() { return conclusao; }
    public String getEquipeId() { return equipeId; }

    public static record CadastroValidado(String arvoreId, String ocorrenciaId,
            String titulo, String descricao, String prioridade, String observacoes)
            implements Serializable {
        private static final long serialVersionUID = 1L;
    }

    public static record ConclusaoValidada(String tipo, String descricao,
            Instant dataExecucao, List<String> fotos) implements Serializable {
        private static final long serialVersionUID = 1L;

        public ConclusaoValidada {
            fotos = List.copyOf(fotos);
        }
    }
}
