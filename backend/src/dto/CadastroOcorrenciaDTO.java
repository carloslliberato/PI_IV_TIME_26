// Autor: Sophia Fernandes

package dto;

// Recebe os dados enviados pelo formulário de Abrir Chamado no front-end
public class CadastroOcorrenciaDTO {
    public String tipoProblema;
    public String tipoOcorrencia;
    public String localizacao;
    public String endereco;
    public String bairro;
    public String descricao;
    public String imagem;

    // Dados preenchidos quando o cidadão marca que quer receber notificações
    public Boolean receberNotificacoes;
    public String nomeContato;
    public String emailContato;
    public String telefoneContato;

    // Dados complementares do chamado
    // Recebe o nome do município, resolvido para ObjectId pelo MunicipioRepository.
    public String municipioId;
    public String cidadaoId;
    public String arvoreId;
    public Double latitude;
    public Double longitude;
    public String urgencia;
}
