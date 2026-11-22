// Autor: Gabrielle Mota

package service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.logging.Logger;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;
import com.google.gson.JsonParser;

// Implementa o contrato usando a API de busca do Nominatim/OpenStreetMap.
public final class NominatimGeocodificador implements Geocodificador {
    // Configurações para identificar a aplicação, limitar chamadas e controlar o cache.
    private static final Logger LOGGER = Logger.getLogger(NominatimGeocodificador.class.getName());
    private static final long INTERVALO_MINIMO_NANOS = Duration.ofSeconds(1).toNanos();
    private static final int TAMANHO_MAXIMO_CACHE = 5000;
    private static final URI ENDPOINT_PUBLICO = URI.create(
            "https://nominatim.openstreetmap.org/search");
    private static final String USER_AGENT_PADRAO =
            "Arboriza/1.0 (+https://github.com/carloslliberato/PI_IV_TIME_26)";

    // Dependências e configurações que podem ser substituídas nos testes.
    private final HttpClient cliente;
    private final URI endpoint;
    private final String userAgent;

    // Cache LRU para reaproveitar consultas recentes e evitar chamadas repetidas.
    private final Map<String, Optional<Coordenadas>> cache =
            new LinkedHashMap<>(128, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(
                        Map.Entry<String, Optional<Coordenadas>> eldest) {
                    return size() > TAMANHO_MAXIMO_CACHE;
                }
            };
    private long inicioUltimaConsultaNanos;
    private boolean jaConsultou;

    // Lê endpoint e User-Agent do ambiente; usa valores padrão se não configurados.
    public NominatimGeocodificador() {
        this(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                URI.create(System.getenv().getOrDefault(
                        "NOMINATIM_SEARCH_ENDPOINT", ENDPOINT_PUBLICO.toString())),
                System.getenv().getOrDefault("NOMINATIM_USER_AGENT", USER_AGENT_PADRAO));
    }

    // Construtor interno usado para injetar um servidor local nos testes.
    NominatimGeocodificador(HttpClient cliente, URI endpoint, String userAgent) {
        if (cliente == null || endpoint == null || userAgent == null || userAgent.isBlank()) {
            throw new IllegalArgumentException("A configuração do Nominatim é obrigatória.");
        }
        this.cliente = cliente;
        this.endpoint = endpoint;
        this.userAgent = userAgent;
    }

    @Override
    public synchronized Optional<Coordenadas> geocodificar(
            String endereco,
            String numero,
            String bairro,
            String municipio) {
        // Monta e valida o endereço antes de consultar o provedor.
        String consulta = montarConsulta(endereco, numero, bairro, municipio);
        if (consulta == null) {
            return Optional.empty();
        }

        // Normaliza a chave e retorna resultado em cache sem gerar uma nova requisição.
        String chave = normalizar(consulta);
        Optional<Coordenadas> emCache = cache.get(chave);
        if (emCache != null) {
            return emCache;
        }

        // Respeita o intervalo mínimo do serviço público entre consultas externas.
        if (!aguardarIntervaloMinimo()) {
            return Optional.empty();
        }

        // Prepara a consulta com identificação da aplicação e limites de resposta.
        inicioUltimaConsultaNanos = System.nanoTime();
        jaConsultou = true;
        HttpRequest requisicao = HttpRequest.newBuilder(criarUri(consulta))
                .timeout(Duration.ofSeconds(10))
                .header("User-Agent", userAgent)
                .header("Accept", "application/json")
                .GET()
                .build();

        // Envia a requisição, valida o status e interpreta as coordenadas retornadas.
        try {
            HttpResponse<String> resposta = cliente.send(
                    requisicao, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resposta.statusCode() != 200) {
                LOGGER.warning("Nominatim respondeu com HTTP " + resposta.statusCode() + ".");
                return Optional.empty();
            }

            Optional<Coordenadas> coordenadas = lerCoordenadas(resposta.body());
            // Guarda também resultados vazios para evitar repetir endereços sem correspondência.
            cache.put(chave, coordenadas);
            return coordenadas;
        } catch (IOException erro) {
            LOGGER.warning("Consulta ao Nominatim indisponível: " + erro.getClass().getSimpleName());
            return Optional.empty();
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            LOGGER.warning("Consulta ao Nominatim interrompida.");
            return Optional.empty();
        } catch (JsonParseException | IllegalStateException | NumberFormatException erro) {
            LOGGER.warning("Resposta inválida recebida do Nominatim: " + erro.getMessage());
            return Optional.empty();
        }
    }

