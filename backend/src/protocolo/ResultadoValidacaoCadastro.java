// Autor: Carlos Luciano

package protocolo;

import java.util.ArrayList;
import java.util.List;

/* Classe que representa o resultado da validação de cadastro */

public class ResultadoValidacaoCadastro extends Comunicado {

    private boolean valido;
    private ArrayList<String> erros;

    // Construtor
    public ResultadoValidacaoCadastro(boolean valido, List<String> erros) {
        this.valido = valido;
        this.erros = erros == null
                ? new ArrayList<>()
                : new ArrayList<>(erros);
    }

    // Getters e Setters
    public boolean isValido() {
        return valido;
    }

    public void setValido(boolean valido) {
        this.valido = valido;
    }

    public List<String> getErros() {
        return erros == null
                ? new ArrayList<>()
                : new ArrayList<>(erros);
    }

    public void setErros(ArrayList<String> erros) {
        this.erros = erros == null
                ? new ArrayList<>()
                : new ArrayList<>(erros);
    }

}
