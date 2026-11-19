package dto;

// Recebe os dados enviados para solicitar a criação de uma OS.
public class CadastroOrdemDeServicoDTO{
    private String arvoreId;
    private String ocorrenciaId;
    private String equipeId;
    private String titulo;
    private String descricao;
    private String prioridade;
    private String observacoes;

    public String getArvoreId(){
        return arvoreId;
    }

    public String getOcorrenciaId(){
        return ocorrenciaId;
    }

    public String getEquipeId(){
        return equipeId;
    }

    public String getTitulo(){
        return titulo;
    }

    public String getDescricao(){
        return descricao;
    }

    public String getPrioridade(){
        return prioridade;
    }

    public String getObservacoes(){
        return observacoes;
    }
}