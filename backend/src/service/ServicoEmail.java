
package service;

import java.util.Properties;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

public class ServicoEmail {

    public void enviarEmail(String destinatario, String assunto, String mensagem) {

        String remetente = ConfiguracaoEmail.getEmailRemetente();
        String senha = ConfiguracaoEmail.getSenhaApp();

        Properties propriedades = new Properties();

        propriedades.put("mail.smtp.auth", "true");
        propriedades.put("mail.smtp.starttls.enable", "true");
        propriedades.put("mail.smtp.host", "smtp.gmail.com");
        propriedades.put("mail.smtp.port", "587");

        Session sessao = Session.getInstance(propriedades, new Authenticator() {

            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(remetente, senha);
            }
        });

        try {
            Message email = new MimeMessage(sessao);

            email.setFrom(new InternetAddress(remetente));
            email.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse(destinatario)
            );

            email.setSubject(assunto);
            email.setText(mensagem);

            Transport.send(email);

        } catch (Exception e) {
            throw new RuntimeException("Erro ao enviar e-mail.", e);
        }
    }
}
