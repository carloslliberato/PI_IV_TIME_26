
package config;

import io.javalin.Javalin;
import io.javalin.http.Context;

import java.nio.file.Files;
import java.nio.file.Path;

public class ConfiguracaoPaginas {

    private final Path pastaFrontend;

    public ConfiguracaoPaginas(Path pastaFrontend) {
        this.pastaFrontend = pastaFrontend;
    }

    public void registrarPaginas(Javalin servidorHttp) {

        // PÁGINAS PÚBLICAS
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

        // PÁGINAS PROFISSIONAIS (PROTEGIDAS)
        registrarPaginaProfissional(
                servidorHttp, "/perfil-profissional", "inicial.html");

        registrarPaginaProfissional(
                servidorHttp, "/arvores", "arvores.html");

        registrarPaginaProfissional(
                servidorHttp, "/equipes", "equipes.html");

        registrarPaginaProfissional(
                servidorHttp, "/mapa-profissional", "mapa-profissional.html");

        registrarPaginaProfissional(
                servidorHttp, "/ocorrencias", "ocorrencias.html");

        registrarPaginaProfissional(
                servidorHttp, "/ordens-servico", "ordens-servico.html");

        registrarPaginaProfissional(
                servidorHttp, "/relatorio", "relatorio.html");
    }

    // VERIFICA SE O USUÁRIO ESTÁ AUTORIZADO COMO FUNCIONÁRIO
    private boolean funcionarioAutorizado(Context ctx) {

        var sessao = ctx.req().getSession(false);

        if (sessao == null) {
            return false;
        }

        Object usuarioId = sessao.getAttribute("usuarioId");
        Object perfilAtivo = sessao.getAttribute("perfilAtivo");
        Object perfis = sessao.getAttribute("perfis");

        if (usuarioId == null) {
            return false;
        }

        if (!"FUNCIONARIO".equals(perfilAtivo)) {
            return false;
        }

        if (!(perfis instanceof java.util.List<?> listaPerfis)) {
            return false;
        }

        return listaPerfis.contains("FUNCIONARIO");
    }

    // REGISTRA UMA PÁGINA PROFISSIONAL COM VERIFICAÇÃO DE ACESSO
    private void registrarPaginaProfissional(
            Javalin servidorHttp,
            String rota,
            String nomeArquivo) {

        servidorHttp.get(rota, ctx -> {

            if (!funcionarioAutorizado(ctx)) {
                ctx.redirect("/login");
                return;
            }

            Path arquivo = pastaFrontend
                    .resolve("perfil_profissional")
                    .resolve(nomeArquivo);

            ctx.html(Files.readString(arquivo));
        });
    }
}
