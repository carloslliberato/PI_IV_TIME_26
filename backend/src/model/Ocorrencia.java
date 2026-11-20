// feito por Sophia
package model;

import java.time.Instant;
import org.bson.types.ObjectId;

// Classe que representa uma Ocorrência (chamado) dentro do sistema
public class Ocorrencia {
    private ObjectId ocorrenciaId;
    private String id;
    private String protocolo;
    private ObjectId municipioId;
    private String cidadaoId;
    private String arvoreId;
    private String tipoProblema;
    private String descricao;
    private String localizacao;
    private String bairro;
    private Double latitude;
    private Double longitude;
    private String imagem;
    private boolean receberNotificacoes;
    private String nomeContato;
    private String emailContato;
    private String telefoneContato;
    private String urgencia; // Baixa, Média, Alta, Crítica
    private String status;   // Recebida, Em Análise, Em Atendimento, Concluída, Cancelada
    private String observacaoInterna;
    private String criadoEm;
    private String atualizadoEm;

    // O ObjectId e o protocolo são gerados no backend; o código OC personalizado é atribuído pelo repositório.
    public Ocorrencia() {
        this.ocorrenciaId = new ObjectId();
        long currentTimeMillis = System.currentTimeMillis();
        this.protocolo = "CH-" + currentTimeMillis;
        this.status = "Recebida";
        this.urgencia = "Média";
        this.cidadaoId = "cid_anonimo";
        String agora = Instant.now().toString();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    // Métodos Getters e Setters para acessar e alterar os dados da ocorrência

    public ObjectId getOcorrenciaId() { return ocorrenciaId; }
    public void setOcorrenciaId(ObjectId ocorrenciaId) { this.ocorrenciaId = ocorrenciaId;}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProtocolo() { return protocolo; }
    public void setProtocolo(String protocolo) { this.protocolo = protocolo; }

    public ObjectId getMunicipioId() { return municipioId; }
    public void setMunicipioId(ObjectId municipioId) { this.municipioId = municipioId; }

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

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double latitude) { this.longitude = latitude; }

    public String getImagem() { return imagem; }
    public void setImagem(String imagem) { this.imagem = imagem; }

    public boolean isReceberNotificacoes() { return receberNotificacoes; }
    public void setReceberNotificacoes(boolean receberNotificacoes) { this.receberNotificacoes = receberNotificacoes; }

    public String getNomeContato() { return nomeContato; }
    public void setNomeContato(String nomeContato) { this.nomeContato = nomeContato; }

    public String getEmailContato() { return emailContato; }
    public void setEmailContato(String emailContato) { this.emailContato = emailContato; }

    public String getTelefoneContato() { return telefoneContato; }
    public void setTelefoneContato(String telefoneContato) { this.telefoneContato = telefoneContato; }

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
