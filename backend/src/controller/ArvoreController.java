package controller;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonParseException;
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import org.bson.types.ObjectId;

import java.io.IOException;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;

import model.Arvore;
import service.ArvoreService;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.NoSuchElementException;

public class ArvoreController {

    private final ArvoreService arvoreService;
    private final Gson gson;

    public ArvoreController(
            ArvoreService arvoreService) {

        this.arvoreService = arvoreService;
        this.gson = new GsonBuilder()
                .registerTypeAdapter(ObjectId.class, new TypeAdapter<ObjectId>() {
                    @Override
                    public void write(JsonWriter out, ObjectId id) throws IOException {
                        if (id == null) out.nullValue();
                        else out.value(id.toHexString());
                    }

                    @Override
                    public ObjectId read(JsonReader in) throws IOException {
                        if (in.peek() == com.google.gson.stream.JsonToken.NULL) {
                            in.nextNull();
                            return null;
                        }
                        String valor = in.nextString();
                        if (!ObjectId.isValid(valor)) {
                            throw new JsonParseException("ObjectId inválido.");
                        }
                        return new ObjectId(valor);
                    }
                })
                .create();
    }

    // LISTAR ARVORES COM FILTROS OPCIONAIS

    public void listar(Context ctx) {

        executar(ctx, () -> {

            Map<String, String> filtros =
                    new HashMap<>();
            ObjectId municipioId = null;

            String[] nomes = {
                "municipioId",
                "bairro",
                "especie",
                "risco",
                "estado",
                "frutifera",
                "floracao",
                "manutencao",
                "ativa"
            };

            for (String nome : nomes) {

                String valor = ctx.queryParam(nome);

                if (valor != null &&
                        !valor.isBlank()) {

                    filtros.put(
                            nome,
                            valor.trim());
                }
            }

            String municipioParam = filtros.remove("municipioId");
            if (municipioParam != null) {
                municipioId = converterObjectId(municipioParam, "municipioId");
            }

            responderJson(ctx, 200, arvoreService.listar(filtros, municipioId));
        });
    }

    // BUSCAR ARVORES PROXIMAS

    public void proximas(Context ctx) {

        executar(ctx, () -> {

            String lat = ctx.queryParam("lat");
            String lng = ctx.queryParam("lng");
            String raio = ctx.queryParam("raioKm");
            String municipioParam = ctx.queryParam("municipioId");

            if (lat == null ||
                    lng == null ||
                    lat.isBlank() ||
                    lng.isBlank()) {

                throw new IllegalArgumentException(
                        "Informe lat e lng.");
            }

            double latitude;
            double longitude;
            double raioKm;

            try {

                latitude = Double.parseDouble(lat);
                longitude = Double.parseDouble(lng);

                raioKm = raio == null || raio.isBlank()
                        ? 2.0
                        : Double.parseDouble(raio);

            } catch (NumberFormatException e) {

                throw new IllegalArgumentException(
                        "Coordenadas ou raioKm invalidos.");
            }

            List<Arvore> encontradas =
                    arvoreService.buscarProximas(
                            latitude,
                            longitude,
                            raioKm,
                            municipioParam == null || municipioParam.isBlank()
                                    ? null
                                    : converterObjectId(municipioParam, "municipioId"));

            responderJson(ctx, 200, encontradas);
        });
    }

    // CONSULTAR ARVORE PELO ID

    public void consultar(Context ctx) {

        executar(ctx, () -> {

            ObjectId id = converterObjectId(ctx.pathParam("id"), "ID da árvore");

            Arvore arvore =
                    arvoreService.buscarPorId(id);

            responderJson(ctx, 200, arvore);
        });
    }

    // CONSULTAR ÁRVORE PELO CÓDIGO CURTO
    public void consultarPorCodigo(Context ctx) {
        executar(ctx, () -> {
            Arvore arvore = arvoreService.buscarPorCodARV(ctx.pathParam("codigoArv"));
            responderJson(ctx, 200, arvore);
        });
    }

    // CADASTRAR NOVA ARVORE

    public void cadastrar(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            Arvore arvore = gson.fromJson(
                    ctx.body(),
                    Arvore.class);

            Arvore cadastrada =
                    arvoreService.cadastrar(arvore);

            responderJson(ctx, 201, cadastrada);
        });
    }

    // ATUALIZAR UMA ARVORE

    public void atualizar(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            ObjectId id = converterObjectId(ctx.pathParam("id"), "ID da árvore");

            Arvore novosDados = gson.fromJson(
                    ctx.body(),
                    Arvore.class);

            Arvore atualizada =
                    arvoreService.atualizar(
                            id,
                            novosDados);

            responderJson(ctx, 200, atualizada);
        });
    }

    // ATIVAR OU ARQUIVAR UMA ARVORE

    public void alterarStatus(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            ObjectId id = converterObjectId(ctx.pathParam("id"), "ID da árvore");

            Map<?, ?> dados = gson.fromJson(
                    ctx.body(),
                    Map.class);

            if (dados == null ||
                    !(dados.get("ativa") instanceof Boolean)) {

                throw new IllegalArgumentException(
                        "Informe ativa como true ou false.");
            }

            boolean ativa =
                    (Boolean) dados.get("ativa");

            Arvore atualizada =
                    arvoreService.alterarStatus(
                            id,
                            ativa);

            responderJson(ctx, 200, atualizada);
        });
    }

    // VERIFICAR SESSAO DO FUNCIONARIO

    private boolean exigirFuncionario(Context ctx) {

        HttpSession sessao =
                ctx.req().getSession(false);

        if (sessao == null ||
                sessao.getAttribute("usuarioId") == null) {

            responderJson(ctx, 401, Map.of(
                    "erro",
                    "Usuario nao autenticado."));

            return false;
        }

        Object perfilAtivo =
                sessao.getAttribute("perfilAtivo");

        Object perfis =
                sessao.getAttribute("perfis");

        if (!"FUNCIONARIO".equals(perfilAtivo) ||
                !(perfis instanceof List<?> lista) ||
                !lista.contains("FUNCIONARIO")) {

            responderJson(ctx, 403, Map.of(
                    "erro",
                    "Acesso permitido apenas a funcionarios."));

            return false;
        }

        return true;
    }

    // TRATAMENTO DE ERROS

    private void executar(
            Context ctx,
            Runnable operacao) {

        try {

            operacao.run();

        } catch (JsonParseException e) {

            responderJson(ctx, 400, Map.of(
                    "erro",
                    "Formato JSON invalido."));

        } catch (NoSuchElementException e) {

            responderJson(ctx, 404, Map.of(
                    "erro",
                    e.getMessage()));

        } catch (IllegalArgumentException e) {

            responderJson(ctx, 400, Map.of(
                    "erro",
                    e.getMessage()));

        } catch (Exception e) {

            e.printStackTrace();

            responderJson(ctx, 500, Map.of(
                    "erro",
                    "Erro interno ao processar a arvore."));
        }
    }

    private void responderJson(Context ctx, int status, Object resposta) {
        ctx.status(status)
                .contentType("application/json; charset=utf-8")
                .result(gson.toJson(resposta));
    }

    private ObjectId converterObjectId(String valor, String campo) {
        if (valor == null || !ObjectId.isValid(valor)) {
            throw new IllegalArgumentException(campo + " inválido.");
        }
        return new ObjectId(valor);
    }
}
