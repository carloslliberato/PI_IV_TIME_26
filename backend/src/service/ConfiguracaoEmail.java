
package service;

import io.github.cdimascio.dotenv.Dotenv;

public class ConfiguracaoEmail {

    private static final Dotenv dotenv = Dotenv.configure()
            .directory("..")
            .load();

    public static String getEmailRemetente() {
        return dotenv.get("EMAIL_REMETENTE");
    }

    public static String getSenhaApp() {
        return dotenv.get("EMAIL_SENHA_APP");
    }
}
