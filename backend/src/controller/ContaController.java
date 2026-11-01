package controller;

import com.google.gson.Gson;

import service.ContaService;

import dto.CadastroContaDTO;
import dto.LoginDTO;

import io.javalin.http.Context;

import model.Conta;

import java.util.Map;

import com.google.gson.JsonParseException;

public class ContaController {

    private Gson gson;
    private ContaService contaService;

    public ContaController(ContaService contaService) {
        this.gson = new Gson();
        this.contaService = contaService;
    }

    public void cadastrarCidadao(Context ctx) {

        try {
            // Converte o JSON recebido em um DTO
            CadastroContaDTO dados = gson.fromJson(ctx.body(), CadastroContaDTO.class);

            if (dados == null) {
                ctx.status(400);
                ctx.result("Dados do cadastro não informados.");
                return;
            }

            // Encaminha os dados para o serviço
            contaService.cadastrarCidadao(dados);

            // Retorna a confirmação do cadastro
            ctx.status(201);
            ctx.json(Map.of(
                    "mensagem", "Cadastro realizado com sucesso!"));

        } catch (JsonParseException e) {
            ctx.status(400);
            ctx.result("Formato JSON inválido.");

        } catch (IllegalArgumentException e) {
            ctx.status(400);
            ctx.json(Map.of("erro", e.getMessage()));

        } catch (Exception e) {
            ctx.status(500);
            ctx.json(Map.of(
                    "erro", "Erro interno ao realizar o cadastro."));
            e.printStackTrace();
        }
    }

    public void cadastrarFuncionario(Context ctx) {

        try {
            // Converte o JSON recebido em um DTO
            CadastroContaDTO dados = gson.fromJson(ctx.body(), CadastroContaDTO.class);

            if (dados == null) {
                ctx.status(400);
                ctx.result("Dados do cadastro não informados.");
                return;
            }

            // Encaminha os dados para o serviço
            contaService.cadastrarFuncionario(dados);

            // Retorna a confirmação do cadastro
            ctx.status(201);
            ctx.json(Map.of(
                    "mensagem", "Cadastro realizado com sucesso!"));

        } catch (JsonParseException e) {
            ctx.status(400);
            ctx.result("Formato JSON inválido.");

        } catch (IllegalArgumentException e) {
            ctx.status(400);
            ctx.json(Map.of("erro", e.getMessage()));

        } catch (Exception e) {
            ctx.status(500);
            ctx.json(Map.of(
                    "erro", "Erro interno ao realizar o cadastro."));
            e.printStackTrace();
        }
    }

    public void autenticar(Context ctx) {

        try {
            LoginDTO dados = gson.fromJson(ctx.body(), LoginDTO.class);

            if (dados == null) {
                throw new IllegalArgumentException("Dados de login inválidos.");
            }

            Conta conta = contaService.autenticar(dados);

            ctx.status(200).json(Map.of(
                    "mensagem", "Login realizado com sucesso!",
                    "id", conta.getId().toString(),
                    "nome", conta.getNome(),
                    "email", conta.getEmail(),
                    "perfis", conta.getPerfis(),
                    "setor", conta.getSetor() == null ? "" : conta.getSetor(),
                    "cargo", conta.getCargo() == null ? "" : conta.getCargo()));

        } catch (IllegalArgumentException e) {
            ctx.status(401).json(Map.of("erro", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao realizar o login."));
        }
    }
}
