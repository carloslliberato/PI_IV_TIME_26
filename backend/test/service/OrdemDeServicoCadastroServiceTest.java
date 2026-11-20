package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import java.util.Arrays;
import java.util.List;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import dto.CadastroOrdemDeServicoDTO;

// Testa o contrato do formulário sem abrir conexão com o banco da aplicação.
class OrdemDeServicoCadastroServiceTest {
    private static final String ARVORE = "200000000000000000000001";
    private static final String OCORRENCIA = "300000000000000000000001";

    @Test
    void preservaOsDadosFinaisEditadosPeloUsuarioERemoveEspacosExternos(){
        var validado = OrdemDeServicoService.prepararCadastro(dto(ARVORE, OCORRENCIA, null,
                "  Inspeção solicitada  ", "  Descrição editada pelo funcionário.  ", "  Alta  ", "  Texto final.  "));
        assertEquals(new ObjectId(ARVORE), validado.arvoreId());
        assertEquals(new ObjectId(OCORRENCIA), validado.ocorrenciaId());
        assertEquals("Inspeção solicitada", validado.titulo());
        assertEquals("Descrição editada pelo funcionário.", validado.descricao());
        assertEquals("Alta", validado.prioridade());
        assertEquals("Texto final.", validado.observacoes());
    }

    @Test
    void exigeCorpoTituloDescricaoEArvore(){
        assertThrows(IllegalArgumentException.class, () -> OrdemDeServicoService.prepararCadastro(null));
        for (String vazio : Arrays.asList(null, "", "   ")) {
            assertThrows(IllegalArgumentException.class,
                    () -> validar(vazio, null, null, "Título", "Descrição", null, null));
            assertThrows(IllegalArgumentException.class,
                    () -> validar(ARVORE, null, null, vazio, "Descrição", null, null));
            assertThrows(IllegalArgumentException.class,
                    () -> validar(ARVORE, null, null, "Título", vazio, null, null));
        }
    }

    @Test
    void ocorrenciaPrioridadeEObservacoesSaoOpcionais(){
        for (String vazio : Arrays.asList(null, "", "   ")) {
            var dados = OrdemDeServicoService.prepararCadastro(dto(ARVORE, vazio, vazio,
                    "Título", "Descrição", vazio, vazio));
            assertNull(dados.ocorrenciaId());
            assertNull(dados.prioridade());
            assertNull(dados.observacoes());
        }
    }

    @Test
    void naoConverteUuidProtocoloOuIdentificadorInvalidoEmObjectId(){
        for (String id : List.of("abc", "d9428888-122b-11e1-b85c-61cd3cbb3210", "oco_12345678",
                "OC020261", "00000000000000000000001", "zzzzzzzzzzzzzzzzzzzzzzzz")) {
            assertThrows(IllegalArgumentException.class,
                    () -> validar(id, null, null, "Título", "Descrição", null, null));
            assertThrows(IllegalArgumentException.class,
                    () -> validar(ARVORE, id, null, "Título", "Descrição", null, null));
        }
    }

    @Test
    void aceitaLimitesDeTextoERejeitaExcessoSemTruncar(){
        String titulo = "T".repeat(160);
        String descricao = "D".repeat(4000);
        String prioridade = "P".repeat(40);
        String observacoes = "O".repeat(4000);
        validar(ARVORE, null, null, titulo, descricao, prioridade, observacoes);
        assertThrows(IllegalArgumentException.class,
                () -> validar(ARVORE, null, null, titulo + "X", descricao, prioridade, observacoes));
        assertThrows(IllegalArgumentException.class,
                () -> validar(ARVORE, null, null, titulo, descricao + "X", prioridade, observacoes));
        assertThrows(IllegalArgumentException.class,
                () -> validar(ARVORE, null, null, titulo, descricao, prioridade + "X", observacoes));
        assertThrows(IllegalArgumentException.class,
                () -> validar(ARVORE, null, null, titulo, descricao, prioridade, observacoes + "X"));
    }

    @Test
    void recusaAtribuicaoDeEquipeNoCadastroInicial(){
        assertThrows(IllegalArgumentException.class,
                () -> validar(ARVORE, null, "400000000000000000000001", "Título", "Descrição", null, null));
    }

    private static void validar(String arvore, String ocorrencia, String equipe,
            String titulo, String descricao, String prioridade, String observacoes){
        OrdemDeServicoService.prepararCadastro(dto(arvore, ocorrencia, equipe, titulo, descricao, prioridade, observacoes));
    }

    private static CadastroOrdemDeServicoDTO dto(String arvore, String ocorrencia, String equipe,
            String titulo, String descricao, String prioridade, String observacoes){
        JsonObject json = new JsonObject();
        json.addProperty("arvoreId", arvore);
        json.addProperty("ocorrenciaId", ocorrencia);
        json.addProperty("equipeId", equipe);
        json.addProperty("titulo", titulo);
        json.addProperty("descricao", descricao);
        json.addProperty("prioridade", prioridade);
        json.addProperty("observacoes", observacoes);
        return new Gson().fromJson(json, CadastroOrdemDeServicoDTO.class);
    }
}
