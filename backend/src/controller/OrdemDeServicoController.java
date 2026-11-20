package controller;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.ArrayList;
import java.util.List;
import org.bson.types.ObjectId;
import model.OrdemDeServico;
import model.Intervencao;
import model.ConclusaoOrdemDeServico;
import dto.ConclusaoOrdemDeServicoDTO;
import dto.CadastroOrdemDeServicoDTO;
import dto.CancelamentoOrdemDeServicoDTO;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;
import model.EquipeParaOrdemDeServico;
import service.OrdemDeServicoService;
import service.ValidacaoOrdemDeServicoIndisponivelException;
import io.javalin.http.Context;
import jakarta.servlet.http.HttpSession;
import com.google.gson.Gson;
import com.google.gson.JsonParseException;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class OrdemDeServicoController {
    private final OrdemDeServicoService ordemService;
    private final Gson gson = new Gson();

    public OrdemDeServicoController(OrdemDeServicoService ordemService){
        if (ordemService == null){
            throw new IllegalArgumentException("O serviço de OS não pode ser nulo");
        }

        this.ordemService = ordemService;
    }

    public void opcoesCadastro(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(sessao.getAttribute("usuarioId").toString());
            ctx.status(200).json(ordemService.opcoesDeCadastro(municipioId));
        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Não foi possível consultar as opções para cadastrar a OS."));
        }
    }

    public void listarEquipesDisponiveisParaOcorrencia(Context ctx) {
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());
            String ocorrenciaId = ctx.pathParam("id");
            if (!ObjectId.isValid(ocorrenciaId)) {
                throw new IllegalArgumentException(
                        "O identificador da ocorrência é inválido.");
            }
            List<Map<String, Object>> equipes = new ArrayList<>();
            for (EquipeParaOrdemDeServico equipe
                    : ordemService.listarEquipesDisponiveisParaOcorrencia(
                            new ObjectId(ocorrenciaId), municipioId)) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", converterId(equipe.id()));
                item.put("nome", equipe.nome());
                item.put("disponivel", equipe.disponivel());
                equipes.add(item);
            }
            ctx.status(200).json(Map.of("equipes", equipes));
        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro) {
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Não foi possível consultar equipes disponíveis."));
        }
    }

    public void criarParaOcorrencia(Context ctx) {
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(
                    sessao.getAttribute("usuarioId").toString());
            String ocorrenciaId = ctx.pathParam("id");
            if (!ObjectId.isValid(ocorrenciaId)) {
                throw new IllegalArgumentException(
                        "O identificador da ocorrência é inválido.");
            }
            JsonElement raiz = JsonParser.parseString(ctx.body());
            if (raiz == null || !raiz.isJsonObject()) {
                throw new IllegalArgumentException(
                        "Informe a equipe selecionada para esta ocorrência.");
            }
            JsonElement equipeId = raiz.getAsJsonObject().get("equipeId");
            if (equipeId == null || !equipeId.isJsonPrimitive()
                    || !equipeId.getAsJsonPrimitive().isString()) {
                throw new IllegalArgumentException(
                        "Informe o identificador da equipe como texto.");
            }
            OrdemDeServico ordem = ordemService.criarParaOcorrencia(
                    new ObjectId(ocorrenciaId), municipioId, equipeId.getAsString());
            ctx.status(201).json(Map.of("ordem", paraResposta(ordem)));
        } catch (JsonParseException erro) {
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));
        } catch (SecurityException erro) {
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro) {
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro) {
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalStateException erro) {
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (ValidacaoOrdemDeServicoIndisponivelException erro) {
            ctx.status(503).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro) {
            erro.printStackTrace();
            ctx.status(500).json(Map.of(
                    "erro", "Não foi possível confirmar a criação da OS. Consulte a listagem antes de tentar novamente."));
        }
    }

    // O município vem da sessão; o cadastro recebe os valores finais editados pelo funcionário.
    public void criar(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(sessao.getAttribute("usuarioId").toString());
            JsonElement raiz = JsonParser.parseString(ctx.body());
            if (raiz == null || !raiz.isJsonObject())
                throw new IllegalArgumentException("Informe um objeto JSON com os dados da nova OS.");
            JsonObject objeto = raiz.getAsJsonObject();
            for (String campo : List.of("titulo", "descricao", "arvoreId", "ocorrenciaId", "equipeId", "prioridade", "observacoes")){
                JsonElement valor = objeto.get(campo);
                if (valor != null && !valor.isJsonNull()
                        && (!valor.isJsonPrimitive() || !valor.getAsJsonPrimitive().isString()))
                    throw new IllegalArgumentException("O campo " + campo + " deve ser um texto.");
            }
            CadastroOrdemDeServicoDTO dados = gson.fromJson(objeto, CadastroOrdemDeServicoDTO.class);
            OrdemDeServico ordem = ordemService.criar(municipioId, dados);
            ctx.status(201).json(Map.of("ordem", paraRespostaComConclusao(ordem, null)));
        } catch (JsonParseException erro){
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));
        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro){
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalStateException erro){
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (ValidacaoOrdemDeServicoIndisponivelException erro){
            ctx.status(503).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Não foi possível confirmar o cadastro. Consulte a lista de OS antes de tentar novamente."));
        }
    }

    // Lista as OS do município do funcionário autenticado.
    public void listar(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);

        if (sessao == null) return;

        try {
            String usuarioId = sessao.getAttribute("usuarioId").toString();

            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(usuarioId);

            List<OrdemDeServico> ordens = ordemService.listarPorMunicipio(municipioId);
            Map<ObjectId, String> nomesEquipes = ordemService.buscarNomesEquipes(
                    ordens, municipioId);

            List<Map<String, Object>> resposta = new ArrayList<>();

            for (OrdemDeServico ordem : ordens){
                Map<String, Object> item = paraResposta(ordem);
                item.put("equipeNome", nomesEquipes.get(ordem.getEquipeId()));
                resposta.add(item);
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

            Intervencao conclusao = ordemService.buscarIntervencaoConclusao(ordem).orElse(null);
            ctx.status(200).json(Map.of("ordem", paraRespostaComConclusao(ordem, conclusao)));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();

            ctx.status(500).json(Map.of("erro", "Erro interno ao consultar a ordem de serviço."));
        }
    }

    // Valida a estrutura da requisição; o conteúdo do motivo é validado pelo Socket.
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

            CancelamentoOrdemDeServicoDTO dados = lerDadosDeCancelamento(ctx.body());
            OrdemDeServico ordem = ordemService.cancelar(new ObjectId(id), municipioId, dados);

            ctx.status(200).json(Map.of("ordem", paraResposta(ordem)));

        } catch (JsonParseException erro){
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));

        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalArgumentException erro){
            ctx.status(400).json(Map.of("erro", erro.getMessage()));

        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));

        } catch (IllegalStateException erro){
            ctx.status(409).json(Map.of("erro", erro.getMessage()));

        } catch (ValidacaoOrdemDeServicoIndisponivelException erro){
            ctx.status(503).json(Map.of("erro", erro.getMessage()));

        } catch (Exception erro){
            erro.printStackTrace();

            ctx.status(500).json(Map.of("erro", "Erro interno ao cancelar a ordem de serviço."));
        }
    }

    // Lista equipes do município independentemente de quem as cadastrou.
    public void listarEquipes(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(sessao.getAttribute("usuarioId").toString());
            String id = ctx.pathParam("id");
            if (!ObjectId.isValid(id)) throw new IllegalArgumentException("O identificador da OS é inválido.");
            List<Map<String, Object>> equipes = new ArrayList<>();
            for (EquipeParaOrdemDeServico equipe : ordemService.listarEquipesParaOrdem(new ObjectId(id), municipioId)){
                Map<String, Object> item = new HashMap<>();
                item.put("id", converterId(equipe.id()));
                item.put("nome", equipe.nome());
                item.put("regiaoAtuacao", equipe.regiaoAtuacao());
                item.put("disponivel", equipe.disponivel());
                item.put("atual", equipe.atual());
                equipes.add(item);
            }
            ctx.status(200).json(Map.of("equipes", equipes));
        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro){
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Não foi possível consultar as equipes para esta OS."));
        }
    }

    public void atribuirEquipe(Context ctx){
        HttpSession sessao = obterSessaoDeFuncionario(ctx);
        if (sessao == null) return;
        try {
            ObjectId municipioId = ordemService.obterMunicipioDoFuncionario(sessao.getAttribute("usuarioId").toString());
            String id = ctx.pathParam("id");
            if (!ObjectId.isValid(id)) throw new IllegalArgumentException("O identificador da OS é inválido.");
            JsonElement raiz = JsonParser.parseString(ctx.body());
            if (raiz == null || !raiz.isJsonObject())
                throw new IllegalArgumentException("Informe um objeto JSON com a equipe selecionada.");
            JsonElement equipeId = raiz.getAsJsonObject().get("equipeId");
            if (equipeId == null || !equipeId.isJsonPrimitive() || !equipeId.getAsJsonPrimitive().isString())
                throw new IllegalArgumentException("Informe o identificador da equipe como texto.");
            AtribuicaoEquipeOrdemDeServicoDTO dados = gson.fromJson(raiz, AtribuicaoEquipeOrdemDeServicoDTO.class);
            OrdemDeServico ordem = ordemService.atribuirEquipe(new ObjectId(id), municipioId, dados);
            ctx.status(200).json(Map.of("ordem", paraRespostaComConclusao(ordem, null)));
        } catch (JsonParseException erro){
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));
        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalArgumentException erro){
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalStateException erro){
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (ValidacaoOrdemDeServicoIndisponivelException erro){
            ctx.status(503).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Não foi possível confirmar a atribuição. Consulte a OS antes de tentar novamente."));
        }
    }

    // Conclui a OS e registra a intervenção na mesma transação.
    public void concluir(Context ctx){
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

            ConclusaoOrdemDeServicoDTO dados = lerDadosDeConclusao(ctx.body());
            ConclusaoOrdemDeServico resultado = ordemService.concluir(
                    new ObjectId(id), municipioId, new ObjectId(usuarioId), dados);
            ctx.status(200).json(Map.of("ordem", paraRespostaComConclusao(
                    resultado.ordem(), resultado.intervencao())));

        } catch (JsonParseException erro){
            ctx.status(400).json(Map.of("erro", "Formato JSON inválido."));
        } catch (IllegalArgumentException erro){
            ctx.status(400).json(Map.of("erro", erro.getMessage()));
        } catch (SecurityException erro){
            ctx.status(403).json(Map.of("erro", erro.getMessage()));
        } catch (NoSuchElementException erro){
            ctx.status(404).json(Map.of("erro", erro.getMessage()));
        } catch (IllegalStateException erro){
            ctx.status(409).json(Map.of("erro", erro.getMessage()));
        } catch (ValidacaoOrdemDeServicoIndisponivelException erro){
            ctx.status(503).json(Map.of("erro", erro.getMessage()));
        } catch (Exception erro){
            erro.printStackTrace();
            ctx.status(500).json(Map.of("erro", "Não foi possível confirmar a conclusão. Consulte a OS antes de tentar novamente."));
        }
    }

    // Não permite que o Gson converta números, objetos ou listas em uma justificativa.
    // Motivo ausente, nulo ou vazio segue para a regra obrigatória no servidor Socket.
    static CancelamentoOrdemDeServicoDTO lerDadosDeCancelamento(String corpo){
        JsonElement raiz = JsonParser.parseString(corpo);
        if (raiz == null || !raiz.isJsonObject()){
            throw new IllegalArgumentException("Informe um objeto JSON com os dados do cancelamento.");
        }
        JsonObject objeto = raiz.getAsJsonObject();
        JsonElement status = objeto.get("status");
        if (status == null || !status.isJsonPrimitive() || !status.getAsJsonPrimitive().isString()
                || !"Cancelada".equals(status.getAsString())){
            throw new IllegalArgumentException("Informe o status \"Cancelada\" para esta operação.");
        }
        JsonElement motivo = objeto.get("motivoCancelamento");
        if (motivo != null && !motivo.isJsonNull()
                && (!motivo.isJsonPrimitive() || !motivo.getAsJsonPrimitive().isString())){
            throw new IllegalArgumentException("O campo motivoCancelamento deve ser um texto.");
        }
        return new Gson().fromJson(objeto, CancelamentoOrdemDeServicoDTO.class);
    }

    // Rejeita tipos JSON incorretos antes da conversão do Gson para strings.
    private ConclusaoOrdemDeServicoDTO lerDadosDeConclusao(String corpo){
        JsonElement raiz = JsonParser.parseString(corpo);
        if (raiz == null || !raiz.isJsonObject()){
            throw new IllegalArgumentException("Informe um objeto JSON com os dados da conclusão.");
        }
        JsonObject objeto = raiz.getAsJsonObject();
        for (String campo : List.of("tipo", "descricao", "dataExecucao")){
            JsonElement valor = objeto.get(campo);
            if (valor != null && !valor.isJsonNull()
                    && (!valor.isJsonPrimitive() || !valor.getAsJsonPrimitive().isString())){
                throw new IllegalArgumentException("O campo " + campo + " deve ser um texto.");
            }
        }
        JsonElement fotos = objeto.get("fotos");
        if (fotos != null && !fotos.isJsonNull()){
            if (!fotos.isJsonArray()){
                throw new IllegalArgumentException("O campo fotos deve ser uma lista de referências.");
            }
            for (JsonElement foto : fotos.getAsJsonArray()){
                if (!foto.isJsonPrimitive() || !foto.getAsJsonPrimitive().isString()){
                    throw new IllegalArgumentException("Cada referência de foto deve ser um texto.");
                }
            }
        }
        return gson.fromJson(objeto, ConclusaoOrdemDeServicoDTO.class);
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
        resposta.put("intervencaoConclusaoId", converterId(ordem.getIntervencaoConclusaoId()));
        resposta.put("municipioId", converterId(ordem.getMunicipioId()));
        resposta.put("arvoreId", converterId(ordem.getArvoreId()));
        resposta.put("ocorrenciaId", converterId(ordem.getOcorrenciaId()));
        resposta.put("equipeId", converterId(ordem.getEquipeId()));
        resposta.put("titulo", ordem.getTitulo());
        resposta.put("descricao", ordem.getDescricao());
        resposta.put("status", ordem.getStatus());
        resposta.put("prioridade", ordem.getPrioridade());
        resposta.put("observacoes", ordem.getObservacoes());
        resposta.put("motivoCancelamento", ordem.getMotivoCancelamento());
        resposta.put("dataCriacao", converterData(ordem.getDataCriacao()));
        resposta.put("dataAtualizacao", converterData(ordem.getDataAtualizacao()));
        resposta.put("dataConclusao", converterData(ordem.getDataConclusao()));

        return resposta;
    }

    // Usado apenas no detalhe e na conclusão, sem consultas adicionais para cada item da lista.
    private Map<String, Object> paraRespostaComConclusao(OrdemDeServico ordem, Intervencao intervencao){
        Map<String, Object> resposta = paraResposta(ordem);
        resposta.put("intervencaoConclusao", intervencao == null ? null : paraRespostaIntervencao(intervencao));
        return resposta;
    }

    private Map<String, Object> paraRespostaIntervencao(Intervencao intervencao){
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
    private String converterId(ObjectId id) {
        return id == null ? null : id.toHexString();
    }

    // Converte um instante para texto, preservando a ausência de valor.
    private String converterData(Instant data) {
        return data == null ? null : data.toString();
    }

}
