// Autor: Marialvo Junior

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
    private String endereco;
    private String numero;
    private String bairro;

    public CadastroOrdemDeServicoDTO() {
    }

    public CadastroOrdemDeServicoDTO(
            String arvoreId,
            String ocorrenciaId,
            String equipeId,
            String titulo,
            String descricao,
            String prioridade,
            String observacoes) {
        this(arvoreId, ocorrenciaId, equipeId, titulo, descricao, prioridade,
                observacoes, null, null);
    }

    public CadastroOrdemDeServicoDTO(
            String arvoreId,
            String ocorrenciaId,
            String equipeId,
            String titulo,
            String descricao,
            String prioridade,
            String observacoes,
            String endereco,
            String bairro) {
        this.arvoreId = arvoreId;
        this.ocorrenciaId = ocorrenciaId;
        this.equipeId = equipeId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.prioridade = prioridade;
        this.observacoes = observacoes;
        this.endereco = endereco;
        this.bairro = bairro;
    }

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

    public String getEndereco(){
        return endereco;
    }

    public String getNumero(){ return numero; }

    public String getBairro(){
        return bairro;
    }
}
