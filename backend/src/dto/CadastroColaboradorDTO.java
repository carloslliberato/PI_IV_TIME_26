package dto;

// Contém somente os dados que o usuário preenche ao adicionar um colaborador.
public class CadastroColaboradorDTO {

    private String nomeCompleto;
    private String funcao;
    private String email;

    // Permite que o Gson crie o DTO a partir do JSON da requisição.
    public CadastroColaboradorDTO() {
    }

    // Entrega o nome informado para validação no serviço.
    public String getNomeCompleto() {
        return nomeCompleto;
    }

    // Entrega a função informada para validação no serviço.
    public String getFuncao() {
        return funcao;
    }

    // Entrega o e-mail informado para validação e verificação de unicidade.
    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
