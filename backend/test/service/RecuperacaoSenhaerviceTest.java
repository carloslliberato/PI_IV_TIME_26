
package service;

import model.Conta;
import model.RecuperacaoSenha;

import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;

import org.bson.Document;
import org.bson.types.ObjectId;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.*;

import org.mindrot.jbcrypt.BCrypt;

import repository.ConexaoMongo;
class RecuperacaoSenhaServiceTest {

    private final ContaRepository contaRepository =
            new ContaRepository();

    private final RecuperacaoSenhaRepository recuperacaoRepository =
            new RecuperacaoSenhaRepository();

    private final MunicipioRepository municipioRepository =
            new MunicipioRepository();

    private final ServicoEmail servicoEmail =
            new ServicoEmail();

    private final ConexaoServidor conexaoServidor =
            new ConexaoServidor("localhost", 3000);

    private final ContaService contaService =
            new ContaService(
                    contaRepository,
                    municipioRepository,
                    conexaoServidor);

    private final RecuperacaoSenhaService recuperacaoService =
            new RecuperacaoSenhaService(
                    contaRepository,
                    recuperacaoRepository,
                    servicoEmail,
                    contaService);

    private ObjectId obterMunicipioCampinas() {

        Document municipio = ConexaoMongo.getDatabase()
                .getCollection("municipios")
                .find(eq("nome", "Campinas"))
                .first();

        assertNotNull(municipio,
                "O município de Campinas precisa existir no banco.");

        return municipio.getObjectId("_id");
    }

    @Test
    void deveSolicitarRecuperacaoDeSenha() {

        // Utiliza o e-mail configurado no .env
        String email = ConfiguracaoEmail.getEmailRemetente();

        // Verifica se já existe uma conta com esse e-mail
        assertFalse(contaRepository.existeEmail(email),
                "Remova a conta de teste anterior pelo Compass antes de executar.");

        // Cria uma conta temporária
        Conta conta = new Conta(
                "Usuário Teste Recuperação",
                email,
                BCrypt.hashpw("senhaAntiga123", BCrypt.gensalt()),
                "19999999999",
                List.of("CIDADAO"),
                obterMunicipioCampinas(),
                null,
                null,
                null,
                false,
                List.of());

        contaRepository.salvar(conta);

        // Solicita a recuperação de senha
        recuperacaoService.solicitarRecuperacao(email);

        // Verifica se o registro foi criado no MongoDB
        Optional<RecuperacaoSenha> resultado =
                recuperacaoRepository.buscarPorContaId(conta.getId());

        assertTrue(resultado.isPresent(),
                "O registro de recuperação deveria ter sido criado.");

        assertFalse(resultado.get().isUtilizado());

        assertEquals(0, resultado.get().getTentativas());

        System.out.println("Solicitação de recuperação realizada!");
        System.out.println("Confira o código enviado ao Gmail.");
        System.out.println("ID da conta: " + conta.getId());
    }
}
