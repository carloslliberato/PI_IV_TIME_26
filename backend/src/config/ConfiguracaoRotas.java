package config;

import service.ConexaoServidor;
import io.javalin.Javalin;

import controller.ContaController;
import repository.ContaRepository;
import repository.MunicipioRepository;
import service.ContaService;

// configuração das rotas das APIs
public class ConfiguracaoRotas {

    private final ContaController contaController;

    public ConfiguracaoRotas(ConexaoServidor conexaoServidor) {

        ContaRepository contaRepository = new ContaRepository();
        MunicipioRepository municipioRepository = new MunicipioRepository();

        ContaService contaService = new ContaService(
                contaRepository,
                municipioRepository,
                conexaoServidor);

        this.contaController = new ContaController(contaService);
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

    }
}