package dto;

public class AtribuicaoEquipeOrdemDeServicoDTO {
    private String equipeId;

    public AtribuicaoEquipeOrdemDeServicoDTO() {
    }

    public AtribuicaoEquipeOrdemDeServicoDTO(String equipeId) {
        this.equipeId = equipeId;
    }

    public String getEquipeId(){ return equipeId; }
}
