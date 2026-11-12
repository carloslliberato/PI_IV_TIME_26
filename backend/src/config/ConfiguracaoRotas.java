
package config;

import io.javalin.Javalin;

import controller.ContaController;
import controller.ArvoreController;
import controller.EspecieController;

import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;
import repository.ArvoreRepository;
import repository.EspecieRepository;

import service.ConexaoServidor;
import service.ContaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;
import service.ArvoreService;
import service.EspecieService;

public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final ArvoreController arvoreController;
    private final EspecieController especieController;

    public ConfiguracaoRotas(
            ConexaoServidor conexaoServidor) {

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

        ServicoEmail servicoEmail =
                new ServicoEmail();

        RecuperacaoSenhaService recuperacaoSenhaService =
                new RecuperacaoSenhaService(
                        contaRepository,
                        recuperacaoSenhaRepository,
                        servicoEmail,
                        contaService);

        // CONTROLLER DE CONTAS

        this.contaController =
                new ContaController(
                        contaService,
                        recuperacaoSenhaService);

        // MODULO DE ARVORES

        ArvoreRepository arvoreRepository =
                new ArvoreRepository();

        ArvoreService arvoreService =
                new ArvoreService(arvoreRepository);

        this.arvoreController =
                new ArvoreController(arvoreService);

        // MODULO DE ESPECIES

        EspecieRepository especieRepository =
                new EspecieRepository();

        EspecieService especieService =
                new EspecieService(especieRepository);

        this.especieController =
                new EspecieController(especieService);
    }

    public void registrarRotas(Javalin servidorHttp) {

        // ==================================
        // ROTAS DE CONTAS
        // ==================================

        servidorHttp.post(
                "/api/contas/cidadaos",
                ctx -> contaController.cadastrarCidadao(ctx));

        servidorHttp.post(
                "/api/contas/funcionarios",
                ctx -> contaController.cadastrarFuncionario(ctx));

        servidorHttp.post(
                "/api/contas/login",
                ctx -> contaController.autenticar(ctx));

        servidorHttp.get(
                "/api/contas/sessao",
                ctx -> contaController.consultarSessao(ctx));

        servidorHttp.post(
                "/api/contas/perfil",
                ctx -> contaController.selecionarPerfil(ctx));

        servidorHttp.post(
                "/api/contas/logout",
                ctx -> contaController.encerrarSessao(ctx));

        servidorHttp.post(
                "/api/contas/redefinir-senha",
                ctx -> contaController.redefinirSenha(ctx));

        servidorHttp.post(
                "/api/contas/recuperacao-senha",
                ctx -> contaController.solicitarRecuperacao(ctx));

        // ==================================
        // ROTAS DE ARVORES
        // ==================================

        servidorHttp.get(
                "/api/arvores",
                ctx -> arvoreController.listar(ctx));

        // Rota fixa antes da rota com {id}

        servidorHttp.get(
                "/api/arvores/proximas",
                ctx -> arvoreController.proximas(ctx));

        servidorHttp.get(
                "/api/arvores/{id}",
                ctx -> arvoreController.consultar(ctx));

        servidorHttp.post(
                "/api/arvores",
                ctx -> arvoreController.cadastrar(ctx));

        servidorHttp.put(
                "/api/arvores/{id}",
                ctx -> arvoreController.atualizar(ctx));

        servidorHttp.patch(
                "/api/arvores/{id}/status",
                ctx -> arvoreController.alterarStatus(ctx));

        // ==================================
        // ROTAS DE ESPECIES
        // ==================================

        servidorHttp.get(
                "/api/especies",
                ctx -> especieController.listar(ctx));

        servidorHttp.post(
                "/api/especies",
                ctx -> especieController.cadastrar(ctx));
    }
}
