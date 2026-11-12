
package controller;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;

import model.Arvore;
import service.ArvoreService;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

public class ArvoreController {

    private final ArvoreService arvoreService;
    private final Gson gson;

    public ArvoreController(ArvoreService arvoreService) {
        this.arvoreService = arvoreService;
        this.gson = new Gson();
    }

    // LISTAR TODAS AS ARVORES

    public void listar(Context ctx) {

        executar(ctx, () -> {
            ctx.status(200).json(arvoreService.listar());
        });
    }

    // CONSULTAR UMA ARVORE PELO ID

    public void consultar(Context ctx) {

        executar(ctx, () -> {

            String id = ctx.pathParam("id");

            Arvore arvore = arvoreService.buscarPorId(id);

            ctx.status(200).json(arvore);
        });
    }

    // CADASTRAR UMA NOVA ARVORE

    public void cadastrar(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            Arvore arvore = gson.fromJson(
                    ctx.body(), Arvore.class);

            Arvore cadastrada = arvoreService.cadastrar(arvore);

            ctx.status(201).json(cadastrada);
        });
    }

    // ATUALIZAR UMA ARVORE

    public void atualizar(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            String id = ctx.pathParam("id");

            Arvore novosDados = gson.fromJson(
                    ctx.body(), Arvore.class);

            Arvore atualizada = arvoreService.atualizar(
                    id, novosDados);

            ctx.status(200).json(atualizada);
        });
    }

    // ATIVAR OU ARQUIVAR UMA ARVORE

    public void alterarStatus(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        executar(ctx, () -> {

            String id = ctx.pathParam("id");

            Map<?, ?> dados = gson.fromJson(
                    ctx.body(), Map.class);

            if (dados == null ||
                    !(dados.get("ativa") instanceof Boolean)) {

                throw new IllegalArgumentException(
                        "Informe ativa como true ou false.");
            }

            boolean ativa = (Boolean) dados.get("ativa");

            Arvore atualizada = arvoreService.alterarStatus(
                    id, ativa);

            ctx.status(200).json(atualizada);
        });
    }

    // VERIFICAR SE O USUARIO E FUNCIONARIO

    private boolean exigirFuncionario(Context ctx) {

        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null ||
                sessao.getAttribute("usuarioId") == null) {

            ctx.status(401).json(Map.of(
                    "erro", "Usuario nao autenticado."));

            return false;
        }

        Object perfilAtivo =
                sessao.getAttribute("perfilAtivo");

        Object perfis =
                sessao.getAttribute("perfis");

        if (!"FUNCIONARIO".equals(perfilAtivo) ||
                !(perfis instanceof List<?> lista) ||
                !lista.contains("FUNCIONARIO")) {

            ctx.status(403).json(Map.of(
                    "erro", "Acesso permitido apenas a funcionarios."));

            return false;
        }

        return true;
    }

    // TRATAMENTO DE ERROS DA API

    private void executar(Context ctx, Runnable operacao) {

        try {

            operacao.run();

        } catch (JsonParseException e) {

            ctx.status(400).json(Map.of(
                    "erro", "Formato JSON invalido."));

        } catch (NoSuchElementException e) {

            ctx.status(404).json(Map.of(
                    "erro", e.getMessage()));

        } catch (IllegalArgumentException e) {

            ctx.status(400).json(Map.of(
                    "erro", e.getMessage()));

        } catch (Exception e) {

            e.printStackTrace();

            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao processar a arvore."));
        }
    }
}
