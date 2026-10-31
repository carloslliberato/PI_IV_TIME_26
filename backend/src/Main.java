import service.ConexaoServidor;
import repository.ConexaoMongo;
import service.ServidorHttp;

import java.util.concurrent.atomic.AtomicBoolean;

public class Main {

    public static final String HOST_PADRAO = "localhost";
    public static final int PORTA_PADRAO = 3000;

    private static ConexaoServidor conexaoServidor;
    private static ServidorHttp servidorHttp;

    private static boolean mongoConectado = false;

    private static final AtomicBoolean ENCERRADO =
        new AtomicBoolean(false);

    public static void main(String[] args) {

        // Registra o procedimento de encerramento da aplicação.
        Runtime.getRuntime().addShutdownHook(
            new Thread(Main::fecharRecursos)
        );

        try {

            // 1. Conexão com o servidor Socket do professor.
            conexaoServidor = new ConexaoServidor(
                HOST_PADRAO,
                PORTA_PADRAO
            );

            if (!conexaoServidor.conectar()) {
                throw new RuntimeException(
                    "Não foi possível conectar ao servidor Socket."
                );
            }

            System.out.println(
                "Conexão com o servidor Socket estabelecida!"
            );

            // 2. Conexão com o MongoDB.
            ConexaoMongo.getDatabase();
            mongoConectado = true;

            System.out.println(
                "Conexão com o banco de dados estabelecida!"
            );

            // 3. Inicialização do servidor HTTP.
            servidorHttp = new ServidorHttp();
            servidorHttp.iniciar();

            System.out.println("Arboriza iniciado com sucesso!");

        } catch (Exception erro) {

            System.err.println(
                "Erro ao iniciar o Arboriza: " + erro.getMessage()
            );

            fecharRecursos();
        }
    }

    private static void fecharRecursos() {
System.out.println(">>> SHUTDOWN HOOK EXECUTADO!");
        // Evita que os recursos sejam fechados duas vezes.
        if (!ENCERRADO.compareAndSet(false, true)) {
            return;
        }

        System.out.println("\nEncerrando Arboriza...");

        // Fecha o servidor HTTP.
        try {
            if (servidorHttp != null) {
                servidorHttp.fechar();
            }
        } catch (Exception erro) {
            System.err.println(
                "Erro ao encerrar servidor HTTP: " + erro.getMessage()
            );
        }

        // Fecha o MongoDB.
        try {
            if (mongoConectado) {
                ConexaoMongo.fechar();
                mongoConectado = false;
            }
        } catch (Exception erro) {
            System.err.println(
                "Erro ao encerrar MongoDB: " + erro.getMessage()
            );
        }

        // Fecha o servidor Socket.
        try {
            if (conexaoServidor != null) {
                conexaoServidor.fechar();
            }
        } catch (Exception erro) {
            System.err.println(
                "Erro ao encerrar servidor Socket: " + erro.getMessage()
            );
        }

        System.out.println("Arboriza encerrado!");
    }
}