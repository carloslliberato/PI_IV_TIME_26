package dto;

import java.util.List;

// Recebe somente o registro da execução; os vínculos vêm da OS e da sessão.
public class ConclusaoOrdemDeServicoDTO {
    private String tipo;
    private String descricao;
    private String dataExecucao;
    private List<String> fotos;

    public String getTipo() {
        return tipo;
    }

    public String getDescricao() {
        return descricao;
    }

    public String getDataExecucao() {
        return dataExecucao;
    }

    public List<String> getFotos() {
        return fotos;
    }
}
