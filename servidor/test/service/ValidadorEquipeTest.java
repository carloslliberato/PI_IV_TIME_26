// Autor: Gabrielle Mota

package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import protocolo.PedidoDeValidacaoEquipe;

class ValidadorEquipeTest {
    @Test
    void aprovaCamposObrigatoriosComEspacosExternos() {
        var resultado = ValidadorEquipe.validar(new PedidoDeValidacaoEquipe(
                "  Equipe Centro  ", "  Região central  ", "  gestor@exemplo.com  "));

        assertTrue(resultado.isValido());
        assertTrue(resultado.getErros().isEmpty());
    }

    @Test
    void reprovaPedidoAusenteECamposObrigatoriosVazios() {
        assertEquals(
                List.of("Os dados da equipe não foram informados."),
                ValidadorEquipe.validar(null).getErros());

        for (String vazio : Arrays.asList(null, "", "   ")) {
            var resultado = ValidadorEquipe.validar(
                    new PedidoDeValidacaoEquipe(vazio, vazio, vazio));
            assertFalse(resultado.isValido());
            assertEquals(3, resultado.getErros().size());
        }
    }

    @Test
    void rejeitaTextoAcimaDosLimitesDoFormulario() {
        var resultado = ValidadorEquipe.validar(new PedidoDeValidacaoEquipe(
                "a".repeat(101), "b".repeat(161), "gestor@exemplo.com"));

        assertFalse(resultado.isValido());
        assertTrue(resultado.getErros().stream()
                .anyMatch(erro -> erro.contains("nome da equipe")));
        assertTrue(resultado.getErros().stream()
                .anyMatch(erro -> erro.contains("região de atuação")));
    }

    @Test
    void rejeitaEmailDoGestorInvalidoOuAcimaDoLimite() {
        for (String email : List.of("gestor", "gestor@exemplo", "a".repeat(250) + "@x.co")) {
            var resultado = ValidadorEquipe.validar(
                    new PedidoDeValidacaoEquipe("Equipe Centro", "Centro", email));
            assertFalse(resultado.isValido());
            assertTrue(resultado.getErros().get(0)
                    .contains("e-mail válido para o gestor"));
        }
    }
}
