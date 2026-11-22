package service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import protocolo.PedidoDeValidacaoArvore;

// Confere as regras para árvores sem coordenadas e coordenadas incompletas.
class ValidadorArvoreTest {
    @Test
    void permiteSalvarArvoreSemCoordenadasQuandoEnderecoNaoFoiGeocodificado() {
        // Endereço sem resultado de geocodificação pode ser salvo sem marcador no mapa.
        var resultado = ValidadorArvore.validar(
                new PedidoDeValidacaoArvore(null, null, 4.0, 12.0));

        assertTrue(resultado.isValido());
    }

    @Test
    void rejeitaCoordenadaParcial() {
        // Latitude e longitude devem estar ambas preenchidas ou ambas ausentes.
        var resultado = ValidadorArvore.validar(
                new PedidoDeValidacaoArvore(-22.9, null, 4.0, 12.0));

        assertFalse(resultado.isValido());
    }
}
