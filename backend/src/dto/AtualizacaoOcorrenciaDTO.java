// Autor: Sophia Fernandes

package dto;

// Recebe os novos dados quando o funcionário atualiza o status ou prioridade da ocorrência
public class AtualizacaoOcorrenciaDTO {
    public String status;
    public String urgencia;
    public String prioridade;
    public String observacaoInterna;
    public String arvoreId;
    public Boolean receberNotificacoes;
    public String nomeContato;
    public String emailContato;
    public String telefoneContato;
}