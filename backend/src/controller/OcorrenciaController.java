// Autor: Carlos Luciano, Sophia Fernandes, Gabrielle Mota

package controller;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import org.bson.Document;
import org.bson.types.ObjectId;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializer;

import dto.AtualizacaoOcorrenciaDTO;
import dto.CadastroOcorrenciaDTO;
import io.javalin.http.Context;
import service.OcorrenciaService;

// Recebe as requisições HTTP do front-end (fetch) e devolve respostas em JSON
public class OcorrenciaController {

    private final OcorrenciaService service;
    private final Gson gson = new GsonBuilder()
            .registerTypeAdapter(ObjectId.class,
                    (JsonSerializer<ObjectId>) (id, tipo, contexto) -> new JsonPrimitive(id.toHexString()))
            .create();

    public OcorrenciaController(OcorrenciaService service) {
        this.service = service;
    }

    // POST /api/ocorrencias -> Recebe os dados do formulário e cria o chamado
    public void abrirChamado(Context ctx) {
        // Etapa 1: informa ao cliente que todas as respostas deste endpoint serão JSON em UTF-8.
        ctx.contentType("application/json; charset=utf-8");
        try {
            // Etapa 2: converte o corpo da requisição para o DTO usado pelo cadastro.
            CadastroOcorrenciaDTO dto = gson.fromJson(ctx.body(), CadastroOcorrenciaDTO.class);

            // Etapa 3: delega a validação e a persistência da ocorrência ao serviço.
            Document criada = service.abrirChamado(dto);

            // Etapa 4: prepara a resposta com a mensagem, a identificação pública, o protocolo e o registro salvo.
            Map<String, Object> resposta = new LinkedHashMap<>();
            resposta.put("mensagem", "Chamado aberto com sucesso!");
            resposta.put("codigoIdentificador", criada.getString("id"));
            resposta.put("protocolo", criada.getString("protocolo"));
            resposta.put("ocorrencia", criada);

            // Etapa 5: avisa que a ocorrência foi salva, mas não poderá ser exibida no mapa sem as duas coordenadas.
            if (!(criada.get("latitude") instanceof Number)
                    || !(criada.get("longitude") instanceof Number)) {
                resposta.put("aviso",
                        "Chamado registrado, mas o endereço não foi localizado. "
                                + "Ele não aparecerá no mapa até que haja coordenadas.");
            }

            // Etapa 6: confirma a criação com HTTP 201 e serializa o resultado para JSON.
            ctx.status(201).result(gson.toJson(resposta));
        } catch (IllegalArgumentException e) {
            // Etapa 7: devolve HTTP 400 quando os dados enviados não passam pela validação.
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        } catch (Exception e) {
            // Etapa 8: devolve HTTP 500 para falhas inesperadas durante o cadastro.
            ctx.status(500).result(gson.toJson(Map.of("erro", "Erro ao registrar ocorrência: " + e.getMessage())));
        }
    }

    // GET /api/ocorrencias -> Lista as ocorrências na tabela (com suporte aos filtros da tela)
    public void listarOcorrencias(Context ctx) {
        // Etapa 1: configura a resposta HTTP como JSON.
        ctx.contentType("application/json; charset=utf-8");

        // Etapa 2: lê os filtros aceitando os nomes atuais e os aliases anteriores.
        String municipio = ctx.queryParam("municipioId");
        if (municipio == null) municipio = ctx.queryParam("municipio");

        String tipo = ctx.queryParam("tipoProblema");
        if (tipo == null) tipo = ctx.queryParam("tipo");

        String status = ctx.queryParam("status");

        String prioridade = ctx.queryParam("urgencia");
        if (prioridade == null) prioridade = ctx.queryParam("prioridade");

        // Etapa 3: consulta o serviço com os filtros e devolve a lista serializada.
        List<Document> lista = service.listarOcorrencias(municipio, tipo, status, prioridade);
        ctx.status(200).result(gson.toJson(lista));
    }

    // GET /api/ocorrencias/minhas -> Lista os chamados do cidadão logado
    public void listarMinhasOcorrencias(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        String cidadaoId = ctx.queryParam("cidadaoId");
        List<Document> lista = service.listarMinhasOcorrencias(cidadaoId);
        ctx.status(200).result(gson.toJson(lista));
    }

    // GET /api/ocorrencias/{id} -> Busca os detalhes de uma ocorrência pelo ID
    public void consultarPorId(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        Document doc = service.buscarPorId(ctx.pathParam("id"));
        if (doc != null) {
            ctx.status(200).result(gson.toJson(doc));
        } else {
            ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
        }
    }

    // GET /api/ocorrencias/protocolo/{protocolo} -> Busca chamado pelo protocolo (ex: CH-123)
    public void consultarPorProtocolo(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        Document doc = service.buscarPorProtocolo(ctx.pathParam("protocolo"));
        if (doc != null) {
            ctx.status(200).result(gson.toJson(doc));
        } else {
            ctx.status(404).result(gson.toJson(Map.of("erro", "Protocolo não encontrado.")));
        }
    }

    // PATCH /api/ocorrencias/{id}/status -> Atualiza o status da ocorrência
    public void atualizarStatus(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        try {
            AtualizacaoOcorrenciaDTO dto = gson.fromJson(ctx.body(), AtualizacaoOcorrenciaDTO.class);
            boolean ok = service.alterarStatus(ctx.pathParam("id"), dto.status, dto.observacaoInterna);
            if (ok) {
                ctx.status(200).result(gson.toJson(Map.of("mensagem", "Status atualizado com sucesso!")));
            } else {
                ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
            }
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        }
    }

    // PATCH /api/ocorrencias/{id}/prioridade -> Atualiza a prioridade/urgência da ocorrência
    public void atualizarPrioridade(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        try {
            AtualizacaoOcorrenciaDTO dto = gson.fromJson(ctx.body(), AtualizacaoOcorrenciaDTO.class);
            String novaPrioridade = (dto.urgencia != null) ? dto.urgencia : dto.prioridade;
            boolean ok = service.alterarPrioridade(ctx.pathParam("id"), novaPrioridade);
            if (ok) {
                ctx.status(200).result(gson.toJson(Map.of("mensagem", "Prioridade atualizada com sucesso!")));
            } else {
                ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
            }
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        }
    }

    // PATCH /api/ocorrencias/{id}/notificacoes -> Salva se o cidadão quer receber notificações
    public void atualizarNotificacao(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        AtualizacaoOcorrenciaDTO dto = gson.fromJson(ctx.body(), AtualizacaoOcorrenciaDTO.class);
        boolean ok = service.alterarNotificacao(ctx.pathParam("id"), dto);
        if (ok) {
            ctx.status(200).result(gson.toJson(Map.of("mensagem", "Preferência atualizada!")));
        } else {
            ctx.status(404).result(gson.toJson(Map.of("erro", "Chamado não encontrado.")));
        }
    }
}
