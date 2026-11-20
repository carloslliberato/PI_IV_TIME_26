package model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

/** Regras de transição e preservação do histórico no modelo de OS.
 * @author Marialvo Corrêa de Freitas Junior
 */
class OrdemDeServicoCancelamentoTest {
    private static final Instant DATA = Instant.parse("2026-11-20T12:00:00Z");

    @Test
    void cancelaOrdemAbertaOuEmAndamentoSemAlterarObservacoes(){
        for (String status : new String[]{"Aberta", "Em andamento"}){
            OrdemDeServico ordem = reconstruir(status, null);
            ordem.cancelar("  Solicitação duplicada.\n");

            assertEquals("Cancelada", ordem.getStatus());
            assertEquals("Solicitação duplicada.", ordem.getMotivoCancelamento());
            assertEquals("Observação original.", ordem.getObservacoes());
            assertEquals(DATA, ordem.getDataCriacao());
            assertNull(ordem.getDataConclusao());
        }
        // A persistência do texto deve acompanhar a normalização Unicode do Socket.
        OrdemDeServico unicode = reconstruir("Aberta", null);
        unicode.cancelar("\u00A0\u0085\uFEFFSolicitação duplicada.\u00A0");
        assertEquals("Solicitação duplicada.", unicode.getMotivoCancelamento());
        OrdemDeServico separador = reconstruir("Aberta", null);
        separador.cancelar("\u001CSolicitação duplicada.\u001F");
        assertEquals("\u001CSolicitação duplicada.\u001F", separador.getMotivoCancelamento());
    }

    @Test
    void motivoAusenteOuEmBrancoNaoMudaOEstadoNemAsDatas(){
        for (String motivo : new String[]{null, "", " \t\n", "\u2003", "\u00A0", "\uFEFF", " \u00A0\uFEFF\t"}){
            OrdemDeServico ordem = reconstruir("Aberta", null);
            assertThrows(IllegalArgumentException.class, () -> ordem.cancelar(motivo));
            assertEquals("Aberta", ordem.getStatus());
            assertNull(ordem.getMotivoCancelamento());
            assertEquals(DATA, ordem.getDataAtualizacao());
            assertEquals("Observação original.", ordem.getObservacoes());
        }
    }

    @Test
    void estadosFinaisProtegemMotivoEDataJaRegistrados(){
        for (String status : new String[]{"Concluída", "Cancelada"}){
            String motivo = "Cancelada".equals(status) ? "Motivo original." : null;
            OrdemDeServico ordem = reconstruir(status, motivo);
            assertThrows(IllegalStateException.class, () -> ordem.cancelar("Outro motivo."));
            assertEquals(status, ordem.getStatus());
            assertEquals(motivo, ordem.getMotivoCancelamento());
            assertEquals(DATA, ordem.getDataAtualizacao());
        }
    }

    @Test
    void construtorLegadoPermiteConsultarCancelamentoSemInventarMotivo(){
        OrdemDeServico antiga = new OrdemDeServico(new ObjectId(), new ObjectId(), new ObjectId(),
                null, null, "OS antiga", "Descrição.", "Cancelada", "Baixa", "Observação original.",
                DATA, DATA, null, "OS-legada");

        assertEquals("Cancelada", antiga.getStatus());
        assertNull(antiga.getMotivoCancelamento());
        assertThrows(IllegalStateException.class, () -> antiga.cancelar("Motivo retroativo."));
        assertNull(antiga.getMotivoCancelamento());
    }

    private OrdemDeServico reconstruir(String status, String motivo){
        return new OrdemDeServico(new ObjectId(), new ObjectId(), new ObjectId(), null, null,
                "Ordem de teste", "Descrição.", status, "Baixa", "Observação original.",
                DATA, DATA, null, "OS-teste", null, motivo);
    }
}
