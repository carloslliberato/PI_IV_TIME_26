
package service;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import java.nio.file.Files;
import java.nio.file.Path;

public class ServidorHttp {

    private Javalin servidorHttp;
    private final int PORTA_PADRAO = 8080;

    public void iniciar() {
        try {
            servidorHttp = Javalin.create(config -> {
                config.staticFiles.add(staticFiles -> {
                    staticFiles.hostedPath = "/";
                    staticFiles.directory = Path.of("..", "frontend")
                            .toAbsolutePath()
                            .normalize()
                            .toString();
                    staticFiles.location = Location.EXTERNAL;
                });
            });

            // PERFIL PÚBLICO
            servidorHttp.get("/", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_publico", "index.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/abrir-chamado", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_publico", "abrir-chamado.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/acompanhar-chamado", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_publico", "acompanhe-chamado.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/cadastro-cidadao", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_publico", "cadastro-cidadao.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/ocorrencias-cidadao", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_publico", "ocorrencias-cidadao.html");
                ctx.html(Files.readString(arquivo));
            });

            // LOGIN
            servidorHttp.get("/login", ctx -> {
                Path arquivo = Path.of("..", "frontend", "login", "login.html");
                ctx.html(Files.readString(arquivo));
            });

            // CADASTRO DE FUNCIONÁRIO
            servidorHttp.get("/cadastro-funcionario", ctx -> {
                Path arquivo = Path.of("..", "frontend", "cadastro_funcionario", "cadastro.html");
                ctx.html(Files.readString(arquivo));
            });

            // PERFIL PROFISSIONAL
            servidorHttp.get("/perfil-profissional", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "inicial.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/arvores", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "arvores.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/equipes", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "equipes.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/mapa-profissional", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "mapa-profissional.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/ocorrencias", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "ocorrencias.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/ordens-servico", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "ordens-servico.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.get("/relatorio", ctx -> {
                Path arquivo = Path.of("..", "frontend", "perfil_profissional", "relatorio.html");
                ctx.html(Files.readString(arquivo));
            });

            servidorHttp.start(PORTA_PADRAO);
            System.out.println("Servidor HTTP iniciado!");

        } catch (Exception e) {
            System.err.printf("Erro ao iniciar o servidor HTTP: %s%n", e.getMessage());
        }
    }
}
