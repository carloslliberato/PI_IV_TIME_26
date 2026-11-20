package protocolo;

import java.util.ArrayList;
import java.util.List;

/**
 * Devolve o resultado da validação de uma equipe pelo servidor Socket.
 */
public final class ResultadoValidacaoEquipe extends Comunicado {
    private static final long serialVersionUID = 1L;

    private final boolean valido;
    private final ArrayList<String> erros;

    public ResultadoValidacaoEquipe(boolean valido, List<String> erros) {
        this.valido = valido;
        this.erros = erros == null ? new ArrayList<>() : new ArrayList<>(erros);
    }

    public boolean isValido() {
        return valido;
    }

    public List<String> getErros() {
        return new ArrayList<>(erros);
    }
}
