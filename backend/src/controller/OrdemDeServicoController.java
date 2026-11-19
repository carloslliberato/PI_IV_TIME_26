package controller;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.ArrayList;
import java.util.List;
import org.bson.types.ObjectId;
import model.OrdemDeServico;
import service.OrdemDeServicoService;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;
import com.google.gson.Gson;
import com.google.gson.JsonParseException;

public class OrdemDeServicoController {
    private final OrdemDeServicoService ordemService;
    private final Gson gson = new Gson();

    public OrdemDeServicoController(OrdemDeServicoService ordemService){
        if (ordemService == null){
            throw new IllegalArgumentException("O serviço de OS não pode ser nulo");
        }

        this.ordemService = ordemService;
    }

    // Lista as OS do município do funcionário autenticado.
    public void listar(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);

        if (sessao == null) return;

        try {
            String usuarioId = sessao.getAttribute("usuarioId").toString();

            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(usuarioId);

            List<OrdemDeServico> ordens = ordemService.listarPorMunicipio(municipioId);

            List<Map<String, Object>> resposta = new ArrayList<>();

            for (OrdemDeServico ordem : ordens){
                resposta.add(paraResposta(ordem));
            }

            ctx.status(200).json(Map.of("ordens", resposta));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar as ordens de serviço."));
        }
    }

    // Consulta uma OS pelo ID dentro do município do funcionário autenticado.
    public void consultar(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);

        if (sessao == null) return;

        try {
            String usuarioId = sessao.getAttribute("usuarioId").toString();

            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(usuarioId);

            String id = ctx.pathParam("id");

            if (!ObjectId.isValid(id)){
                ctx.status(400).json(Map.of("erro", "O identificador da OS é inválido."));
                return;
            }

            OrdemDeServico ordem = ordemService.buscarPorId(new ObjectId(id), municipioId);

            ctx.status(200).json(Map.of("ordem", paraResposta(ordem)));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();

            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar a ordem de serviço."));
        }
    }

    // Recebe o pedido de cancelamento de uma OS.
    public void alterarStatus(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);

        if (sessao == null) return;

        try {
            String usuarioId = sessao.getAttribute("usuarioId").toString();

            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(usuarioId);

            String id = ctx.pathParam("id");

            if (!ObjectId.isValid(id)){
                ctx.status(400).json(Map.of("erro", "O identificador da OS é inválido."));
                return;
            }

            Map<?, ?> dados = gson.fromJson(ctx.body(), Map.class);

            if (dados == null || !"Cancelada".equals(dados.get("status"))) {
                ctx.status(400).json(Map.of("erro", "Informe o status \"Cancelada\" para esta operação."));
                return;
            }

            OrdemDeServico ordem = ordemService.cancelar(new ObjectId(id), municipioId);

            ctx.status(200).json(Map.of("ordem", paraResposta(ordem)));

        } catch (JsonParseException erro){
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalStateException erro){
            ctx.status(409).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();

            ctx.status(500).json(Map.of("erro", "Erro interno ao cancelar a ordem de serviço."));
        }
    }

    // Verifica se existe uma sessão com o perfil de funcionário ativo.
    private HttpSession obterSessaoDeFuncionario(Context ctx){
        HttpSession sessao = ctx.req().getSession(false);

        if (sessao == null || sessao.getAttribute("usuarioId") == null){
            ctx.status(401).json(Map.of("erro", "Usuário não autenticado."));
            return null;
        }

        if (!"FUNCIONARIO".equals(sessao.getAttribute("perfilAtivo"))){
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar as OS."));
            return null;
        }

        return sessao;
    }

    // Prepara os dados de uma OS para a resposta da API.
    private Map<String, Object> paraResposta(OrdemDeServico ordem) {
        Map<String, Object> resposta = new HashMap<>();

        resposta.put("id", converterId(ordem.getOrdemServicoId()));
        resposta.put("codigo", ordem.getCodigo());
        resposta.put("municipioId", converterId(ordem.getMunicipioId()));
        resposta.put("arvoreId", converterId(ordem.getArvoreId()));
        resposta.put("ocorrenciaId", converterId(ordem.getOcorrenciaId()));
        resposta.put("equipeId", converterId(ordem.getEquipeId()));
        resposta.put("titulo", ordem.getTitulo());
        resposta.put("descricao", ordem.getDescricao());
        resposta.put("status", ordem.getStatus());
        resposta.put("prioridade", ordem.getPrioridade());
        resposta.put("observacoes", ordem.getObservacoes());
        resposta.put("dataCriacao", converterData(ordem.getDataCriacao()));
        resposta.put("dataAtualizacao", converterData(ordem.getDataAtualizacao()));
        resposta.put("dataConclusao", converterData(ordem.getDataConclusao()));

        return resposta;
    }       
    
    // Converte um ObjectId para texto, preservando a ausência de valor.
    private String converterId(ObjectId id) {
        return id == null ? null : id.toHexString();
    }

    // Converte um instante para texto, preservando a ausência de valor.
    private String converterData(Instant data) {
        return data == null ? null : data.toString();
    }    
    
}
