package backend.src.http;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress; // Classe que reprresenta um endereço de rede e uma porta

public class ServidorHttp {

    public static void conectar() throws IOException {

        // cria um endereço de rede associadda a porta 8080
        InetSocketAddress endereco = new InetSocketAddress(8080);

        // cria o servidor HTTP no endereço de rede definido
        /*
         * 0 indica que não estamos solicitando um limite específico de conexões
         * pendentes
         * na fila de espera
         */
        HttpServer servidor = HttpServer.create(endereco, 0);

        // A rota de cadastro de funcionário recebe POSTs antes do handler genérico de arquivos.
        // FUTURO BACK-END: substituir o armazenamento de demonstração do handler por repository/DAO e banco.
        servidor.createContext("/api/equipes/", new FuncionarioEquipeApiHandler());

        // caminho do contexto
        servidor.createContext("/", new ArquivosEstaticosHandler());
        servidor.start();

        System.out.println("Servidor HTTP ativo em http:localhost:8080");

    }
}
