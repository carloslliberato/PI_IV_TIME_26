package controller;

import static org.junit.jupiter.api.Assertions.*;
import com.google.gson.JsonParseException;
import org.junit.jupiter.api.Test;

/**
 * Testa o contrato JSON sem sessão, rede ou banco de dados.
 * A obrigatoriedade e o limite do conteúdo pertencem ao validador no Socket.
 * @author Marialvo Corrêa de Freitas Junior
 */
class CancelamentoOrdemDeServicoJsonTest {
    @Test
    void preservaTextoParaValidacaoNoServidor(){
        var dados = OrdemDeServicoController.lerDadosDeCancelamento(
                "{\"status\":\"Cancelada\",\"motivoCancelamento\":\"  Serviço duplicado.\\nConferido pela equipe.  \"}");
        assertEquals("  Serviço duplicado.\nConferido pela equipe.  ", dados.getMotivoCancelamento());
    }

    @Test
    void motivoAusenteNuloOuVazioSegueParaRegraObrigatoriaDoSocket(){
        assertNull(OrdemDeServicoController.lerDadosDeCancelamento(
                "{\"status\":\"Cancelada\"}").getMotivoCancelamento());
        assertNull(OrdemDeServicoController.lerDadosDeCancelamento(
                "{\"status\":\"Cancelada\",\"motivoCancelamento\":null}").getMotivoCancelamento());
        assertEquals("", OrdemDeServicoController.lerDadosDeCancelamento(
                "{\"status\":\"Cancelada\",\"motivoCancelamento\":\"\"}").getMotivoCancelamento());
    }

    @Test
    void naoConverteNumeroBooleanoListaOuObjetoEmJustificativa(){
        for (String valor : new String[]{"123", "true", "[]", "{}"}){
            var erro = assertThrows(IllegalArgumentException.class,
                    () -> OrdemDeServicoController.lerDadosDeCancelamento(
                            "{\"status\":\"Cancelada\",\"motivoCancelamento\":" + valor + "}"));
            assertEquals("O campo motivoCancelamento deve ser um texto.", erro.getMessage());
        }
    }

    @Test
    void aceitaSomenteOStatusDeCancelamento(){
        for (String corpo : new String[]{"{}", "{\"status\":null}", "{\"status\":123}",
                "{\"status\":\"Concluída\"}", "{\"status\":{}}"}){
            var erro = assertThrows(IllegalArgumentException.class,
                    () -> OrdemDeServicoController.lerDadosDeCancelamento(corpo));
            assertEquals("Informe o status \"Cancelada\" para esta operação.", erro.getMessage());
        }
    }

    @Test
    void exigeObjetoJsonERejeitaDocumentoMalformado(){
        for (String corpo : new String[]{"null", "[]", "\"texto\"", "true", "123"}){
            var erro = assertThrows(IllegalArgumentException.class,
                    () -> OrdemDeServicoController.lerDadosDeCancelamento(corpo));
            assertEquals("Informe um objeto JSON com os dados do cancelamento.", erro.getMessage());
        }
        assertThrows(JsonParseException.class,
                () -> OrdemDeServicoController.lerDadosDeCancelamento("{\"status\":\"Cancelada\""));
    }
}
