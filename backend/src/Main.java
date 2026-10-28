import service.ConexaoServidor;

import java.io.IOException;

public class Main {
    public static final String HOST_PADRAO = "localhost";
    public static final int PORTA_PADRAO = 3000;

    public static void main(String[] args) {

        if (args.length > 2) {
            System.err.println("Uso esperado: java backend.src.Main [HOST [PORTA]]\n");
            return;
        }

        ConexaoServidor conexaoServidor = null;
        try {
            String host = Main.HOST_PADRAO;
            int porta = Main.PORTA_PADRAO;

            if (args.length > 0)
                host = args[0];

            if (args.length == 2)
                porta = Integer.parseInt(args[1]);

            conexaoServidor = new ConexaoServidor(host, porta);
        } catch (Exception erro) {
            System.err.println("Indique o servidor e a porta corretos!\n");
            return;
        }

        boolean conectado = conexaoServidor.conectar();
        if (conectado) {
            System.out.println("Conexão servidor-cliente estabelecida com sucesso!");
        } else {
            System.err.println("Não foi possível iniciar a conexão.");
            return;
        }
        repository.ConexaoMongo.getDatabase();

    }
}
