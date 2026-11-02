package model;

import java.time.Instant;
import java.util.UUID;

public class Ocorrencia {
    private String id;
    private String protocolo;
    private String municipioId;
    private String cidadaoId;
    private String arvoreId;
    private String tipoProblema;
    private String descricao;
    private String localizacao;
    private Double latitude;
    private Double longitude;
    private String urgencia; // Baixa, Média, Alta, Crítica
    private String status;   // Recebida, Em Análise, Em Atendimento, Concluída, Cancelada
    private String observacaoInterna;
    private String criadoEm;
    private String atualizadoEm;

    public Ocorrencia() {
        this.id = "oco_" + UUID.randomUUID().toString().substring(0, 8);
        this.protocolo = "CH-" + System.currentTimeMillis();
        this.status = "Recebida";
        this.urgencia = "Média";
        this.municipioId = "campinas";
        String agora = Instant.now().toString();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProtocolo() { return protocolo; }
    public void setProtocolo(String protocolo) { this.protocolo = protocolo; }

    public String getMunicipioId() { return municipioId; }
    public void setMunicipioId(String municipioId) { this.municipioId = municipioId; }

    public String getCidadaoId() { return cidadaoId; }
    public void setCidadaoId(String cidadaoId) { this.cidadaoId = cidadaoId; }

    public String getArvoreId() { return arvoreId; }
    public void setArvoreId(String arvoreId) { this.arvoreId = arvoreId; }

    public String getTipoProblema() { return tipoProblema; }
    public void setTipoProblema(String tipoProblema) { this.tipoProblema = tipoProblema; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getLocalizacao() { return localizacao; }
    public void setLocalizacao(String localizacao) { this.localizacao = localizacao; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getUrgencia() { return urgencia; }
    public void setUrgencia(String urgencia) { this.urgencia = urgencia; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getObservacaoInterna() { return observacaoInterna; }
    public void setObservacaoInterna(String observacaoInterna) { this.observacaoInterna = observacaoInterna; }

    public String getCriadoEm() { return criadoEm; }
    public void setCriadoEm(String criadoEm) { this.criadoEm = criadoEm; }

    public String getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(String atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}