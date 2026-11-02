
package service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

public class ServicoEmailTest {

    @Test
    public void deveEnviarEmail() {

        ServicoEmail servicoEmail = new ServicoEmail();

        String destinatario = "carloslsliberato@gmail.com";

        String assunto = "Teste de envio - Arboriza";

        String mensagem = """
                Olá!

                Este é um teste de envio de e-mail do sistema Arboriza.

                Se você recebeu esta mensagem, a configuração está funcionando!

                Equipe Arboriza.
                """;

        assertDoesNotThrow(() -> {
            servicoEmail.enviarEmail(destinatario, assunto, mensagem);
        });
    }
}
