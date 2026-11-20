package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import dto.ConclusaoOrdemDeServicoDTO;

// Valida o conteúdo do registro sem conectar ao MongoDB.
class OrdemDeServicoConclusaoServiceTest {
    private static final Instant AGORA = Instant.parse("2026-11-20T15:00:00Z");
    private static final Gson GSON = new Gson();

    @Test
    void normalizaTextoEConverteHorarioComFusoSemAlterarOConteudoDoServico(){
        var dados = preparar("  Inspeção  ", "  Inspeção realizada.\nSem necessidade de poda.  ",
                "2026-11-20T11:30:00-03:00", List.of("  https://example.org/foto-1.jpg  "));

        assertEquals("Inspeção", dados.tipo());
        assertEquals("Inspeção realizada.\nSem necessidade de poda.", dados.descricao());
        assertEquals(Instant.parse("2026-11-20T14:30:00Z"), dados.dataExecucao());
        assertEquals(List.of("https://example.org/foto-1.jpg"), dados.fotos());
    }

    @Test
    void aceitaConclusaoSemFotosEUsaHorarioDoServidorQuandoExecucaoNaoFoiInformada(){
        var dados = preparar("Poda", "Poda executada e resíduos recolhidos.", null, null);

        assertEquals(AGORA, dados.dataExecucao());
        assertTrue(dados.fotos().isEmpty());
        assertTrue(preparar("Poda", "Serviço executado.", null, List.of()).fotos().isEmpty());
    }

    @Test
    void exigeCorpoTipoEDescricaoMesmoQuandoContemSomenteEspacos(){
        assertThrows(IllegalArgumentException.class,
                () -> OrdemDeServicoService.prepararConclusao(null, AGORA));
        for (String vazio : Arrays.asList(null, "", "   ", "\n\t")) {
            assertThrows(IllegalArgumentException.class,
                    () -> preparar(vazio, "Serviço executado.", null, null));
            assertThrows(IllegalArgumentException.class,
                    () -> preparar("Poda", vazio, null, null));
        }
    }

    @Test
    void respeitaLimitesDeTextoSemTruncarORegistro(){
        String tipo = "T".repeat(80);
        String descricao = "D".repeat(4000);
        var valido = preparar(tipo, descricao, null, null);
        assertEquals(tipo, valido.tipo());
        assertEquals(descricao, valido.descricao());

        assertThrows(IllegalArgumentException.class,
                () -> preparar(tipo + "X", descricao, null, null));
        assertThrows(IllegalArgumentException.class,
                () -> preparar(tipo, descricao + "X", null, null));
    }

    @Test
    void rejeitaExecucaoFuturaSemFusoOuComDataInvalida(){
        for (String data : List.of(
                "2026-11-20T15:00:01Z", "2026-11-20T12:00:01-03:00",
                "2026-11-20T12:00:00", "2026-11-20", "", "   ",
                "2026-02-30T12:00:00Z", "0000-01-01T00:00:00Z",
                "+10000-01-01T00:00:00Z")) {
            assertThrows(IllegalArgumentException.class,
                    () -> preparar("Poda", "Serviço executado.", data, null), data);
        }
        assertEquals(AGORA,
                preparar("Poda", "Serviço executado.", "2026-11-20T12:00:00-03:00", null).dataExecucao());
    }

    @Test
    void aceitaSomenteReferenciasHttpOuHttpsAbsolutasSemCredenciais(){
        for (String foto : List.of(
                "javascript:alert(1)", "data:image/png;base64,AAAA", "file:///tmp/foto.png",
                "ftp://example.org/foto.jpg", "/foto.jpg", "//example.org/foto.jpg",
                "https:///foto.jpg", "https://usuario:senha@example.org/foto.jpg",
                "https://example.org/foto com espaco.jpg", "")) {
            assertThrows(IllegalArgumentException.class,
                    () -> preparar("Poda", "Serviço executado.", null, List.of(foto)), foto);
        }
        var fotos = List.of("https://example.org/foto.jpg?versao=2", "http://example.org/foto-2.jpg");
        assertEquals(fotos, preparar("Poda", "Serviço executado.", null, fotos).fotos());
    }

    @Test
    void limitaQuantidadeETamanhoDasReferenciasERejeitaEntradasNulas(){
        List<String> dezFotos = new ArrayList<>();
        for (int i = 0; i < 10; i++) dezFotos.add("https://example.org/foto-" + i + ".jpg");
        assertEquals(10, preparar("Poda", "Serviço executado.", null, dezFotos).fotos().size());
        dezFotos.add("https://example.org/foto-10.jpg");
        assertThrows(IllegalArgumentException.class,
                () -> preparar("Poda", "Serviço executado.", null, dezFotos));

        String prefixo = "https://example.org/";
        String referenciaLimite = prefixo + "a".repeat(2048 - prefixo.length());
        assertEquals(referenciaLimite,
                preparar("Poda", "Serviço executado.", null, List.of(referenciaLimite)).fotos().get(0));
        assertThrows(IllegalArgumentException.class,
                () -> preparar("Poda", "Serviço executado.", null, List.of(referenciaLimite + "a")));
        assertThrows(IllegalArgumentException.class,
                () -> preparar("Poda", "Serviço executado.", null, Arrays.asList((String) null)));
    }

    @Test
    void mantemCopiaImutavelDasFotosDepoisDaValidacao(){
        ConclusaoOrdemDeServicoDTO entrada = dto("Poda", "Serviço executado.", null,
                List.of("https://example.org/foto.jpg"));
        var dados = OrdemDeServicoService.prepararConclusao(entrada, AGORA);
        entrada.getFotos().clear();

        assertEquals(List.of("https://example.org/foto.jpg"), dados.fotos());
        assertThrows(UnsupportedOperationException.class,
                () -> dados.fotos().add("https://example.org/outra.jpg"));
    }

    private static OrdemDeServicoService.ConclusaoValidada preparar(
            String tipo, String descricao, String dataExecucao, List<String> fotos){
        return OrdemDeServicoService.prepararConclusao(dto(tipo, descricao, dataExecucao, fotos), AGORA);
    }

    private static ConclusaoOrdemDeServicoDTO dto(
            String tipo, String descricao, String dataExecucao, List<String> fotos){
        JsonObject json = new JsonObject();
        json.addProperty("tipo", tipo);
        json.addProperty("descricao", descricao);
        json.addProperty("dataExecucao", dataExecucao);
        if (fotos != null) {
            JsonArray referencias = new JsonArray();
            for (String foto : fotos) referencias.add(foto);
            json.add("fotos", referencias);
        }
        return GSON.fromJson(json, ConclusaoOrdemDeServicoDTO.class);
    }
}
