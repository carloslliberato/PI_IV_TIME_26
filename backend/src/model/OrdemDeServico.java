package model;

import java.time.Instant;

import org.bson.types.ObjectId;

public class OrdemDeServico {

    private ObjectId ordemServicoId;
    private String codigo;
    private ObjectId intervencaoConclusaoId;
    private ObjectId municipioId;
    private ObjectId arvoreId;
    private ObjectId ocorrenciaId;
    private ObjectId equipeId;
    private String titulo;
    private String descricao;
    private String status; // **VERIFICAR QUAIS STATUS SERÃO UTILIZADOS E DE QUE FORMA SERÃO ESCOLHIDOS/ATRIBUIDOS
    private String prioridade;
    private String observacoes;
    private Instant dataCriacao;
    private Instant dataAtualizacao;
    private Instant dataConclusao;

    // Cria uma nova ordem de serviço com o código gerado pelo sistema.
    public OrdemDeServico(
            ObjectId municipioId,
            ObjectId arvoreId,
            ObjectId ocorrenciaId,
            ObjectId equipeId,
            String titulo,
            String descricao,
            String prioridade,
            String observacoes,
            String codigo){

        this.ordemServicoId = new ObjectId();
        this.codigo = codigo;
        this.municipioId = municipioId;
        this.arvoreId = arvoreId;
        this.ocorrenciaId = ocorrenciaId;
        this.equipeId = equipeId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.prioridade = prioridade;
        this.observacoes = observacoes;
        this.dataCriacao = Instant.now();
        this.dataAtualizacao = this.dataCriacao;

        if (equipeId != null){
            this.status = "Em andamento";
        } else{
            this.status = "Aberta";
        }
    }

    // Reconstrói uma ordem de serviço com os dados armazenados no banco.
    public OrdemDeServico(
            ObjectId ordemServicoId,
            ObjectId municipioId,
            ObjectId arvoreId,
            ObjectId ocorrenciaId,
            ObjectId equipeId,
            String titulo,
            String descricao,
            String status,
            String prioridade,
            String observacoes,
            Instant dataCriacao,
            Instant dataAtualizacao,
            Instant dataConclusao,
            String codigo){

        this(ordemServicoId, municipioId, arvoreId, ocorrenciaId, equipeId,
                titulo, descricao, status, prioridade, observacoes,
                dataCriacao, dataAtualizacao, dataConclusao, codigo, null);
    }

    // Inclui o vínculo opcional com o relatório da conclusão; registros antigos continuam válidos.
    public OrdemDeServico(
            ObjectId ordemServicoId,
            ObjectId municipioId,
            ObjectId arvoreId,
            ObjectId ocorrenciaId,
            ObjectId equipeId,
            String titulo,
            String descricao,
            String status,
            String prioridade,
            String observacoes,
            Instant dataCriacao,
            Instant dataAtualizacao,
            Instant dataConclusao,
            String codigo,
            ObjectId intervencaoConclusaoId){

        this.ordemServicoId = ordemServicoId;
        this.codigo = codigo;
        this.intervencaoConclusaoId = intervencaoConclusaoId;
        this.municipioId = municipioId;
        this.arvoreId = arvoreId;
        this.ocorrenciaId = ocorrenciaId;
        this.equipeId = equipeId;
        this.titulo = titulo;
        this.descricao = descricao;
        this.status = status;
        this.prioridade = prioridade;
        this.observacoes = observacoes;
        this.dataCriacao = dataCriacao;
        this.dataAtualizacao = dataAtualizacao;
        this.dataConclusao = dataConclusao;
    }

    private void verificarSeEditavel() {
        if ("Concluída".equals(this.status) || "Cancelada".equals(this.status)) {

            throw new IllegalStateException("Não é permitido alterar uma ordem de serviço concluída ou cancelada.");
        }
    }

    public ObjectId getOrdemServicoId(){
        return ordemServicoId;
    }

    public String getCodigo(){
        return codigo;
    }

    public ObjectId getIntervencaoConclusaoId(){
        return intervencaoConclusaoId;
    }

    public ObjectId getMunicipioId(){
        return municipioId;
    }

    public void setMunicipioId(ObjectId municipioId){
        verificarSeEditavel();
        this.municipioId = municipioId;
        this.dataAtualizacao = Instant.now();
    }

    public ObjectId getArvoreId(){
        return arvoreId;
    }

    public void setArvoreId(ObjectId arvoreId){
        verificarSeEditavel();
        this.arvoreId = arvoreId;
        this.dataAtualizacao = Instant.now();
    }

    public ObjectId getOcorrenciaId(){
        return ocorrenciaId;
    }

    public void setOcorrenciaId(ObjectId ocorrenciaId){
        verificarSeEditavel();
        this.ocorrenciaId = ocorrenciaId;
        this.dataAtualizacao = Instant.now();
    }

    public ObjectId getEquipeId(){
        return equipeId;
    }

    public void atribuirEquipe(ObjectId equipeId){
        verificarSeEditavel();

        if (equipeId == null) {
            throw new IllegalArgumentException("A equipe não pode ser nula.");
        }

        this.equipeId = equipeId;
        this.status = "Em andamento";
        this.dataAtualizacao = Instant.now();
    }

    // Cancela uma OS aberta ou em andamento.
    public void cancelar(){
        verificarSeEditavel();

        if (!"Aberta".equals(this.status) && !"Em andamento".equals(this.status)){
            throw new IllegalStateException("Somente ordens de serviço abertas ou em andamento podem ser canceladas.");
        }

        this.status = "Cancelada";
        this.dataAtualizacao = Instant.now();
    }

    public String getTitulo(){
        return titulo;
    }

    public void setTitulo(String titulo){
        verificarSeEditavel();
        this.titulo = titulo;
        this.dataAtualizacao = Instant.now();
    }

    public String getDescricao(){
        return descricao;
    }

    public void setDescricao(String descricao){
        verificarSeEditavel();
        this.descricao = descricao;
        this.dataAtualizacao = Instant.now();
    }

    public String getStatus(){
        return status;
    }

    public String getPrioridade(){
        return prioridade;
    }

    public void setPrioridade(String prioridade){
        verificarSeEditavel();
        this.prioridade = prioridade;
        this.dataAtualizacao = Instant.now();
    }

    public String getObservacoes(){
        return observacoes;
    }

    public void setObservacoes(String observacoes){
        verificarSeEditavel();
        this.observacoes = observacoes;
        this.dataAtualizacao = Instant.now();
    }

    public Instant getDataCriacao(){
        return dataCriacao;
    }


    public Instant getDataAtualizacao(){
        return dataAtualizacao;
    }


    public Instant getDataConclusao(){
        return dataConclusao;
    }

}
