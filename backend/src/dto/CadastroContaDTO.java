// Autor: Carlos Luciano

package dto;

public class CadastroContaDTO {

    private String nome;
    private String email;
    private String telefone;
    private String senha;
    private String confirmarSenha;
    private String municipio;

    // Dados específicos do funcionário
    private String setor;
    private String outroSetor;
    private String cargo;

    // Construtor vazio
    public CadastroContaDTO() {
    }

    // Getters

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getTelefone() {
        return telefone;
    }

    public String getSenha() {
        return senha;
    }

    public String getConfirmarSenha() {
        return confirmarSenha;
    }

    public String getMunicipio() {
        return municipio;
    }

    public String getSetor() {
        return setor;
    }

    public String getOutroSetor() {
        return outroSetor;
    }

    public String getCargo() {
        return cargo;
    }

    // Setters

    public void setNome(String nome) {
        this.nome = nome;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public void setConfirmarSenha(String confirmarSenha) {
        this.confirmarSenha = confirmarSenha;
    }

    public void setMunicipio(String municipio) {
        this.municipio = municipio;
    }

    public void setSetor(String setor) {
        this.setor = setor;
    }

    public void setOutroSetor(String outroSetor) {
        this.outroSetor = outroSetor;
    }

    public void setCargo(String cargo) {
        this.cargo = cargo;
    }

}
