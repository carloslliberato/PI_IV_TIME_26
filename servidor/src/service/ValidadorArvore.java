// Autor: Guilherme Mascarenhas

package service;

import java.util.ArrayList;
import java.util.List;

import protocolo.PedidoDeValidacaoArvore;
import protocolo.ResultadoValidacaoArvore;

/**
 * Responsavel por validar os dados das arvores
 * recebidos pelo servidor Socket.
 */
public class ValidadorArvore {

    public static ResultadoValidacaoArvore validar(
            PedidoDeValidacaoArvore pedido) {

        List<String> erros = new ArrayList<>();

        if (pedido == null) {
            erros.add("Pedido de validacao de arvore ausente.");

            return new ResultadoValidacaoArvore(false, erros);
        }

        // Executa as duas validacoes
        validarCoordenadas(pedido, erros);
        validarMedidas(pedido, erros);

        // Sem erros = dados validos
        return new ResultadoValidacaoArvore(
                erros.isEmpty(), erros);
    }

    // =========================================
    // VALIDACAO 1: COORDENADAS GEOGRAFICAS
    // =========================================

    private static void validarCoordenadas(
            PedidoDeValidacaoArvore pedido,
            List<String> erros) {

        Double latitude = pedido.getLatitude();
        Double longitude = pedido.getLongitude();

        if (latitude == null && longitude == null) {
            return;
        }

        if (latitude == null ||
                !Double.isFinite(latitude) ||
                latitude < -90 ||
                latitude > 90 ||
                longitude == null ||
                !Double.isFinite(longitude) ||
                longitude < -180 ||
                longitude > 180) {

            erros.add("Latitude ou longitude invalida.");
        }
    }

    // =========================================
    // VALIDACAO 2: MEDIDAS FISICAS DA ARVORE
    // =========================================

    private static void validarMedidas(
            PedidoDeValidacaoArvore pedido,
            List<String> erros) {

        Double altura = pedido.getAlturaMetros();
        Double diametro = pedido.getDiametroCm();

        if ((altura != null &&
                (!Double.isFinite(altura) || altura < 0)) ||
                (diametro != null &&
                (!Double.isFinite(diametro) || diametro < 0))) {

            erros.add(
                    "Altura ou diametro invalido: informe valores nao negativos.");
        }
    }
}
