package model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;

class EquipeTest {

    @Test
    void deveCriarEquipeComStatusInicialEDadosDeVinculo() {
        ObjectId municipioId = new ObjectId();
        ObjectId usuarioId = new ObjectId();

        // Cria uma equipe com os dados enviados e os vínculos do funcionário.
        Equipe equipe = new Equipe(
                "Equipe Leste",
                "Bairros da região Leste",
                "Ana Silva",
                municipioId,
                "Campinas",
                usuarioId,
                "Bruno Souza");

        // Confirma o estado inicial e os IDs que serão salvos no MongoDB.
        assertNotNull(equipe.getId());
        assertEquals("Disponível", equipe.getStatus());
        assertEquals(municipioId, equipe.getMunicipioId());
        assertEquals("Campinas", equipe.getMunicipioNome());
        assertEquals(usuarioId, equipe.getUsuarioId());
        assertEquals("Bruno Souza", equipe.getUsuarioNome());
        assertNotNull(equipe.getDataCadastro());
    }

    @Test
    void naoDeveCriarEquipeSemRegiaoDeAtuacao() {
        assertThrows(IllegalArgumentException.class, () -> new Equipe(
                "Equipe Leste",
                " ",
                "Ana Silva",
                new ObjectId(),
                "Campinas",
                new ObjectId(),
                "Bruno Souza"));
    }
}
