package config;

import service.ConexaoServidor;
import service.ContaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;

import io.javalin.Javalin;

import controller.ContaController;
import controller.EquipeController;

import repository.ContaRepository;
import repository.EquipeRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;
import service.EquipeService;

// configuração das rotas das APIs
public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final EquipeController equipeController;

    public ConfiguracaoRotas(ConexaoServidor conexaoServidor) {

        ContaRepository contaRepository = new ContaRepository();
        MunicipioRepository municipioRepository = new MunicipioRepository();
        RecuperacaoSenhaRepository recuperacaoSenhaRepository = new RecuperacaoSenhaRepository();

        ContaService contaService = new ContaService(
                contaRepository,
                municipioRepository,
                conexaoServidor);

        ServicoEmail servicoEmail = new ServicoEmail();

        RecuperacaoSenhaService recuperacaoSenhaService = new RecuperacaoSenhaService(
                contaRepository,
                recuperacaoSenhaRepository,
                servicoEmail,
                contaService);

        this.contaController = new ContaController(
                contaService,
                recuperacaoSenhaService);

        EquipeService equipeService = new EquipeService(
                contaRepository,
                new EquipeRepository(),
                municipioRepository);
        this.equipeController = new EquipeController(equipeService);
    }

    public void registrarRotas(Javalin servidorHttp) {

        // Expõe a listagem das equipes vinculadas à conta autenticada.
        servidorHttp.get("/api/equipes", ctx -> {
            equipeController.listar(ctx);
        });

        servidorHttp.post("/api/contas/cidadaos", ctx -> {
            contaController.cadastrarCidadao(ctx);
        });

        servidorHttp.post("/api/contas/funcionarios", ctx -> {
            contaController.cadastrarFuncionario(ctx);
        });

        servidorHttp.post("/api/contas/login", ctx -> {
            contaController.autenticar(ctx);
        });

        servidorHttp.get("/api/contas/sessao", ctx -> {
            contaController.consultarSessao(ctx);
        });

        servidorHttp.post("/api/contas/perfil", ctx -> {
            contaController.selecionarPerfil(ctx);
        });

        servidorHttp.post("/api/contas/logout", ctx -> {
            contaController.encerrarSessao(ctx);
        });

        servidorHttp.post("/api/contas/redefinir-senha", ctx -> {
            contaController.redefinirSenha(ctx);
        });
        
        servidorHttp.post("/api/contas/recuperacao-senha", ctx -> {
            contaController.solicitarRecuperacao(ctx);
        });

        // Registra o endpoint autenticado que persiste equipes no MongoDB.
        servidorHttp.post("/api/equipes", ctx -> {
            equipeController.cadastrar(ctx);
        });

        // Exclui uma equipe somente quando ela está disponível e sem colaboradores ou ordens.
        servidorHttp.delete("/api/equipes/{equipeId}", ctx -> {
            equipeController.excluir(ctx);
        });

        // Adiciona colaboradores ao array do documento da equipe.
        servidorHttp.post("/api/equipes/{equipeId}/colaboradores", ctx -> {
            equipeController.cadastrarColaborador(ctx);
        });

        // Remove um colaborador específico após a confirmação feita pela tela.
        servidorHttp.delete(
                "/api/equipes/{equipeId}/colaboradores/{colaboradorId}",
                ctx -> equipeController.excluirColaborador(ctx));
    }
}