package controller;

import com.google.gson.Gson;
import dto.AtualizacaoOcorrenciaDTO;
import dto.CadastroOcorrenciaDTO;
import io.javalin.http.Context;
import org.bson.Document;
import service.OcorrenciaService;

import java.util.List;
import java.util.Map;

public class OcorrenciaController {

    private final OcorrenciaService ocorrenciaService;
    private final Gson gson;

    public OcorrenciaController(OcorrenciaService ocorrenciaService) {
        this.ocorrenciaService = ocorrenciaService;
        this.gson = new Gson();
    }

    // POST /api/ocorrencias — Abrir chamado
    public void abrirChamado(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        try {
            CadastroOcorrenciaDTO dto = gson.fromJson(ctx.body(), CadastroOcorrenciaDTO.class);
            Document criada = ocorrenciaService.abrirChamado(dto);
            ctx.status(201).result(gson.toJson(Map.of(
                    "mensagem", "Chamado aberto com sucesso!",
                    "protocolo", criada.getString("protocolo"),
                    "ocorrencia", criada
            )));
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        } catch (Exception e) {
            ctx.status(500).result(gson.toJson(Map.of("erro", "Erro ao abrir chamado: " + e.getMessage())));
        }
    }

    // GET /api/ocorrencias — Listar ocorrências (com filtros opcionais)
    public void listarOcorrencias(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        List<Document> lista = ocorrenciaService.listar(
                ctx.queryParam("status"),
                ctx.queryParam("urgencia"),
                ctx.queryParam("municipioId"),
                ctx.queryParam("cidadaoId")
        );
        ctx.status(200).result(gson.toJson(lista));
    }

    // GET /api/ocorrencias/minhas — Consultar chamados do cidadão (?cidadaoId=...)
    public void listarMinhasOcorrencias(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        String cidadaoId = ctx.queryParam("cidadaoId");
        if (cidadaoId == null || cidadaoId.isBlank()) {
            cidadaoId = "cid_001"; // Valor padrão para testes isolados caso não envie na URL
        }
        List<Document> minhas = ocorrenciaService.listar(null, null, null, cidadaoId);
        ctx.status(200).result(gson.toJson(minhas));
    }

    // GET /api/ocorrencias/protocolo/{protocolo} — Acompanhar chamado por protocolo
    public void consultarPorProtocolo(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        Document doc = ocorrenciaService.buscarPorProtocolo(ctx.pathParam("protocolo"));
        if (doc != null) {
            ctx.status(200).result(gson.toJson(doc));
        } else {
            ctx.status(404).result(gson.toJson(Map.of("erro", "Protocolo não encontrado.")));
        }
    }

    // GET /api/ocorrencias/{id} — Consultar ocorrência por ID
    public void consultarPorId(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        Document doc = ocorrenciaService.buscarPorId(ctx.pathParam("id"));
        if (doc != null) {
            ctx.status(200).result(gson.toJson(doc));
        } else {
            ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
        }
    }

    // PATCH /api/ocorrencias/{id}/status — Atualizar status
    public void atualizarStatus(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        try {
            AtualizacaoOcorrenciaDTO dto = gson.fromJson(ctx.body(), AtualizacaoOcorrenciaDTO.class);
            boolean atualizou = ocorrenciaService.alterarStatus(
                    ctx.pathParam("id"),
                    dto != null ? dto.status : null,
                    dto != null ? dto.observacaoInterna : null
            );
            if (atualizou) {
                ctx.status(200).result(gson.toJson(Map.of("mensagem", "Status atualizado para: " + dto.status)));
            } else {
                ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
            }
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        }
    }

    // PATCH /api/ocorrencias/{id}/prioridade — Atualizar prioridade/urgência
    public void atualizarPrioridade(Context ctx) {
        ctx.contentType("application/json; charset=utf-8");
        try {
            AtualizacaoOcorrenciaDTO dto = gson.fromJson(ctx.body(), AtualizacaoOcorrenciaDTO.class);
            boolean atualizou = ocorrenciaService.alterarPrioridade(
                    ctx.pathParam("id"),
                    dto != null ? dto.urgencia : null
            );
            if (atualizou) {
                ctx.status(200).result(gson.toJson(Map.of("mensagem", "Prioridade atualizada para: " + dto.urgencia)));
            } else {
                ctx.status(404).result(gson.toJson(Map.of("erro", "Ocorrência não encontrada.")));
            }
        } catch (IllegalArgumentException e) {
            ctx.status(400).result(gson.toJson(Map.of("erro", e.getMessage())));
        }
    }
}