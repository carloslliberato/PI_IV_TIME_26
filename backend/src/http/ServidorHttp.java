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

        // caminho do contexto
        servidor.createContext("/", new ArquivosEstaticosHandler());
        servidor.start();

        System.out.println("Servidor HTTP ativo em http:localhost:8080");

    }
}
