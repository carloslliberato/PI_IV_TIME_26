// Autor: Guilherme Mascarenhas

package protocolo;

import java.util.ArrayList;
import java.util.List;

/**
 * Resposta do servidor Socket sobre a
 * validacao dos dados de uma arvore.
 */
public class ResultadoValidacaoArvore extends Comunicado {

    private static final long serialVersionUID = 1L;

    private final boolean valido;
    private final ArrayList<String> erros;

    public ResultadoValidacaoArvore(
            boolean valido,
            List<String> erros) {

        this.valido = valido;

        this.erros = erros == null
                ? new ArrayList<>()
                : new ArrayList<>(erros);
    }

    public boolean isValido() {
        return valido;
    }

    public List<String> getErros() {
        return new ArrayList<>(erros);
    }
}
