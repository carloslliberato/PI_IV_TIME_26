package config;

import io.javalin.Javalin;
import java.nio.file.Files;
import java.nio.file.Path;

public class ConfiguracaoPaginas {

    private final Path pastaFrontend;

    public ConfiguracaoPaginas(Path pastaFrontend) {
        this.pastaFrontend = pastaFrontend;
    }

    public void registrarPaginas(Javalin servidorHttp) {
        servidorHttp.get("/", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_publico").resolve("index.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/abrir-chamado", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_publico").resolve("abrir-chamado.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/acompanhar-chamado", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_publico").resolve("acompanhe-chamado.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/cadastro-cidadao", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_publico").resolve("cadastro-cidadao.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/ocorrencias-cidadao", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_publico").resolve("ocorrencias-cidadao.html");
            ctx.html(Files.readString(arquivo));
        });

        // LOGIN
        servidorHttp.get("/login", ctx -> {
            Path arquivo = pastaFrontend.resolve("login").resolve("login.html");
            ctx.html(Files.readString(arquivo));
        });

        // CADASTRO DE FUNCIONÁRIO
        servidorHttp.get("/cadastro-funcionario", ctx -> {
            Path arquivo = pastaFrontend.resolve("cadastro_funcionario").resolve("cadastro.html");
            ctx.html(Files.readString(arquivo));
        });

        // PERFIL PROFISSIONAL
        servidorHttp.get("/perfil-profissional", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("inicial.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/arvores", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("arvores.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/equipes", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("equipes.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/mapa-profissional", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("mapa-profissional.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/ocorrencias", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("ocorrencias.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/ordens-servico", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("ordens-servico.html");
            ctx.html(Files.readString(arquivo));
        });

        servidorHttp.get("/relatorio", ctx -> {
            Path arquivo = pastaFrontend.resolve("perfil_profissional").resolve("relatorio.html");
            ctx.html(Files.readString(arquivo));
        });
    }
}