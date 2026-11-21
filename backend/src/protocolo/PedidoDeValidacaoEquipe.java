// Autor: Gabrielle Mota

package protocolo;

/**
 * Transporta os campos de cadastro de uma equipe para validação no servidor Socket.
 */
public final class PedidoDeValidacaoEquipe extends Comunicado {
    private static final long serialVersionUID = 1L;

    private final String nome;
    private final String regiaoAtuacao;
    private final String gestor;

    public PedidoDeValidacaoEquipe(String nome, String regiaoAtuacao, String gestor) {
        this.nome = nome;
        this.regiaoAtuacao = regiaoAtuacao;
        this.gestor = gestor;
    }

    public String getNome() {
        return nome;
    }

    public String getRegiaoAtuacao() {
        return regiaoAtuacao;
    }

    public String getGestor() {
        return gestor;
    }
}
