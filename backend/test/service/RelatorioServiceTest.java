package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

// Verifica os cálculos em memória, sem abrir conexão nem escrever no MongoDB.
class RelatorioServiceTest {
    private static final ObjectId MUNICIPIO_ID = new ObjectId("6ae666a7680e8a4330a1ab66");

    @Test
    void retornaGruposFixosZeradosQuandoNaoHaOrdens(){
        Map<String, Object> relatorio = RelatorioService.agruparOrdens(List.of(), MUNICIPIO_ID, 2026);

        assertEquals(0L, numero(relatorio, "totalOrdens"));
        assertEquals(0L, numero(relatorio, "totalNoAno"));
        assertEquals(0L, numero(relatorio, "ordensSemDataValida"));
        assertEquals(4, grupos(relatorio, "porStatus").size());
        assertTrue(grupos(relatorio, "porAno").isEmpty());
        assertEquals(12, grupos(relatorio, "porMes").size());
        assertEquals(2, grupos(relatorio, "porSemestre").size());
        conferirSomas(relatorio);
    }

    @Test
    void usaSaoPauloNasViradasDeAnoEMesESemestre(){
        List<Document> ordens = List.of(
                ordem("Cancelada", "2026-07-01T03:00:00Z"),
                ordem("Aberta", "2026-01-01T02:00:00Z"),
                ordem("Em andamento", "2026-01-01T03:00:00Z"),
                ordem("Concluída", "2026-07-01T02:59:59Z"));

        Map<String, Object> relatorio = RelatorioService.agruparOrdens(ordens, MUNICIPIO_ID, 2026);

        assertEquals(MUNICIPIO_ID.toHexString(), relatorio.get("municipioId"));
        assertEquals("America/Sao_Paulo", relatorio.get("fusoHorario"));
        assertEquals(2026, relatorio.get("anoSelecionado"));
        assertEquals(4L, numero(relatorio, "totalOrdens"));
        assertEquals(3L, numero(relatorio, "totalNoAno"));
        assertEquals("2025", grupos(relatorio, "porAno").get(0).get("grupo"));
        assertEquals("2026", grupos(relatorio, "porAno").get(1).get("grupo"));
        assertEquals(1L, quantidade(relatorio, "porAno", "2025"));
        assertEquals(3L, quantidade(relatorio, "porAno", "2026"));
        assertEquals(1L, quantidade(relatorio, "porMes", "Janeiro"));
        assertEquals(1L, quantidade(relatorio, "porMes", "Junho"));
        assertEquals(1L, quantidade(relatorio, "porMes", "Julho"));
        assertEquals(2L, quantidade(relatorio, "porSemestre", "1º semestre"));
        assertEquals(1L, quantidade(relatorio, "porSemestre", "2º semestre"));
        conferirSomas(relatorio);

        Map<String, Object> anoAnterior = RelatorioService.agruparOrdens(ordens, MUNICIPIO_ID, 2025);
        assertEquals(4L, numero(anoAnterior, "totalOrdens"));
        assertEquals(1L, numero(anoAnterior, "totalNoAno"));
        assertEquals(1L, quantidade(anoAnterior, "porMes", "Dezembro"));
        assertEquals(relatorio.get("porStatus"), anoAnterior.get("porStatus"));
        assertEquals(relatorio.get("porAno"), anoAnterior.get("porAno"));
        conferirSomas(anoAnterior);
    }

    @Test
    void preservaOrdensComStatusOuDatasIncompletosNosTotais(){
        List<Document> ordens = List.of(
                new Document("status", "Aberta"),
                new Document("status", "  ").append("dataCriacao", "2026-01-01T03:00:00Z"),
                new Document("status", 42).append("dataCriacao", null),
                ordem("Suspensa", "2026-02-10T12:00:00Z"),
                new Document("dataCriacao", Date.from(Instant.parse("2026-02-11T12:00:00Z"))));

        Map<String, Object> relatorio = RelatorioService.agruparOrdens(ordens, MUNICIPIO_ID, 2026);

        assertEquals(5L, numero(relatorio, "totalOrdens"));
        assertEquals(3L, numero(relatorio, "ordensSemDataValida"));
        assertEquals(2L, numero(relatorio, "totalNoAno"));
        assertEquals(1L, quantidade(relatorio, "porStatus", "Aberta"));
        assertEquals(3L, quantidade(relatorio, "porStatus", "Não informado"));
        assertEquals(1L, quantidade(relatorio, "porStatus", "Suspensa"));
        assertEquals(0L, quantidade(relatorio, "porStatus", "Cancelada"));
        conferirSomas(relatorio);
    }

    @Test
    void anoSemRegistrosMantemHistoricoEZeraSomentePeriodosSelecionados(){
        Map<String, Object> relatorio = RelatorioService.agruparOrdens(List.of(ordem("Aberta", "2026-11-19T23:00:00Z")), MUNICIPIO_ID, 2024);
        assertEquals(1L, numero(relatorio, "totalOrdens"));
        assertEquals(0L, numero(relatorio, "totalNoAno"));
        assertEquals(1L, quantidade(relatorio, "porAno", "2026"));
        assertEquals(0L, soma(relatorio, "porMes"));
        assertEquals(0L, soma(relatorio, "porSemestre"));
        conferirSomas(relatorio);
    }

    @Test
    void rejeitaAnoInformadoVazioMalformadoOuForaDaFaixa(){
        for (String invalido : List.of("", "abc", "0", "-1", "10000", "20.26", " 2026", "2026 ")) {
            assertThrows(IllegalArgumentException.class, () -> RelatorioService.selecionarAno(invalido));
        }

        assertEquals(1, RelatorioService.selecionarAno("1"));
        assertEquals(2026, RelatorioService.selecionarAno("2026"));
        assertEquals(9999, RelatorioService.selecionarAno("9999"));
    }

    private static Document ordem(String status, String data){
        return new Document("status", status).append("dataCriacao", Date.from(Instant.parse(data)));
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> grupos(Map<String, Object> relatorio, String campo){
        return (List<Map<String, Object>>) relatorio.get(campo);
    }

    private static long numero(Map<String, Object> valores, String campo){
        return ((Number) valores.get(campo)).longValue();
    }

    private static long quantidade(Map<String, Object> relatorio, String campo, String grupo){
        return grupos(relatorio, campo).stream().filter(linha -> grupo.equals(linha.get("grupo")))
                .mapToLong(linha -> numero(linha, "quantidade"))
                .findFirst().orElseThrow();
    }

    private static long soma(Map<String, Object> relatorio, String campo){
        return grupos(relatorio, campo).stream().mapToLong(linha -> numero(linha, "quantidade")).sum();
    }

    private static void conferirSomas(Map<String, Object> relatorio){
        assertEquals(numero(relatorio, "totalOrdens"), soma(relatorio, "porStatus"));
        assertEquals(numero(relatorio, "totalOrdens"),soma(relatorio, "porAno") + numero(relatorio, "ordensSemDataValida"));
        assertEquals(numero(relatorio, "totalNoAno"), soma(relatorio, "porMes"));
        assertEquals(numero(relatorio, "totalNoAno"), soma(relatorio, "porSemestre"));
    }
}
