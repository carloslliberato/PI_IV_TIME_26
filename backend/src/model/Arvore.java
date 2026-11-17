package model;

import java.util.Date;

public class Arvore {

    // Identificação
    private String id;
    private String nomePopular;
    private String nomeCientifico;
    private String especie;
    private String municipioId;

    // Localização
    private String endereco;
    private String bairro;
    private Double latitude;
    private Double longitude;

    // Características físicas
    private String idade;
    private Double alturaMetros;
    private Double diametroCm;

    // Conservação
    private Risco risco;
    private String estado;
    private boolean ativa = true;

    // Características adicionais
    private boolean frutifera;
    private boolean manutencao;
    private boolean floracao;
    private boolean alertaClimatico;

    // Datas
    private Date ultimaPoda;
    private Date ultimaInspecao;
    private Date proximaManutencao;

    // Construtor vazio
    public Arvore() {
    }

    // Construtor principal
    public Arvore(
            String id,
            String nomePopular,
            String nomeCientifico,
            String especie,
            String municipioId,
            String endereco,
            String bairro,
            Double latitude,
            Double longitude,
            Risco risco,
            String estado) {

        this.id = id;
        this.nomePopular = nomePopular;
        this.nomeCientifico = nomeCientifico;
        this.especie = especie;
        this.municipioId = municipioId;
        this.endereco = endereco;
        this.bairro = bairro;
        this.latitude = latitude;
        this.longitude = longitude;
        this.risco = risco;
        this.estado = estado;
        this.ativa = true;
    }

    // GETTERS

    public String getId() {
        return id;
    }

    public String getNomePopular() {
        return nomePopular;
    }

    public String getNomeCientifico() {
        return nomeCientifico;
    }

    public String getEspecie() {
        return especie;
    }

    public String getMunicipioId() {
        return municipioId;
    }

    public String getEndereco() {
        return endereco;
    }

    public String getBairro() {
        return bairro;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getIdade() {
        return idade;
    }

    public Double getAlturaMetros() {
        return alturaMetros;
    }

    public Double getDiametroCm() {
        return diametroCm;
    }

    public Risco getRisco() {
        return risco;
    }

    public String getEstado() {
        return estado;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public boolean isFrutifera() {
        return frutifera;
    }

    public boolean isManutencao() {
        return manutencao;
    }

    public boolean isFloracao() {
        return floracao;
    }

    public boolean isAlertaClimatico() {
        return alertaClimatico;
    }

    public Date getUltimaPoda() {
        return ultimaPoda;
    }

    public Date getUltimaInspecao() {
        return ultimaInspecao;
    }

    public Date getProximaManutencao() {
        return proximaManutencao;
    }

    // SETTERS

    public void setId(String id) {
        this.id = id;
    }

    public void setNomePopular(String nomePopular) {
        this.nomePopular = nomePopular;
    }

    public void setNomeCientifico(String nomeCientifico) {
        this.nomeCientifico = nomeCientifico;
    }

    public void setEspecie(String especie) {
        this.especie = especie;
    }

    public void setMunicipioId(String municipioId) {
        this.municipioId = municipioId;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public void setBairro(String bairro) {
        this.bairro = bairro;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public void setIdade(String idade) {
        this.idade = idade;
    }

    public void setAlturaMetros(Double alturaMetros) {
        this.alturaMetros = alturaMetros;
    }

    public void setDiametroCm(Double diametroCm) {
        this.diametroCm = diametroCm;
    }

    public void setRisco(Risco risco) {
        this.risco = risco;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public void setAtiva(boolean ativa) {
        this.ativa = ativa;
    }

    public void setFrutifera(boolean frutifera) {
        this.frutifera = frutifera;
    }

    public void setManutencao(boolean manutencao) {
        this.manutencao = manutencao;
    }

    public void setFloracao(boolean floracao) {
        this.floracao = floracao;
    }

    public void setAlertaClimatico(boolean alertaClimatico) {
        this.alertaClimatico = alertaClimatico;
    }

    public void setUltimaPoda(Date ultimaPoda) {
        this.ultimaPoda = ultimaPoda;
    }

    public void setUltimaInspecao(Date ultimaInspecao) {
        this.ultimaInspecao = ultimaInspecao;
    }

    public void setProximaManutencao(Date proximaManutencao) {
        this.proximaManutencao = proximaManutencao;
    }
}
