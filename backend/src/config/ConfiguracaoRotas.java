package config;

import controller.ArvoreController;
import controller.ContaController;
import controller.EquipeController;
import controller.EspecieController;
import controller.IntervencaoController;
import controller.OcorrenciaController;
import controller.OrdemDeServicoController;
import controller.RelatorioController;
import io.javalin.Javalin;
import repository.ArvoreRepository;
import repository.ContaRepository;
import repository.EquipeRepository;
import repository.EspecieRepository;
import repository.IntervencaoRepository;
import repository.MunicipioRepository;
import repository.OcorrenciaRepository;
import repository.OrdemDeServicoRepository;
import repository.RecuperacaoSenhaRepository;
import repository.RelatorioRepository;
import service.ArvoreService;
import service.ConexaoServidor;
import service.ContaService;
import service.EquipeService;
import service.EspecieService;
import service.IntervencaoService;
import service.OcorrenciaService;
import service.OrdemDeServicoService;
import service.RecuperacaoSenhaService;
import service.ServicoEmail;
import service.RelatorioService;

public class ConfiguracaoRotas {

    private final ContaController contaController;
    private final ArvoreController arvoreController;
    private final EspecieController especieController;
    private final EquipeController equipeController;
    private final OcorrenciaController ocorrenciaController;
    private final OrdemDeServicoController ordemDeServicoController;
    private final IntervencaoController intervencaoController;
    private final RelatorioController relatorioController;

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

        // Inicializa o repositório, serviço e controlador de Ocorrências
        OcorrenciaRepository ocorrenciaRepository =
                new OcorrenciaRepository();

        OcorrenciaService ocorrenciaService =
                new OcorrenciaService(ocorrenciaRepository);

        this.ocorrenciaController =
                new OcorrenciaController(ocorrenciaService);
        OrdemDeServicoRepository ordemRepository =
                new OrdemDeServicoRepository();

        OrdemDeServicoService ordemService =
                new OrdemDeServicoService(
                        ordemRepository,
                        contaRepository);

        this.ordemDeServicoController =
                new OrdemDeServicoController(ordemService);

        IntervencaoRepository intervencaoRepository =
        new IntervencaoRepository();

        IntervencaoService intervencaoService =
                new IntervencaoService(
                        intervencaoRepository,
                        contaRepository);

        this.intervencaoController =
                new IntervencaoController(intervencaoService);

        RelatorioRepository relatorioRepository =
                new RelatorioRepository();

        RelatorioService relatorioService =
                new RelatorioService(relatorioRepository, contaRepository);

        this.relatorioController =
                new RelatorioController(relatorioService);
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

        // Rotas de Ocorrências
        servidorHttp.post(
                "/api/ocorrencias",
                ctx -> ocorrenciaController.abrirChamado(ctx));

        servidorHttp.get(
                "/api/ocorrencias",
                ctx -> ocorrenciaController.listarOcorrencias(ctx));

        servidorHttp.get(
                "/api/ocorrencias/minhas",
                ctx -> ocorrenciaController.listarMinhasOcorrencias(ctx));

        servidorHttp.get(
                "/api/ocorrencias/protocolo/{protocolo}",
                ctx -> ocorrenciaController.consultarPorProtocolo(ctx));

        servidorHttp.get(
                "/api/ocorrencias/{id}",
                ctx -> ocorrenciaController.consultarPorId(ctx));

        servidorHttp.patch(
                "/api/ocorrencias/{id}/status",
                ctx -> ocorrenciaController.atualizarStatus(ctx));

        servidorHttp.patch(
                "/api/ocorrencias/{id}/prioridade",
                ctx -> ocorrenciaController.atualizarPrioridade(ctx));

        servidorHttp.patch(
                "/api/ocorrencias/{id}/notificacoes",
                ctx -> ocorrenciaController.atualizarNotificacao(ctx));
        servidorHttp.get(
                "/api/ordens-servico",
                ctx -> ordemDeServicoController.listar(ctx));

        servidorHttp.post(
                "/api/ordens-servico",
                ctx -> ordemDeServicoController.criar(ctx));

        // O caminho fixo precisa ser registrado antes de /{id}.
        servidorHttp.get(
                "/api/ordens-servico/opcoes-cadastro",
                ctx -> ordemDeServicoController.opcoesCadastro(ctx));

        servidorHttp.get(
                "/api/ordens-servico/{id}",
                ctx -> ordemDeServicoController.consultar(ctx));

        servidorHttp.patch(
                "/api/ordens-servico/{id}/status",
                ctx -> ordemDeServicoController.alterarStatus(ctx));

        servidorHttp.get(
                "/api/ordens-servico/{id}/equipes",
                ctx -> ordemDeServicoController.listarEquipes(ctx));

        servidorHttp.patch(
                "/api/ordens-servico/{id}/equipe",
                ctx -> ordemDeServicoController.atribuirEquipe(ctx));

        servidorHttp.post(
                "/api/ordens-servico/{id}/conclusao",
                ctx -> ordemDeServicoController.concluir(ctx));

        servidorHttp.get(
                "/api/intervencoes",
                ctx -> intervencaoController.listar(ctx));

        servidorHttp.get(
                "/api/relatorios/ordens-servico",
                ctx -> relatorioController.consultarOrdensDeServico(ctx));

    }
}
