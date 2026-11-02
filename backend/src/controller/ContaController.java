package controller;

import com.google.gson.Gson;

import service.ContaService;
import service.RecuperacaoSenhaService;
import dto.CadastroContaDTO;
import dto.LoginDTO;

import io.javalin.http.Context;

import model.Conta;

import java.util.Map;

import com.google.gson.JsonParseException;

import jakarta.servlet.http.HttpSession;

public class ContaController {

    private Gson gson;
    private ContaService contaService;
    private RecuperacaoSenhaService recuperacaoSenhaService;

    public ContaController(
            ContaService contaService,
            RecuperacaoSenhaService recuperacaoSenhaService) {

        this.gson = new Gson();
        this.contaService = contaService;
        this.recuperacaoSenhaService = recuperacaoSenhaService;
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

            // Verifica as credenciais no backend.
            Conta conta = contaService.autenticar(dados);

            // Cria uma sessão HTTP para o usuário.
            HttpSession sessao = ctx.req().getSession(true);

            // Altera o identificador da sessão por segurança.
            ctx.req().changeSessionId();

            // Guarda os dados de autenticação no servidor.
            sessao.setAttribute("usuarioId", conta.getId().toString());
            sessao.setAttribute("nome", conta.getNome());
            sessao.setAttribute("email", conta.getEmail());
            sessao.setAttribute("perfis", conta.getPerfis());

            // O perfil ativo será definido após a escolha do usuário.
            sessao.removeAttribute("perfilAtivo");

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

    public void consultarSessao(Context ctx) {

        // Procura uma sessão existente, sem criar uma nova.
        HttpSession sessao = ctx.req().getSession(false);

        // Se não existir sessão, o usuário não está autenticado.
        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of(
                    "erro", "Usuário não autenticado."));
            return;
        }

        // Retorna os dados armazenados na sessão.
        ctx.status(200).json(Map.of(
                "id", sessao.getAttribute("usuarioId"),
                "nome", sessao.getAttribute("nome"),
                "email", sessao.getAttribute("email"),
                "perfis", sessao.getAttribute("perfis"),
                "perfilAtivo", sessao.getAttribute("perfilAtivo") == null
                        ? ""
                        : sessao.getAttribute("perfilAtivo")));
    }

    public void selecionarPerfil(Context ctx) {

        // Procura uma sessão existente.
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of(
                    "erro", "Usuário não autenticado."));
            return;
        }

        try {
            // Recebe o perfil escolhido pelo frontend.
            Map<?, ?> dados = gson.fromJson(ctx.body(), Map.class);

            if (dados == null || dados.get("perfil") == null) {
                throw new IllegalArgumentException("Perfil não informado.");
            }

            String perfil = dados.get("perfil").toString();

            // Verifica se o perfil é permitido.
            if (!perfil.equals("CIDADAO") && !perfil.equals("FUNCIONARIO")) {
                throw new IllegalArgumentException("Perfil inválido.");
            }

            // Recupera os perfis cadastrados na conta.
            Object perfisObjeto = sessao.getAttribute("perfis");

            if (!(perfisObjeto instanceof java.util.List<?> perfis)
                    || !perfis.contains(perfil)) {
                ctx.status(403).json(Map.of(
                        "erro", "Você não possui esse perfil."));
                return;
            }

            // Registra o perfil escolhido na sessão.
            sessao.setAttribute("perfilAtivo", perfil);

            ctx.status(200).json(Map.of(
                    "mensagem", "Perfil selecionado com sucesso!",
                    "perfilAtivo", perfil));

        } catch (JsonParseException | IllegalArgumentException e) {
            ctx.status(400).json(Map.of("erro", e.getMessage()));
        }
    }

    public void encerrarSessao(Context ctx) {

        // Procura uma sessão existente, sem criar outra.
        HttpSession sessao = ctx.req().getSession(false);

        // Se existir uma sessão, invalida.
        if (sessao != null) {
            sessao.invalidate();
        }

        ctx.status(200).json(Map.of(
                "mensagem", "Sessão encerrada com sucesso!"));
    }

    public void redefinirSenha(Context ctx) {

        try {
            // Converte o JSON recebido
            Map<?, ?> dados = gson.fromJson(ctx.body(), Map.class);

            if (dados == null) {
                throw new IllegalArgumentException(
                        "Dados para redefinição de senha não informados.");
            }

            // Recupera os campos enviados pelo frontend
            String email = dados.get("email") == null
                    ? null
                    : dados.get("email").toString();

            String codigo = dados.get("codigo") == null
                    ? null
                    : dados.get("codigo").toString();

            String novaSenha = dados.get("novaSenha") == null
                    ? null
                    : dados.get("novaSenha").toString();

            String confirmarNovaSenha = dados.get("confirmarNovaSenha") == null
                    ? null
                    : dados.get("confirmarNovaSenha").toString();

            // Encaminha os dados para o serviço
            recuperacaoSenhaService.redefinirSenha(
                    email,
                    codigo,
                    novaSenha,
                    confirmarNovaSenha);

            // Retorna a confirmação
            ctx.status(200).json(Map.of(
                    "mensagem", "Senha redefinida com sucesso!"));

        } catch (JsonParseException e) {
            ctx.status(400).json(Map.of(
                    "erro", "Formato JSON inválido."));

        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of(
                    "erro", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();

            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao redefinir a senha."));
        }
    }

    public void solicitarRecuperacao(Context ctx) {

        try {
            // Converte o JSON recebido
            Map<?, ?> dados = gson.fromJson(ctx.body(), Map.class);

            if (dados == null || dados.get("email") == null) {
                throw new IllegalArgumentException("O e-mail é obrigatório.");
            }

            String email = dados.get("email").toString();

            // Encaminha a solicitação para o serviço
            recuperacaoSenhaService.solicitarRecuperacao(email);

            // Resposta genérica para não revelar se o e-mail existe
            ctx.status(200).json(Map.of(
                    "mensagem",
                    "Se o e-mail estiver cadastrado, você receberá um código de recuperação."));

        } catch (JsonParseException e) {
            ctx.status(400).json(Map.of(
                    "erro", "Formato JSON inválido."));

        } catch (IllegalArgumentException e) {
            ctx.status(400).json(Map.of(
                    "erro", e.getMessage()));

        } catch (Exception e) {
            e.printStackTrace();

            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao solicitar a recuperação de senha."));
        }
    }
}
