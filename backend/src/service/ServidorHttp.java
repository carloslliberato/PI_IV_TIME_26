
package service;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import java.nio.file.Files;
import java.nio.file.Path;

public class ServidorHttp {

    private Javalin servidorHttp;
    private final int PORTA_PADRAO = 8080;
    private Path pastaFrontend;

    public void iniciar() throws Exception {

        // Localiza a pasta frontend antes de iniciar o servidor
        pastaFrontend = localizarPastaFrontend();

        servidorHttp = Javalin.create(config -> {
            config.staticFiles.add(staticFiles -> {
                staticFiles.hostedPath = "/";
                staticFiles.directory = pastaFrontend.toString();
                staticFiles.location = Location.EXTERNAL;
            });
        });

        // PERFIL PÚBLICO
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

        servidorHttp.start(PORTA_PADRAO);
        System.out.println("Servidor HTTP iniciado!");
    }

    // Localiza a pasta frontend a partir do diretório atual
    private Path localizarPastaFrontend() {

        Path diretorio = Path.of("").toAbsolutePath().normalize();

        while (diretorio != null) {

            Path candidata = diretorio.resolve("frontend");

            if (Files.isDirectory(candidata)) {
                return candidata;
            }

            diretorio = diretorio.getParent();
        }

        throw new IllegalStateException("Pasta frontend não encontrada!");
    }

    public void fechar() {
        if (servidorHttp != null) {
            servidorHttp.stop();
            servidorHttp = null;
            System.out.println("Servidor HTTP encerrado!");
        }
    }
}
