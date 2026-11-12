package controller;

import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;

import com.google.gson.Gson;
import com.google.gson.JsonParseException;

import dto.CadastroEquipeDTO;
import dto.CadastroColaboradorDTO;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;
import model.Equipe;
import model.Colaborador;
import service.EquipeService;

// Recebe as requisições HTTP de criação de equipes e devolve respostas JSON.
public class EquipeController {

    private final Gson gson = new Gson();
    private final EquipeService equipeService;

    public EquipeController(EquipeService equipeService) {
        this.equipeService = equipeService;
    }

    public void listar(Context ctx) {
        // Exige uma sessão existente e identifica o usuário autenticado.
        HttpSession sessao = ctx.req().getSession(false);
        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        // Confirma no servidor que o perfil profissional está ativo.
        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of(
                    "erro", "Selecione o perfil de funcionário para consultar equipes."));
            return;
        }

        try {
            // Lê os filtros enviados pela página e mantém a identidade da sessão como escopo.
            String usuarioId = sessao.getAttribute("usuarioId").toString();
            String busca = ctx.queryParam("busca");
            String status = ctx.queryParam("status");
            List<Map<String, Object>> equipes = equipeService
                    .listarEquipes(usuarioId, busca, status)
                    .stream()
                    .map(this::paraResposta)
                    .collect(Collectors.toList());

            ctx.status(200).json(Map.of("equipes", equipes));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao consultar as equipes."));
        }
    }

    public void cadastrar(Context ctx) {
        // Exige uma sessão existente e identifica o usuário autenticado.
        HttpSession sessao = ctx.req().getSession(false);
        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return;
        }

        // Exige o perfil profissional também no backend, não só na interface.
        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of(
                    "erro", "Selecione o perfil de funcionário para criar equipes."));
            return;
        }

        try {
            // Converte o JSON da tela para o DTO de cadastro.
            CadastroEquipeDTO dados = gson.fromJson(
                    ctx.body(),
                    CadastroEquipeDTO.class);

            if (dados == null) {
                throw new IllegalArgumentException(
                        "Os dados da equipe não foram informados.");
            }

            // Cria a equipe usando o ID guardado na sessão do servidor.
            String usuarioId = sessao.getAttribute("usuarioId").toString();
            Equipe equipe = equipeService.criarEquipe(dados, usuarioId);

            // Retorna os dados necessários à tela, incluindo o ID persistido.
            ctx.status(201).json(Map.of(
                    "equipe", Map.of(
                            "id", equipe.getId().toHexString(),
                            "nome", equipe.getNome(),
                            "regiaoAtuacao", equipe.getRegiaoAtuacao(),
                            "status", equipe.getStatus(),
                            "gestor", equipe.getGestor(),
                            "municipioId", equipe.getMunicipioId().toHexString(),
                            "municipioNome", equipe.getMunicipioNome(),
                            "usuarioId", equipe.getUsuarioId().toHexString(),
                            "usuarioNome", equipe.getUsuarioNome())));

        } catch (JsonParseException erro) {
            ctx.status(400).json(Map.of(
                    "erro", "Formato JSON inválido."));

        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao cadastrar a equipe."));
        }
    }

    // Exclui uma equipe após validar propriedade, colaboradores e ordens vinculadas.
    public void excluir(Context ctx) {
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) {
            return;
        }

        try {
            boolean removida = equipeService.excluirEquipe(
                    ctx.pathParam("equipeId"),
                    sessao.getAttribute("usuarioId").toString());
            if (!removida) {
                ctx.status(404).json(Map.of("erro", "Equipe não encontrada para esta conta."));
                return;
            }

            ctx.status(200).json(Map.of("mensagem", "Equipe excluída com sucesso."));
        } catch (IllegalStateException erro) {
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao excluir a equipe."));
        }
    }

    // Recebe um colaborador e delega a gravação ao serviço da equipe.
    public void cadastrarColaborador(Context ctx) {
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) {
            return;
        }

        try {
            // Converte o JSON da requisição para os campos do cadastro.
            CadastroColaboradorDTO dados = gson.fromJson(
                    ctx.body(),
                    CadastroColaboradorDTO.class);
            if (dados == null) {
                throw new IllegalArgumentException(
                        "Os dados do colaborador não foram informados.");
            }

            // Usa o usuário da sessão e o ID da equipe presente na rota.
            Colaborador colaborador = equipeService.cadastrarColaborador(
                    ctx.pathParam("equipeId"),
                    dados,
                    sessao.getAttribute("usuarioId").toString());

            // Retorna o colaborador criado para atualizar a interface.
            ctx.status(201).json(Map.of(
                    "colaborador",
                    paraRespostaColaborador(colaborador)));
        } catch (JsonParseException erro) {
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));
        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao cadastrar o colaborador."));
        }
    }

    // Remove um colaborador mediante solicitação confirmada na interface.
    public void excluirColaborador(Context ctx) {
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) {
            return;
        }

        try {
            // O serviço valida vínculo, status da equipe e identificadores.
            boolean removido = equipeService.removerColaborador(
                    ctx.pathParam("equipeId"),
                    ctx.pathParam("colaboradorId"),
                    sessao.getAttribute("usuarioId").toString());

            // Informa quando o ID solicitado não existe dentro daquela equipe.
            if (!removido) {
                ctx.status(404).json(Map.of(
                        "erro", "Colaborador não encontrado nesta equipe."));
                return;
            }

            // Confirma a exclusão persistida no MongoDB.
            ctx.status(200).json(Map.of(
                    "mensagem", "Colaborador excluído com sucesso."));
        } catch (IllegalStateException erro) {
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Erro interno ao excluir o colaborador."));
        }
    }

    // Valida autenticação e perfil profissional nos endpoints de colaborador.
    private HttpSession obterSessaoDeFuncionario(Context ctx) {
        HttpSession sessao = ctx.req().getSession(false);
        if (sessao == null || sessao.getAttribute("usuarioId") == null) {
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return null;
        }
        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))) {
            ctx.status(403).json(Map.of(
                    "erro", "Selecione o perfil de funcionário para gerenciar equipes e colaboradores."));
            return null;
        }
        return sessao;
    }

    // Formata os IDs BSON como strings para a resposta JSON da tela.
    private Map<String, Object> paraResposta(Equipe equipe) {
        return Map.of(
                "id", equipe.getId().toHexString(),
                "nome", equipe.getNome(),
                "regiaoAtuacao", equipe.getRegiaoAtuacao(),
                "status", equipe.getStatus(),
                "gestor", equipe.getGestor(),
                "municipioId", equipe.getMunicipioId().toHexString(),
                "municipioNome", equipe.getMunicipioNome() == null
                        ? ""
                        : equipe.getMunicipioNome(),
                "usuarioId", equipe.getUsuarioId().toHexString(),
                "usuarioNome", equipe.getUsuarioNome() == null
                        ? ""
                        : equipe.getUsuarioNome(),
                "colaboradores", equipe.getColaboradores()
                        .stream()
                        .map(this::paraRespostaColaborador)
                        .toList());
    }

    // Converte um colaborador embutido para os tipos simples do JSON da API.
    private Map<String, Object> paraRespostaColaborador(Colaborador colaborador) {
        return Map.of(
                "id", colaborador.getId().toHexString(),
                "nomeCompleto", colaborador.getNomeCompleto(),
                "funcao", colaborador.getFuncao(),
                "email", colaborador.getEmail(),
                "regiaoAtuacao", colaborador.getRegiaoAtuacao(),
                "disponivel", colaborador.isDisponivel());
    }
}
