
package repository;

import model.Conta;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import org.bson.Document;
import org.bson.types.ObjectId;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.*;

class ContaRepositoryTest {

    private final ContaRepository repository = new ContaRepository();

    private ObjectId obterMunicipioCampinas() {
        MongoDatabase banco = ConexaoMongo.getDatabase();

        MongoCollection<Document> municipios =
                banco.getCollection("municipios");

        Document municipio =
                municipios.find(eq("nome", "Campinas")).first();

        assertNotNull(municipio,
                "O município de Campinas precisa existir no banco.");

        return municipio.getObjectId("_id");
    }

    private Conta criarContaTeste() {
        return new Conta(
                "Usuário de Teste",
                "teste-" + new ObjectId() + "@arboriza.com",
                "hash-ficticio-para-teste",
                "19999999999",
                List.of("CIDADAO"),
                obterMunicipioCampinas(),
                null,
                null,
                null,
                false,
                List.of("arvores-risco")
        );
    }

    @Test
    void deveSalvarBuscarEExcluirConta() {
        Conta conta = criarContaTeste();

        try {
            repository.salvar(conta);

            Optional<Conta> resultadoEmail =
                    repository.buscarPorEmail(conta.getEmail());

            assertTrue(resultadoEmail.isPresent());
            assertEquals(conta.getNome(), resultadoEmail.get().getNome());

            Optional<Conta> resultadoId =
                    repository.buscarPorId(conta.getId());

            assertTrue(resultadoId.isPresent());
            assertEquals(conta.getEmail(), resultadoId.get().getEmail());

            assertTrue(repository.existeEmail(conta.getEmail()));

        } finally {
            repository.excluir(conta.getId());
        }

        assertFalse(repository.buscarPorEmail(conta.getEmail()).isPresent());
    }

    @Test
    void deveRetornarVazioAoBuscarIdInexistente() {
        ObjectId idInexistente = new ObjectId();

        Optional<Conta> resultado =
                repository.buscarPorId(idInexistente);

        assertTrue(resultado.isEmpty());
    }

    @Test
    void deveRetornarVazioAoBuscarEmailInexistente() {
        String emailInexistente =
                "inexistente-" + new ObjectId() + "@arboriza.com";

        Optional<Conta> resultado =
                repository.buscarPorEmail(emailInexistente);

        assertTrue(resultado.isEmpty());
    }

    @Test
    void deveRetornarFalseParaEmailInexistente() {
        String emailInexistente =
                "inexistente-" + new ObjectId() + "@arboriza.com";

        assertFalse(repository.existeEmail(emailInexistente));
    }

    @Test
    void deveRetornarFalseAoExcluirIdInexistente() {
        ObjectId idInexistente = new ObjectId();

        assertFalse(repository.excluir(idInexistente));
    }
}
