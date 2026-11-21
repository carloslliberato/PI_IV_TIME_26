// Autor: Carlos Luciano, Sophia Fernandes

package controller;

import java.util.List;
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
        ctx.contentType("application/json; charset=utf-8");
        try {
            CadastroOcorrenciaDTO dto = gson.fromJson(ctx.body(), CadastroOcorrenciaDTO.class);
            Document criada = service.abrirChamado(dto);
            ctx.status(201).result(gson.toJson(Map.of(
                    "mensagem", "Chamado aberto com sucesso!",
                    "protocolo", criada.getString("protocolo"),
                    "ocorrencia", criada
            )));
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        } catch (Exception e) {
            ctx.status(500).result(gson.toJson(Map.of("erro", "Erro ao registrar ocorrência: " + e.getMessage())));
        }
    }

    // GET /api/ocorrencias -> Lista as ocorrências na tabela (com suporte aos filtros da tela)
    public void listarOcorrencias(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        String municipio = ctx.queryParam("municipioId");
        if (municipio == null) municipio = ctx.queryParam("municipio");

        String tipo = ctx.queryParam("tipoProblema");
        if (tipo == null) tipo = ctx.queryParam("tipo");

        String status = ctx.queryParam("status");

        String prioridade = ctx.queryParam("urgencia");
        if (prioridade == null) prioridade = ctx.queryParam("prioridade");

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
