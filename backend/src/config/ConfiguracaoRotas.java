package config;

import controller.ContaController;
import controller.OcorrenciaController;
import io.javalin.Javalin;
import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.OcorrenciaRepository;
import repository.RecuperacaoSenhaRepository;
import service.ConexaoServidor;
import service.ContaService;
import service.OcorrenciaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;

// configuração das rotas das APIs
public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final OcorrenciaController ocorrenciaController;

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

        // Inicialização do módulo ocorrências
        OcorrenciaRepository ocorrenciaRepository = new OcorrenciaRepository();
        OcorrenciaService ocorrenciaService = new OcorrenciaService(ocorrenciaRepository);
        ocorrenciaService.popularDadosDeTesteSeVazio();
        this.ocorrenciaController = new OcorrenciaController(ocorrenciaService);
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

        // Rotas de Ocorrências e Chamados (Pessoa 3)
        servidorHttp.post("/api/ocorrencias", ctx -> {
            ocorrenciaController.abrirChamado(ctx);
        });

        servidorHttp.get("/api/ocorrencias", ctx -> {
            ocorrenciaController.listarOcorrencias(ctx);
        });

        servidorHttp.get("/api/ocorrencias/minhas", ctx -> {
            ocorrenciaController.listarMinhasOcorrencias(ctx);
        });

        servidorHttp.get("/api/ocorrencias/protocolo/{protocolo}", ctx -> {
            ocorrenciaController.consultarPorProtocolo(ctx);
        });

        servidorHttp.get("/api/ocorrencias/{id}", ctx -> {
            ocorrenciaController.consultarPorId(ctx);
        });

        servidorHttp.patch("/api/ocorrencias/{id}/status", ctx -> {
            ocorrenciaController.atualizarStatus(ctx);
        });

        servidorHttp.patch("/api/ocorrencias/{id}/prioridade", ctx -> {
            ocorrenciaController.atualizarPrioridade(ctx);
        });
    }
}