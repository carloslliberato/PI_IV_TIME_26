package config;

import service.ConexaoServidor;
import service.ContaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;

import io.javalin.Javalin;

import controller.ContaController;

import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;

// configuração das rotas das APIs
public class ConfiguracaoRotas {

    private final ContaController contaController;

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
    }
}