    private String montarConsulta(String endereco, String numero, String bairro, String municipio) {
        // Sem rua/endereço ou município a consulta não é suficientemente específica.
        if (endereco == null || endereco.isBlank() || municipio == null || municipio.isBlank()) {
            return null;
        }

        // Inclui número apenas quando ele ainda não faz parte do texto da rua.
        String rua = endereco.trim();
        if (numero != null && !numero.isBlank() && !rua.contains(numero.trim())) {
            rua += ", " + numero.trim();
        }

        // Acrescenta referências geográficas para reduzir ambiguidades entre cidades.
        List<String> partes = new ArrayList<>();
        partes.add(rua);
        adicionarParte(partes, bairro);
        partes.add(municipio.replaceFirst("(?i)\\s*[-,]\\s*sp\\s*$", "").trim());
        partes.add("São Paulo");
        partes.add("Brasil");
        return String.join(", ", partes);
    }

    private void adicionarParte(List<String> partes, String valor) {
        if (valor != null && !valor.isBlank()) {
            partes.add(valor.trim());
        }
    }

    private URI criarUri(String consulta) {
        // Codifica a busca e solicita uma única resposta no formato JSON do Nominatim.
        String separador = endpoint.toString().contains("?") ? "&" : "?";
        String parametro = URLEncoder.encode(consulta, StandardCharsets.UTF_8);
        return URI.create(endpoint + separador
                + "q=" + parametro
                + "&format=jsonv2&addressdetails=1&limit=1&countrycodes=br");
    }

    private Optional<Coordenadas> lerCoordenadas(String corpo) {
        // Confirma o formato da resposta e trata lista vazia como endereço não localizado.
        JsonElement raiz = JsonParser.parseString(corpo);
        if (!raiz.isJsonArray()) {
            throw new JsonParseException("O resultado não é uma lista.");
        }
        JsonArray resultados = raiz.getAsJsonArray();
        if (resultados.isEmpty()) {
            return Optional.empty();
        }

        JsonElement primeiro = resultados.get(0);
        if (!primeiro.isJsonObject()) {
            throw new JsonParseException("O resultado não é um objeto.");
        }
        JsonObject resultado = primeiro.getAsJsonObject();
        // Rejeita respostas sem os dois valores necessários para criar um ponto no mapa.
        if (!resultado.has("lat") || !resultado.has("lon")
                || !resultado.get("lat").isJsonPrimitive()
                || !resultado.get("lon").isJsonPrimitive()) {
            throw new JsonParseException("O resultado não contém latitude e longitude.");
        }
        double latitude = resultado.get("lat").getAsDouble();
        double longitude = resultado.get("lon").getAsDouble();
        // Impede que dados inválidos ou fora da faixa geográfica sejam salvos.
        if (!Double.isFinite(latitude) || latitude < -90 || latitude > 90
                || !Double.isFinite(longitude) || longitude < -180 || longitude > 180) {
            throw new JsonParseException("As coordenadas estão fora dos limites válidos.");
        }
        return Optional.of(new Coordenadas(latitude, longitude));
    }

    private boolean aguardarIntervaloMinimo() {
        // A primeira chamada é liberada; as seguintes aguardam completar um segundo.
        if (!jaConsultou) {
            return true;
        }
        long decorrido = System.nanoTime() - inicioUltimaConsultaNanos;
        long restante = INTERVALO_MINIMO_NANOS - decorrido;
        if (restante <= 0) {
            return true;
        }

        // Converte o tempo restante para os argumentos aceitos por Thread.sleep.
        long milissegundos = restante / 1_000_000;
        int nanosAdicionais = (int) (restante % 1_000_000);
        try {
            Thread.sleep(milissegundos, nanosAdicionais);
            return true;
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            LOGGER.warning("Espera para respeitar o limite do Nominatim foi interrompida.");
            return false;
        }
    }

    private String normalizar(String texto) {
        // Ignora diferenças de acentuação, caixa e espaços ao comparar consultas em cache.
        return Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("\\s+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
