// Autor: Guilherme Mascarenhas

package protocolo;

/**
 * Pedido enviado pelo backend para o servidor Socket
 * validar os dados de uma arvore.
 */
public class PedidoDeValidacaoArvore extends Comunicado {

    private static final long serialVersionUID = 1L;

    private final Double latitude;
    private final Double longitude;
    private final Double alturaMetros;
    private final Double diametroCm;

    public PedidoDeValidacaoArvore(
            Double latitude,
            Double longitude,
            Double alturaMetros,
            Double diametroCm) {

        this.latitude = latitude;
        this.longitude = longitude;
        this.alturaMetros = alturaMetros;
        this.diametroCm = diametroCm;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Double getAlturaMetros() {
        return alturaMetros;
    }

    public Double getDiametroCm() {
        return diametroCm;
    }
}
