package backend.src.http;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Recebe o cadastro demonstrativo de funcionário enviado pela página profissional.
 * FUTURO BANCO DE DADOS: trocar a lista local por uma gravação transacional e validar equipe,
 * setor e autorização do usuário antes de persistir os campos do funcionário.
 */
public class FuncionarioEquipeApiHandler implements HttpHandler {

    // A lista e o contador só existem durante a execução atual do servidor, para demonstração.
    private static final List<String> funcionariosCadastrados =
            Collections.synchronizedList(new ArrayList<>());
    private static final AtomicLong sequencia = new AtomicLong(1);

    // Encaminha a chamada POST, valida o corpo e devolve o funcionário recém-criado em JSON.
    @Override
    public void handle(HttpExchange exchange) throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            responder(exchange, 405, "{\"erro\":\"Método não permitido. Use POST.\"}");
            return;
        }

        String equipeId = lerEquipeId(exchange.getRequestURI().getPath());
        String corpo = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        String nomeCompleto = lerCampoJson(corpo, "nomeCompleto");
        String funcao = lerCampoJson(corpo, "funcao");
        String contato = lerCampoJson(corpo, "contato");
        String regiaoAtuacao = lerCampoJson(corpo, "regiaoAtuacao");

        if (equipeId.isBlank() || nomeCompleto.isBlank() || funcao.isBlank() || contato.isBlank() || regiaoAtuacao.isBlank()) {
            responder(exchange, 400, "{\"erro\":\"Informe equipe, região, nome completo, função e contato.\"}");
            return;
        }

        // Monta e guarda a resposta local; esta lista será substituída pelo repository/DAO do banco.
        String funcionarioId = "FUN-API-" + String.format("%04d", sequencia.getAndIncrement());
        String funcionarioJson = "{"
                + "\"id\":\"" + escaparJson(funcionarioId) + "\","
                + "\"equipeId\":\"" + escaparJson(equipeId) + "\","
                + "\"nomeCompleto\":\"" + escaparJson(nomeCompleto) + "\","
                + "\"funcao\":\"" + escaparJson(funcao) + "\","
                + "\"contato\":\"" + escaparJson(contato) + "\","
                + "\"regiaoAtuacao\":\"" + escaparJson(regiaoAtuacao) + "\","
                + "\"disponivel\":true"
                + "}";
        funcionariosCadastrados.add(funcionarioJson);

        responder(exchange, 201, "{\"funcionario\":" + funcionarioJson + "}");
    }

    // Extrai o identificador da equipe do caminho /api/equipes/{id}/funcionarios.
    private String lerEquipeId(String caminho) {
        String prefixo = "/api/equipes/";
        String sufixo = "/funcionarios";
        if (!caminho.startsWith(prefixo) || !caminho.endsWith(sufixo)) return "";
        String idCodificado = caminho.substring(prefixo.length(), caminho.length() - sufixo.length());
        return URLDecoder.decode(idCodificado, StandardCharsets.UTF_8).trim();
    }

    // Lê um valor string de um objeto JSON simples sem adicionar uma biblioteca externa.
    private String lerCampoJson(String json, String nomeCampo) {
        Pattern pattern = Pattern.compile("\\\"" + Pattern.quote(nomeCampo)
                + "\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"\\\\])*)\\\"");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? decodificarStringJson(matcher.group(1)).trim() : "";
    }

    // Decodifica os escapes de string produzidos por JSON.stringify no navegador.
    private String decodificarStringJson(String valor) {
        StringBuilder resultado = new StringBuilder();
        for (int indice = 0; indice < valor.length(); indice++) {
            char atual = valor.charAt(indice);
            if (atual != '\\' || indice + 1 >= valor.length()) {
                resultado.append(atual);
                continue;
            }
            char escape = valor.charAt(++indice);
            switch (escape) {
                case '"':
                    resultado.append('"');
                    break;
                case '\\':
                    resultado.append('\\');
                    break;
                case '/':
                    resultado.append('/');
                    break;
                case 'b':
                    resultado.append('\b');
                    break;
                case 'f':
                    resultado.append('\f');
                    break;
                case 'n':
                    resultado.append('\n');
                    break;
                case 'r':
                    resultado.append('\r');
                    break;
                case 't':
                    resultado.append('\t');
                    break;
                case 'u':
                    if (indice + 4 < valor.length()) {
                        String hexadecimal = valor.substring(indice + 1, indice + 5);
                        try {
                            resultado.append((char) Integer.parseInt(hexadecimal, 16));
                            indice += 4;
                        } catch (NumberFormatException erro) {
                            resultado.append('u');
                        }
                    } else {
                        resultado.append('u');
                    }
                    break;
                default:
                    resultado.append(escape);
                    break;
            }
        }
        return resultado.toString();
    }

    // Escapa valores de texto ao formar o JSON de resposta.
    private String escaparJson(String valor) {
        return valor.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    // Envia respostas JSON com status HTTP e charset UTF-8.
    private void responder(HttpExchange exchange, int status, String json) throws IOException {
        byte[] corpo = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(status, corpo.length);
        exchange.getResponseBody().write(corpo);
        exchange.close();
    }
}
