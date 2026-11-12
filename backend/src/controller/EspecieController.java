
package controller;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import io.javalin.http.Context;

import jakarta.servlet.http.HttpSession;

import model.Especie;
import service.EspecieService;

import java.util.List;
import java.util.Map;

public class EspecieController {

    private final EspecieService service;
    private final Gson gson;

    public EspecieController(EspecieService service) {
        this.service = service;
        this.gson = new Gson();
    }

    // LISTAR ESPECIES

    public void listar(Context ctx) {

        try {
            ctx.status(200).json(service.listar());

        } catch (Exception e) {
            e.printStackTrace();

            ctx.status(500).json(Map.of(
                    "erro", "Erro ao consultar especies."));
        }
    }

    // CADASTRAR ESPECIE

    public void cadastrar(Context ctx) {

        if (!exigirFuncionario(ctx)) {
            return;
        }

        try {

            Especie especie = gson.fromJson(
                    ctx.body(), Especie.class);

            Especie cadastrada = service.cadastrar(especie);

            ctx.status(201).json(cadastrada);

        } catch (JsonParseException e) {

            ctx.status(400).json(Map.of(
                    "erro", "JSON invalido."));

        } catch (IllegalArgumentException e) {

            ctx.status(400).json(Map.of(
                    "erro", e.getMessage()));

        } catch (IllegalStateException e) {

            ctx.status(409).json(Map.of(
                    "erro", e.getMessage()));

        } catch (Exception e) {

            e.printStackTrace();

            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao cadastrar especie."));
        }
    }

    // VALIDAR SESSAO PROFISSIONAL

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
}
