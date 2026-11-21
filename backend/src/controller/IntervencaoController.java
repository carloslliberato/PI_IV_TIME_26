// Autor: Carlos Luciano, Sophia Fernandes

package controller;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.bson.types.ObjectId;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;
import model.Intervencao;
import service.IntervencaoService;

public class IntervencaoController{
    private final IntervencaoService intervencaoService;

    public IntervencaoController(IntervencaoService intervencaoService){
        if (intervencaoService == null){
            throw new IllegalArgumentException("O serviço de intervenções não pode ser nulo.");
        }

        this.intervencaoService = intervencaoService;
    }

    // Lista o histórico do município, com filtro opcional pelo ID da árvore.
    public void listar(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);

        if (sessao == null) return;

        try {
            String usuarioId = sessao.getAttribute("usuarioId").toString();
            ObjectId municipioId = intervencaoService.obterMunicipioDoFuncionario(usuarioId);

            String arvoreId = ctx.queryParam("arvoreId");
            List<Intervencao> intervencoes;

            if (arvoreId == null){
                intervencoes = intervencaoService.listarPorMunicipio(municipioId);
            } else {
                if (!ObjectId.isValid(arvoreId)){
                    ctx.status(400).json(Map.of("erro", "O identificador da árvore é inválido."));
                    return;
                }

                intervencoes = intervencaoService.listarPorArvore(
                        new ObjectId(arvoreId), municipioId);
            }

            List<Map<String, Object>> resposta = new ArrayList<>();

            for (Intervencao intervencao : intervencoes){
                resposta.add(paraResposta(intervencao));
            }

            ctx.status(200).json(Map.of("intervencoes", resposta));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar as intervenções."));
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
            ctx.status(403).json(Map.of("erro", "Selecione o perfil de funcionário para consultar as intervenções."));
            return null;
        }

        return sessao;
    }

    // Prepara os identificadores, textos, fotos e datas para a resposta JSON.
    private Map<String, Object> paraResposta(Intervencao intervencao){
        Map<String, Object> resposta = new HashMap<>();

        resposta.put("id", converterId(intervencao.getIntervencaoId()));
        resposta.put("municipioId", converterId(intervencao.getMunicipioId()));
        resposta.put("arvoreId", converterId(intervencao.getArvoreId()));
        resposta.put("ordemServicoId", converterId(intervencao.getOrdemServicoId()));
        resposta.put("equipeId", converterId(intervencao.getEquipeId()));
        resposta.put("usuarioId", converterId(intervencao.getUsuarioId()));
        resposta.put("tipo", intervencao.getTipo());
        resposta.put("descricao", intervencao.getDescricao());
        resposta.put("fotos", intervencao.getFotos());
        resposta.put("dataExecucao", converterData(intervencao.getDataExecucao()));
        resposta.put("dataCriacao", converterData(intervencao.getDataCriacao()));

        return resposta;
    }

    // Converte um ObjectId para texto, preservando a ausência de valor.
    private String converterId(ObjectId id){
        return id == null ? null : id.toHexString();
    }

    // Converte um instante para texto, preservando a ausência de valor.
    private String converterData(Instant data){
        return data == null ? null : data.toString();
    }
}
