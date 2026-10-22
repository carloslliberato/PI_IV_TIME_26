package backend.src.http;

import backend.src.model.Arvore;

import repository.ArvoreRepository;

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

            ArvoreRepository repository = new ArvoreRepository();

            ArrayList<Arvore> arvores = repository.buscarTodas();   

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

        else if ("POST".equals(metodo)) {

            Gson gson = new Gson();

            String corpo = new String(
                exchange.getRequestBody().readAllBytes(),
                StandardCharsets.UTF_8
            );

            Arvore arvore = gson.fromJson(corpo, Arvore.class);

            ArvoreRepository repository = new ArvoreRepository();
            repository.salvar(arvore);

            byte[] respostaBytes =
                gson.toJson(arvore).getBytes(StandardCharsets.UTF_8);

            exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json; charset=UTF-8"
            );

            exchange.sendResponseHeaders(
                201,
                respostaBytes.length
            );

            try (OutputStream saida = exchange.getResponseBody()) {
                saida.write(respostaBytes);
            }
        }
    }
}