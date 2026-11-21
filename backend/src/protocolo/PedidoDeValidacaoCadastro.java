// Autor: Carlos Luciano

package protocolo;

public class PedidoDeValidacaoCadastro extends Comunicado {
    private String tipoConta;
    private String nome;
    private String email;
    private String telefone;
    private String municipio;
    private String senha;
    private String confirmarSenha;

    private String setor;
    private String outroSetor;
    private String cargo;

    public PedidoDeValidacaoCadastro(String tipoConta, String nome, String email, String telefone, String municipio,
            String senha, String confirmarSenha, String setor, String outroSetor, String cargo) {

        this.tipoConta = tipoConta;
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
        this.municipio = municipio;
        this.senha = senha;
        this.confirmarSenha = confirmarSenha;
        this.setor = setor;
        this.outroSetor = outroSetor;
        this.cargo = cargo;
    }

    public String getTipoConta() {
        return tipoConta;
    }

    public void setTipoConta(String tipoConta) {
        this.tipoConta = tipoConta;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public String getMunicipio() {
        return municipio;
    }

    public void setMunicipio(String municipio) {
        this.municipio = municipio;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getConfirmarSenha() {
        return confirmarSenha;
    }

    public void setConfirmarSenha(String confirmarSenha) {
        this.confirmarSenha = confirmarSenha;
    }

    public String getSetor() {
        return setor;
    }

    public void setSetor(String setor) {
        this.setor = setor;
    }

    public String getOutroSetor() {
        return outroSetor;
    }

    public void setOutroSetor(String outroSetor) {
        this.outroSetor = outroSetor;
    }

    public String getCargo() {
        return cargo;
    }

    public void setCargo(String cargo) {
        this.cargo = cargo;
    }

}
