
package controller;

import java.util.Map;
import org.bson.types.ObjectId;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;
import service.RelatorioService;

public class RelatorioController {
    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        if (relatorioService == null) {
            throw new IllegalArgumentException("O serviço de relatórios não pode ser nulo.");
        }

        this.relatorioService = relatorioService;
    }

    public void consultarOrdensDeServico(Context ctx) {
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar os relatórios."));
            return;
        }

        try {
            ObjectId municipioId = relatorioService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());

            Map<String, Object> relatorio = relatorioService.consultarOrdensDeServico(
                    municipioId,
                    ctx.queryParam("ano"));

            ctx.status(200).json(Map.of("relatorio", relatorio));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar o relatório de ordens de serviço."));
        }
    }

    public void consultarArvores(Context ctx) {
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar os relatórios."));
            return;
        }

        try {
            ObjectId municipioId = relatorioService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());

            Map<String, Object> relatorio = relatorioService.consultarArvores(municipioId);

            ctx.status(200).json(Map.of("relatorio", relatorio));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar o relatório de árvores."));
        }
    }

    public void consultarOcorrencias(Context ctx) {
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar os relatórios."));
            return;
        }

        try {
            ObjectId municipioId = relatorioService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());

            Map<String, Object> relatorio = relatorioService.consultarOcorrencias(municipioId);

            ctx.status(200).json(Map.of("relatorio", relatorio));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar o relatório de ocorrências."));
        }
    }

    public void consultarEquipes(Context ctx) {
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar os relatórios."));
            return;
        }

        try {
            ObjectId municipioId = relatorioService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());

            Map<String, Object> relatorio = relatorioService.consultarEquipes(municipioId);

            ctx.status(200).json(Map.of("relatorio", relatorio));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar o relatório de equipes."));
        }
    }
}
