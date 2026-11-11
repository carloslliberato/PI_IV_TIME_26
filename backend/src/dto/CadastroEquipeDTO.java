package dto;

public class CadastroEquipeDTO {
    private String nomeEquipe;
    private String regiaoAtuacao;
    private String gestorEquipe;
    private String statusEquipe; 

    // Construtor vazio
    public CadastroEquipeDTO() {
    }

    public String getNomeEquipe() {
        return nomeEquipe;
    }

    public void setNomeEquipe(String nomeEquipe) {
        this.nomeEquipe = nomeEquipe;
    }

    public String getRegiaoAtuacao() {
        return regiaoAtuacao;
    }

    public void setRegiaoAtuacao(String regiaoAtuacao) {
        this.regiaoAtuacao = regiaoAtuacao;
    }

    public String getGestorEquipe() {
        return gestorEquipe;
    }

    public void setGestorEquipe(String gestorEquipe) {
        this.gestorEquipe = gestorEquipe;
    }

    public String getStatusEquipe() {
        return statusEquipe;
    }

    public void setStatusEquipe(String statusEquipe) {
        this.statusEquipe = statusEquipe;
    }
}
