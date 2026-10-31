
package model;

import java.time.Instant;
import java.util.List;
import java.util.ArrayList;
import org.bson.types.ObjectId;

public class Conta {

    private final ObjectId _id;
    private String nome;
    private String email;
    private String senhaHash;
    private String telefone;
    private List<String> perfis;
    private final ObjectId municipioId;
    private ObjectId setorId;
    private String cargo;
    private List<String> preferenciasNotificacoes;
    private final Instant dataCadastro;
    private Instant dataAtualizacao;

    // Construtor para criar uma nova conta
    public Conta(String nome, String email, String senhaHash, String telefone,
            List<String> perfis, ObjectId municipioId, ObjectId setorId,
            String cargo, List<String> preferenciasNotificacoes) {

        this._id = new ObjectId();
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.telefone = telefone;
        this.perfis = perfis == null ? null : new ArrayList<>(perfis);
        this.municipioId = municipioId;
        this.setorId = setorId;
        this.cargo = cargo;
        this.preferenciasNotificacoes = preferenciasNotificacoes == null
                ? null : new ArrayList<>(preferenciasNotificacoes);
        this.dataCadastro = Instant.now();
        this.dataAtualizacao = null;

        this.validarDados();
    }

    // Construtor para recuperar uma conta do banco de dados
    public Conta(ObjectId _id, String nome, String email, String senhaHash,
            String telefone, List<String> perfis, ObjectId municipioId,
            ObjectId setorId, String cargo,
            List<String> preferenciasNotificacoes,
            Instant dataCadastro, Instant dataAtualizacao) {

        this._id = _id;
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.telefone = telefone;
        this.perfis = perfis == null ? null : new ArrayList<>(perfis);
        this.municipioId = municipioId;
        this.setorId = setorId;
        this.cargo = cargo;
        this.preferenciasNotificacoes = preferenciasNotificacoes == null
                ? null : new ArrayList<>(preferenciasNotificacoes);
        this.dataCadastro = dataCadastro;
        this.dataAtualizacao = dataAtualizacao;

        this.validarDados();
        this.validarDadosRecuperacao();
    }

    // Validações gerais da conta
    private void validarDados() {

        if (nome == null || nome.isBlank()
                || email == null || email.isBlank()
                || senhaHash == null || senhaHash.isBlank()
                || telefone == null || telefone.isBlank()
                || perfis == null || municipioId == null) {

            throw new IllegalArgumentException(
                    "Nome, e-mail, senha, telefone, perfis e município são obrigatórios.");
        }

        if (perfis.isEmpty()) {
            throw new IllegalArgumentException(
                    "Os perfis não podem estar vazios.");
        }

        List<String> perfisVerificados = new ArrayList<>();

        for (String perfil : perfis) {

            if (perfil == null) {
                throw new IllegalArgumentException(
                        "A lista de perfis não pode conter valores nulos.");
            }

            if (!perfil.equals("cidadao") && !perfil.equals("funcionario")) {
                throw new IllegalArgumentException(
                        "Perfil inválido encontrado na lista de perfis.");
            }

            if (perfisVerificados.contains(perfil)) {
                throw new IllegalArgumentException(
                        "Não é permitido repetir perfis.");
            }

            perfisVerificados.add(perfil);
        }

        if (perfis.contains("funcionario")
                && (setorId == null || cargo == null || cargo.isBlank())) {

            throw new IllegalArgumentException(
                    "Funcionários precisam de cargo e setor.");
        }
    }

    // Validações específicas da recuperação do banco de dados
    private void validarDadosRecuperacao() {

        if (_id == null || dataCadastro == null) {
            throw new IllegalArgumentException(
                    "ID e data de cadastro não podem ser nulos.");
        }
    }

    // Getters

    public ObjectId getId() {
        return _id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public String getTelefone() {
        return telefone;
    }

    public List<String> getPerfis() {
        return new ArrayList<>(perfis);
    }

    public ObjectId getMunicipioId() {
        return municipioId;
    }

    public ObjectId getSetorId() {
        return setorId;
    }

    public String getCargo() {
        return cargo;
    }

    public List<String> getPreferenciasNotificacoes() {
        return preferenciasNotificacoes == null
                ? null : new ArrayList<>(preferenciasNotificacoes);
    }

    public Instant getDataCadastro() {
        return dataCadastro;
    }

    public Instant getDataAtualizacao() {
        return dataAtualizacao;
    }

    // Setters

    public void setNome(String nome) {
        if (nome == null || nome.isBlank()) {
            throw new IllegalArgumentException("Nome inválido.");
        }

        this.nome = nome;
        this.atualizarData();
    }

    public void setEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("E-mail inválido.");
        }

        this.email = email;
        this.atualizarData();
    }

    public void setTelefone(String telefone) {
        if (telefone == null || telefone.isBlank()) {
            throw new IllegalArgumentException("Telefone inválido.");
        }

        this.telefone = telefone;
        this.atualizarData();
    }

    public void setPerfis(List<String> perfis) {
        List<String> perfisAnteriores = this.perfis;

        this.perfis = perfis == null ? null : new ArrayList<>(perfis);

        try {
            this.validarDados();
        } catch (IllegalArgumentException e) {
            this.perfis = perfisAnteriores;
            throw e;
        }

        this.atualizarData();
    }

    public void setSetorId(ObjectId setorId) {
        ObjectId setorAnterior = this.setorId;
        this.setorId = setorId;

        try {
            this.validarDados();
        } catch (IllegalArgumentException e) {
            this.setorId = setorAnterior;
            throw e;
        }

        this.atualizarData();
    }

    public void setCargo(String cargo) {
        String cargoAnterior = this.cargo;
        this.cargo = cargo;

        try {
            this.validarDados();
        } catch (IllegalArgumentException e) {
            this.cargo = cargoAnterior;
            throw e;
        }

        this.atualizarData();
    }

    public void setPreferenciasNotificacoes(
            List<String> preferenciasNotificacoes) {

        this.preferenciasNotificacoes = preferenciasNotificacoes == null
                ? null : new ArrayList<>(preferenciasNotificacoes);

        this.atualizarData();
    }

    // Atualiza a data da última modificação
    private void atualizarData() {
        this.dataAtualizacao = Instant.now();
    }

    // equals e hashCode baseados no ID
    @Override
    public int hashCode() {
        return _id.hashCode();
    }

    @Override
    public boolean equals(Object obj) {

        if (this == obj) {
            return true;
        }

        if (obj == null || getClass() != obj.getClass()) {
            return false;
        }

        Conta outraConta = (Conta) obj;

        return _id.equals(outraConta._id);
    }

    // Representação textual da conta
    @Override
    public String toString() {
        return "Conta [nome=" + nome
                + ", email=" + email
                + ", telefone=" + telefone
                + ", cargo=" + cargo + "]";
    }
}
