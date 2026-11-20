package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.Arrays;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;

class OrdemDeServicoEquipeServiceTest {
    @Test
    void exigeCorpoEIdentificadorDaEquipe(){
        assertThrows(IllegalArgumentException.class, () -> OrdemDeServicoService.validarIdEquipe(null));
        for (String valor : Arrays.asList(null, "", "   ", "abc", "00000000000000000000001", "0000000000000000000000011", "zzzzzzzzzzzzzzzzzzzzzzzz")) {
            assertThrows(IllegalArgumentException.class, () -> OrdemDeServicoService.validarIdEquipe(dto(valor)));
        }
    }

    @Test
    void converteSomenteObjectIdValidoSemConfundirComCodigoDeExibicao(){
        assertEquals(new ObjectId("6ae666a7680e8a4330a1ab66"),
                OrdemDeServicoService.validarIdEquipe(dto("6ae666a7680e8a4330a1ab66")));
        assertThrows(IllegalArgumentException.class,
                () -> OrdemDeServicoService.validarIdEquipe(dto("EQ020261")));
    }

    private static AtribuicaoEquipeOrdemDeServicoDTO dto(String equipeId){
        JsonObject json = new JsonObject();
        json.addProperty("equipeId", equipeId);
        return new Gson().fromJson(json, AtribuicaoEquipeOrdemDeServicoDTO.class);
    }
}
