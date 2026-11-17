
package config;

import io.javalin.Javalin;

import controller.ContaController;
import controller.ArvoreController;
import controller.EspecieController;
import controller.EquipeController;

import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RecuperacaoSenhaRepository;
import repository.ArvoreRepository;
import repository.EspecieRepository;
import repository.EquipeRepository;

import service.ConexaoServidor;
import service.ContaService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;
import service.ArvoreService;
import service.EspecieService;
import service.EquipeService;

public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final ArvoreController arvoreController;
    private final EspecieController especieController;
    private final EquipeController equipeController;

    public ConfiguracaoRotas(
            ConexaoServidor conexaoServidor) {

        ContaRepository contaRepository =
                new ContaRepository();

        MunicipioRepository municipioRepository =
                new MunicipioRepository();

        RecuperacaoSenhaRepository recuperacaoSenhaRepository =
                new RecuperacaoSenhaRepository();

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

        this.contaController =
                new ContaController(
                        contaService,
                        recuperacaoSenhaService);

        ArvoreRepository arvoreRepository =
                new ArvoreRepository();

        ArvoreService arvoreService =
                new ArvoreService(
                        arvoreRepository,
                        conexaoServidor);

        this.arvoreController =
                new ArvoreController(arvoreService);

        EspecieRepository especieRepository =
                new EspecieRepository();

        EspecieService especieService =
                new EspecieService(especieRepository);

        this.especieController =
                new EspecieController(especieService);

        EquipeService equipeService =
                new EquipeService(
                        contaRepository,
                        new EquipeRepository(),
                        municipioRepository);

        this.equipeController =
                new EquipeController(equipeService);
    }

    public void registrarRotas(Javalin servidorHttp) {

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

        servidorHttp.get(
                "/api/arvores",
                ctx -> arvoreController.listar(ctx));

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

        servidorHttp.get(
                "/api/especies",
                ctx -> especieController.listar(ctx));

        servidorHttp.post(
                "/api/especies",
                ctx -> especieController.cadastrar(ctx));

        servidorHttp.get(
                "/api/equipes",
                ctx -> equipeController.listar(ctx));

        servidorHttp.post(
                "/api/equipes",
                ctx -> equipeController.cadastrar(ctx));

        servidorHttp.delete(
                "/api/equipes/{equipeId}",
                ctx -> equipeController.excluir(ctx));

        servidorHttp.post(
                "/api/equipes/{equipeId}/colaboradores",
                ctx -> equipeController.cadastrarColaborador(ctx));

        servidorHttp.delete(
                "/api/equipes/{equipeId}/colaboradores/{colaboradorId}",
                ctx -> equipeController.excluirColaborador(ctx));
    }
}
