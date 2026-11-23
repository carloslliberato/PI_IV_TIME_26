// Autor: Carlos Luciano

package service;

import io.github.cdimascio.dotenv.Dotenv;

/* Classe que representa a configuração do email */
public class ConfiguracaoEmail {

    // Configuração do Dotenv para carregar variáveis de ambiente do arquivo .env localizado no diretório pai
    private static final Dotenv dotenv = Dotenv.configure()
            .directory("..")
            .load();

    // Método para obter o email do remetente a partir das variáveis de ambiente
    public static String getEmailRemetente() {
        return dotenv.get("EMAIL_REMETENTE");
    }

    // Método para obter a senha do aplicativo a partir das variáveis de ambiente
    public static String getSenhaApp() {
        return dotenv.get("EMAIL_SENHA_APP");
    }
}
