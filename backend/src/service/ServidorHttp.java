
package service;

import config.ConfiguracaoPaginas;
import config.ConfiguracaoRotas;
import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;
import java.nio.file.Files;
import java.nio.file.Path;

public class ServidorHttp {

    private Javalin servidorHttp;
    private final int PORTA_PADRAO = 8080;
    private Path pastaFrontend;
    private ConexaoServidor conexaoServidor;

    public ServidorHttp(ConexaoServidor conexaoServidor) {
        this.conexaoServidor = conexaoServidor;
    }

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

        // Registra as rotas das páginas HTML
        ConfiguracaoPaginas configuracaoPaginas =
                new ConfiguracaoPaginas(pastaFrontend);

        configuracaoPaginas.registrarPaginas(servidorHttp);

        // Registra as rotas da API
        ConfiguracaoRotas configuracaoRotas =
                new ConfiguracaoRotas(conexaoServidor);

        configuracaoRotas.registrarRotas(servidorHttp);

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
