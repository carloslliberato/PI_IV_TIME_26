package backend.src.http;

import backend.src.model.Arvore;
import backend.src.model.Risco;

import com.google.gson.Gson;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;

public class ArvoreApiHandler implements HttpHandler {

    @Override
    public void handle(HttpExchange exchange) throws IOException {

        String metodo = exchange.getRequestMethod();

        if ("GET".equals(metodo)) {

            Arvore arvore1 = new Arvore(
                1,
                "Ipê-amarelo",
                -22.90,
                -47.06,
                Risco.ALTO
            );

            Arvore arvore2 = new Arvore(
                2,
                "Cerejeira-japonesa",
                -22.91,
                -47.05,
                Risco.MODERADO
            );

            ArrayList<Arvore> arvores = new ArrayList<>();

            arvores.add(arvore1);
            arvores.add(arvore2);

            Gson gson = new Gson();

            String resposta = gson.toJson(arvores);

            byte[] respostaBytes = resposta.getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json; charset=UTF-8"
            );

            exchange.sendResponseHeaders(200, respostaBytes.length);

            try (OutputStream saida = exchange.getResponseBody()) {
                saida.write(respostaBytes);
            }

        }
    }
}