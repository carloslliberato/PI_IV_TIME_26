// Autor: Marialvo Junior

package protocolo;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Contribuição: Marialvo Corrêa de Freitas Junior.
 * Transporta os dados de OS para validação no servidor, sem acesso ao banco.
 */
public final class PedidoDeValidacaoOrdemDeServico extends Comunicado {
    private static final long serialVersionUID = 1L;

    public enum Operacao { CADASTRO, CONCLUSAO, ATRIBUICAO_EQUIPE, CANCELAMENTO }

    private final UUID requisicaoId;
    private final Operacao operacao;
    private final boolean dadosPresentes;
    private final Instant agora;
    private final String arvoreId;
    private final String ocorrenciaId;
    private final String equipeId;
    private final String titulo;
    private final String descricao;
    private final String prioridade;
    private final String observacoes;
    private final String tipo;
    private final String dataExecucao;
    private final ArrayList<String> fotos;
    private final String motivoCancelamento;

    private PedidoDeValidacaoOrdemDeServico(Operacao operacao, boolean dadosPresentes,
            Instant agora, String arvoreId, String ocorrenciaId, String equipeId,
            String titulo, String descricao, String prioridade, String observacoes,
            String tipo, String dataExecucao, List<String> fotos, String motivoCancelamento) {
        this.requisicaoId = UUID.randomUUID();
        this.operacao = operacao;
        this.dadosPresentes = dadosPresentes;
        this.agora = agora;
        this.arvoreId = arvoreId;
        this.ocorrenciaId = ocorrenciaId;
        this.equipeId = equipeId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.prioridade = prioridade;
        this.observacoes = observacoes;
        this.tipo = tipo;
        this.dataExecucao = dataExecucao;
        // Preserva entradas nulas para que o validador devolva o erro de domínio.
        this.fotos = fotos == null ? null : new ArrayList<>(fotos);
        this.motivoCancelamento = motivoCancelamento;
    }

    public static PedidoDeValidacaoOrdemDeServico cadastro(String arvoreId,
            String ocorrenciaId, String equipeId, String titulo, String descricao,
            String prioridade, String observacoes) {
        return new PedidoDeValidacaoOrdemDeServico(Operacao.CADASTRO, true, null,
                arvoreId, ocorrenciaId, equipeId, titulo, descricao, prioridade,
                observacoes, null, null, null, null);
    }

    public static PedidoDeValidacaoOrdemDeServico conclusao(String tipo,
            String descricao, String dataExecucao, List<String> fotos, Instant agora) {
        return new PedidoDeValidacaoOrdemDeServico(Operacao.CONCLUSAO, true, agora,
                null, null, null, null, descricao, null, null, tipo, dataExecucao, fotos, null);
    }

    public static PedidoDeValidacaoOrdemDeServico atribuicaoEquipe(String equipeId) {
        return new PedidoDeValidacaoOrdemDeServico(Operacao.ATRIBUICAO_EQUIPE, true, null,
                null, null, equipeId, null, null, null, null, null, null, null, null);
    }

    public static PedidoDeValidacaoOrdemDeServico cancelamento(String motivoCancelamento) {
        return new PedidoDeValidacaoOrdemDeServico(Operacao.CANCELAMENTO, true, null,
                null, null, null, null, null, null, null, null, null, null, motivoCancelamento);
    }

    public static PedidoDeValidacaoOrdemDeServico semDados(Operacao operacao, Instant agora) {
        return new PedidoDeValidacaoOrdemDeServico(operacao, false, agora,
                null, null, null, null, null, null, null, null, null, null, null);
    }

    public UUID getRequisicaoId() { return requisicaoId; }
    public Operacao getOperacao() { return operacao; }
    public boolean isDadosPresentes() { return dadosPresentes; }
    public Instant getAgora() { return agora; }
    public String getArvoreId() { return arvoreId; }
    public String getOcorrenciaId() { return ocorrenciaId; }
    public String getEquipeId() { return equipeId; }
    public String getTitulo() { return titulo; }
    public String getDescricao() { return descricao; }
    public String getPrioridade() { return prioridade; }
    public String getObservacoes() { return observacoes; }
    public String getTipo() { return tipo; }
    public String getDataExecucao() { return dataExecucao; }
    public List<String> getFotos() { return fotos == null ? null : new ArrayList<>(fotos); }
    public String getMotivoCancelamento() { return motivoCancelamento; }
}
