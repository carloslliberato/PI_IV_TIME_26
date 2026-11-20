package dto;

/**
 * Recebe a justificativa; a OS e o município são definidos pela rota e pela sessão.
 * @author Marialvo Corrêa de Freitas Junior
 */
public class CancelamentoOrdemDeServicoDTO {
    private String motivoCancelamento;

    public String getMotivoCancelamento() {
        return motivoCancelamento;
    }
}
