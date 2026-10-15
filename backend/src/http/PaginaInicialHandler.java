package backend.src.http;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public class PaginaInicialHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {

        Path caminho = Path.of(
            "..",
            "frontend",
            "Perfil_Publico",
            "index.html"
        );

        // o corpo de uma resposta http é transmitido como bytes
        byte[] corpo = Files.readAllBytes(caminho);

        // configuração do cabeçalho da resposta
        exchange.getResponseHeaders().set(
                "Content-Type",
                "text/html; charset=UTF-8");

        // enviando o status HTTP e tamanho do corpo que será enviado
        exchange.sendResponseHeaders(200, corpo.length);

        // enviando o conteúdo
        exchange.getResponseBody().write(corpo);
        exchange.close();
    }
}
