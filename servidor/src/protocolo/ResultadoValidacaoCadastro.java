package protocolo;

import java.util.ArrayList;
import java.util.List;

public class ResultadoValidacaoCadastro extends Comunicado{
    
    private boolean valido;
    private ArrayList<String> erros;

    public ResultadoValidacaoCadastro(boolean valido, List<String> erros) {
        this.valido = valido;
        this.erros = new ArrayList<>(erros);
    }

    public boolean isValido() {
        return valido;
    }

    public void setValido(boolean valido) {
        this.valido = valido;
    }

    public List<String> getErros() {
        return new ArrayList<>(erros);
    }

    public void setErros(ArrayList<String> erros) {
        this.erros = new ArrayList<>(erros);
    }

    
}
