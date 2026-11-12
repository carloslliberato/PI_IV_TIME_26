package config;

import io.javalin.Javalin;

import controller.ContaController;
import controller.ArvoreController;

import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;
import repository.ArvoreRepository;

import service.ConexaoServidor;
import service.ContaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;
import service.ArvoreService;

// Configuracao das rotas das APIs
public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final ArvoreController arvoreController;

    public ConfiguracaoRotas(ConexaoServidor conexaoServidor) {

        // REPOSITORIES DE CONTAS

        ContaRepository contaRepository =
                new ContaRepository();

        MunicipioRepository municipioRepository =
                new MunicipioRepository();

        RecuperacaoSenhaRepository recuperacaoSenhaRepository =
                new RecuperacaoSenhaRepository();

        // SERVICES DE CONTAS

        ContaService contaService = new ContaService(
                contaRepository,
                municipioRepository,
                conexaoServidor);

        ServicoEmail servicoEmail = new ServicoEmail();

        RecuperacaoSenhaService recuperacaoSenhaService =
                new RecuperacaoSenhaService(
                        contaRepository,
                        recuperacaoSenhaRepository,
                        servicoEmail,
                        contaService);

        // CONTROLLER DE CONTAS

        this.contaController = new ContaController(
                contaService,
                recuperacaoSenhaService);

        // REPOSITORY E SERVICE DE ARVORES

        ArvoreRepository arvoreRepository =
                new ArvoreRepository();

        ArvoreService arvoreService =
                new ArvoreService(arvoreRepository);

        // CONTROLLER DE ARVORES

        this.arvoreController =
                new ArvoreController(arvoreService);
    }

    public void registrarRotas(Javalin servidorHttp) {

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

        // ==================================
        // ROTAS DE ARVORES
        // ==================================

        // Listar todas as arvores
        servidorHttp.get("/api/arvores", ctx -> {
            arvoreController.listar(ctx);
        });

        // Consultar arvore por ID
        servidorHttp.get("/api/arvores/{id}", ctx -> {
            arvoreController.consultar(ctx);
        });

        // Cadastrar nova arvore
        servidorHttp.post("/api/arvores", ctx -> {
            arvoreController.cadastrar(ctx);
        });

        // Atualizar arvore existente
        servidorHttp.put("/api/arvores/{id}", ctx -> {
            arvoreController.atualizar(ctx);
        });

        // Ativar ou arquivar arvore
        servidorHttp.patch("/api/arvores/{id}/status", ctx -> {
            arvoreController.alterarStatus(ctx);
        });
    }
}
