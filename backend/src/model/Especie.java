package model;

public class Especie {

    private String id;
    private String nomePopular;
    private String nomeCientifico;
    private String descricao;
    private boolean frutifera;
    private String periodoFloracao;

    public Especie() {
    }

    public Especie(
            String nomePopular,
            String nomeCientifico,
            String descricao,
            boolean frutifera,
            String periodoFloracao) {

        this.nomePopular = nomePopular;
        this.nomeCientifico = nomeCientifico;
        this.descricao = descricao;
        this.frutifera = frutifera;
        this.periodoFloracao = periodoFloracao;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNomePopular() {
        return nomePopular;
    }

    public void setNomePopular(String nomePopular) {
        this.nomePopular = nomePopular;
    }

    public String getNomeCientifico() {
        return nomeCientifico;
    }

    public void setNomeCientifico(String nomeCientifico) {
        this.nomeCientifico = nomeCientifico;
    }

    public String getDescricao() {
        return descricao;
    }

    public void setDescricao(String descricao) {
        this.descricao = descricao;
    }

    public boolean isFrutifera() {
        return frutifera;
    }

    public void setFrutifera(boolean frutifera) {
        this.frutifera = frutifera;
    }

    public String getPeriodoFloracao() {
        return periodoFloracao;
    }

    public void setPeriodoFloracao(String periodoFloracao) {
        this.periodoFloracao = periodoFloracao;
    }
}
