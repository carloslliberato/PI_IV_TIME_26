package dto;

// Recebe somente os campos preenchidos no formulário de criação da equipe.
// Os IDs e o status são definidos pelo backend para não confiar no navegador.
public class CadastroEquipeDTO {

    private String nome;
    private String regiaoAtuacao;
    private String gestor;

    // Construtor vazio usado pelo Gson ao converter o JSON da requisição.
    public CadastroEquipeDTO() {
    }

    // Getters usados pelo serviço para validar e montar a equipe.
    public String getNome() {
        return nome;
    }

    public String getRegiaoAtuacao() {
        return regiaoAtuacao;
    }

    public String getGestor() {
        return gestor;
    }

    // Setters usados pelo Gson ao preencher este DTO.
    public void setNome(String nome) {
        this.nome = nome;
    }

    public void setRegiaoAtuacao(String regiaoAtuacao) {
        this.regiaoAtuacao = regiaoAtuacao;
    }

    public void setGestor(String gestor) {
        this.gestor = gestor;
    }
}
