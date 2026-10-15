
package backend.src.http;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class ArquivosEstaticosHandler implements HttpHandler {

    private final Path pastaPublica = Path.of(
            "..", "frontend", "Perfil_Publico").toAbsolutePath().normalize();

    private static final Map<String, String> TIPOS_CONTEUDO = Map.of(
            ".html", "text/html; charset=UTF-8",
            ".css", "text/css; charset=UTF-8",
            ".js", "text/javascript; charset=UTF-8",
            ".json", "application/json; charset=UTF-8",
            ".png", "image/png",
            ".jpg", "image/jpeg",
            ".jpeg", "image/jpeg",
            ".svg", "image/svg+xml",
            ".ico", "image/x-icon");

    @Override
    public void handle(HttpExchange exchange) throws IOException {

        String caminhoRequisitado = exchange.getRequestURI().getPath();

        if (caminhoRequisitado.equals("/")) {
            caminhoRequisitado = "/index.html";
        }

        Path arquivo = pastaPublica.resolve(
                caminhoRequisitado.substring(1)).normalize();

        if (!arquivo.startsWith(pastaPublica)) {
            responderErro(exchange, 403, "Acesso proibido");
            return;
        }

        if (!Files.isRegularFile(arquivo)) {
            responderErro(exchange, 404, "Arquivo não encontrado");
            return;
        }

        String nome = arquivo.getFileName().toString();
        int ponto = nome.lastIndexOf('.');
        String extensao = ponto >= 0
                ? nome.substring(ponto).toLowerCase()
                : "";

        String tipo = TIPOS_CONTEUDO.getOrDefault(
                extensao, "application/octet-stream");

        byte[] corpo = Files.readAllBytes(arquivo);

        exchange.getResponseHeaders().set("Content-Type", tipo);
        exchange.sendResponseHeaders(200, corpo.length);
        exchange.getResponseBody().write(corpo);
        exchange.close();
    }

    private void responderErro(
            HttpExchange exchange,
            int codigo,
            String mensagem) throws IOException {

        byte[] corpo = mensagem.getBytes(
                java.nio.charset.StandardCharsets.UTF_8);

        exchange.getResponseHeaders().set(
                "Content-Type", "text/plain; charset=UTF-8");

        exchange.sendResponseHeaders(codigo, corpo.length);
        exchange.getResponseBody().write(corpo);
        exchange.close();
    }
}
