package service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

// Testa o cliente usando HTTP local, sem depender do serviço público.
class NominatimGeocodificadorTest {
    private HttpServer servidor;
    private final AtomicInteger requisicoes = new AtomicInteger();
    private final AtomicReference<String> userAgent = new AtomicReference<>();
    private volatile String resposta = "[]";

    // Cria um endpoint falso que registra a chamada e devolve a resposta definida pelo teste.
    @BeforeEach
    void iniciarServidorLocal() throws Exception {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/search", troca -> {
            requisicoes.incrementAndGet();
            userAgent.set(troca.getRequestHeaders().getFirst("User-Agent"));
            byte[] corpo = resposta.getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().set("Content-Type", "application/json");
            troca.sendResponseHeaders(200, corpo.length);
            try (var saida = troca.getResponseBody()) {
                saida.write(corpo);
            }
        });
        servidor.start();
    }

    // Encerra o servidor local para não deixar recursos abertos entre os testes.
    @AfterEach
    void encerrarServidorLocal() {
        if (servidor != null) {
            servidor.stop(0);
        }
    }

    @Test
    void consultaCoordenadasEReutilizaRespostaEmCache() {
        // Resposta válida: verifica coordenadas, cache e identificação da aplicação.
        resposta = "[{\"lat\":\"-22.9056\",\"lon\":\"-47.0608\"}]";
        Geocodificador geocodificador = criarGeocodificador();

        var esperado = Optional.of(new Geocodificador.Coordenadas(-22.9056, -47.0608));
        assertEquals(esperado, geocodificador.geocodificar(
                "Rua das Árvores", "12", "Centro", "Campinas"));
        assertEquals(esperado, geocodificador.geocodificar(
                "Rua das Árvores", "12", "Centro", "Campinas"));

        assertEquals(1, requisicoes.get());
        assertEquals("Arboriza-Test/1.0", userAgent.get());
    }

    @Test
    void retornaSemCoordenadasQuandoEnderecoNaoTemCorrespondencia() {
        // Lista vazia do provedor representa endereço sem correspondência.
        Geocodificador geocodificador = criarGeocodificador();

        assertTrue(geocodificador.geocodificar(
                "Rua sem correspondência", null, "Centro", "Campinas").isEmpty());
    }

    private Geocodificador criarGeocodificador() {
        // Injeta a URL aleatória do servidor local e um User-Agent próprio para o teste.
        URI endpoint = URI.create("http://127.0.0.1:" + servidor.getAddress().getPort() + "/search");
        return new NominatimGeocodificador(
                HttpClient.newHttpClient(), endpoint, "Arboriza-Test/1.0");
    }
}
