package repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.LinkedHashMap;
import java.util.Map;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

class ArvoreCodigoGlobalTest {
    @Test
    void preservaNumerosUnicosEReatribuiDuplicadosEntreMunicipios() {
        ObjectId primeiraArvore = new ObjectId("200000000000000000000001");
        ObjectId segundaArvore = new ObjectId("200000000000000000000002");
        ObjectId terceiraArvore = new ObjectId("200000000000000000000003");
        Map<ObjectId, String> codigosAntigos = new LinkedHashMap<>();
        codigosAntigos.put(primeiraArvore, "ARV-CAM-00004");
        codigosAntigos.put(segundaArvore, "ARV-RIO-00004");
        codigosAntigos.put(terceiraArvore, "ARV-CAM-00008");

        Map<ObjectId, String> codigosNovos =
                ArvoreRepository.calcularCodigosGlobais(codigosAntigos);

        assertEquals("AR-00004", codigosNovos.get(primeiraArvore));
        assertEquals("AR-00009", codigosNovos.get(segundaArvore));
        assertEquals("AR-00008", codigosNovos.get(terceiraArvore));
    }

    @Test
    void atribuiSequenciaNovaAArvoresSemCodigo() {
        ObjectId arvoreComCodigo = new ObjectId("200000000000000000000001");
        ObjectId arvoreSemCodigo = new ObjectId("200000000000000000000002");
        Map<ObjectId, String> codigosAntigos = new LinkedHashMap<>();
        codigosAntigos.put(arvoreComCodigo, "ARV-CAM-00004");
        codigosAntigos.put(arvoreSemCodigo, null);

        Map<ObjectId, String> codigosNovos =
                ArvoreRepository.calcularCodigosGlobais(codigosAntigos);

        assertEquals("AR-00004", codigosNovos.get(arvoreComCodigo));
        assertEquals("AR-00005", codigosNovos.get(arvoreSemCodigo));
    }
}
