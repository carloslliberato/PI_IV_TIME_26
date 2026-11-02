package service;

import java.util.List;
import java.util.Set;

import org.bson.Document;

import dto.AtualizacaoOcorrenciaDTO;
import dto.CadastroOcorrenciaDTO;
import model.Ocorrencia;
import repository.OcorrenciaRepository;

public class OcorrenciaService {

    private final OcorrenciaRepository repository;

    private static final Set<String> STATUS_VALIDOS = Set.of(
            "Recebida", "Em Análise", "Em Atendimento", "Concluída", "Cancelada"
    );

    private static final Set<String> URGENCIAS_VALIDAS = Set.of(
            "Baixa", "Média", "Alta", "Crítica"
    );

    public OcorrenciaService(OcorrenciaRepository repository) {
        this.repository = repository;
    }

    // POST /api/ocorrencias — Abrir novo chamado
    public Document abrirChamado(CadastroOcorrenciaDTO dto) {
        if (dto == null || dto.tipoProblema == null || dto.tipoProblema.isBlank()) {
            throw new IllegalArgumentException("O tipo do problema é obrigatório.");
        }
        if (dto.localizacao == null || dto.localizacao.isBlank()) {
            throw new IllegalArgumentException("A localização da ocorrência é obrigatória.");
        }

        Ocorrencia nova = new Ocorrencia();
        nova.setTipoProblema(dto.tipoProblema.trim());
        nova.setDescricao(dto.descricao != null ? dto.descricao.trim() : "");
        nova.setLocalizacao(dto.localizacao.trim());
        nova.setLatitude(dto.latitude);
        nova.setLongitude(dto.longitude);

        if (dto.urgencia != null && !dto.urgencia.isBlank()) {
            if (!URGENCIAS_VALIDAS.contains(dto.urgencia)) {
                throw new IllegalArgumentException("Prioridade/Urgência inválida. Use: " + URGENCIAS_VALIDAS);
            }
            nova.setUrgencia(dto.urgencia);
        }

        if (dto.municipioId != null && !dto.municipioId.isBlank()) {
            nova.setMunicipioId(dto.municipioId);
        }

        // Define um ID padrão caso não seja informado (permite testes isolados sem depender da Pessoa 1)
        nova.setCidadaoId((dto.cidadaoId != null && !dto.cidadaoId.isBlank()) ? dto.cidadaoId : "cid_001");
        nova.setArvoreId(dto.arvoreId);

        return repository.criar(nova);
    }

    // GET /api/ocorrencias e GET /api/ocorrencias/minhas — Listar com filtros
    public List<Document> listar(String status, String urgencia, String municipioId, String cidadaoId) {
        return repository.listarComFiltros(status, urgencia, municipioId, cidadaoId);
    }

    // GET /api/ocorrencias/{id} — Consultar por ID
    public Document buscarPorId(String id) {
        return repository.buscarPorId(id);
    }

    // GET /api/ocorrencias/protocolo/{protocolo} — Acompanhar chamado por protocolo
    public Document buscarPorProtocolo(String protocolo) {
        return repository.buscarPorProtocolo(protocolo);
    }

    // Editar campos gerais da ocorrência
    public boolean editarOcorrencia(String id, AtualizacaoOcorrenciaDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Dados de atualização não informados.");
        }

        Document campos = new Document();
        if (dto.tipoProblema != null) campos.append("tipoProblema", dto.tipoProblema);
        if (dto.descricao != null) campos.append("descricao", dto.descricao);
        if (dto.localizacao != null) campos.append("localizacao", dto.localizacao);
        if (dto.urgencia != null) campos.append("urgencia", dto.urgencia);
        if (dto.arvoreId != null) campos.append("arvoreId", dto.arvoreId);
        if (dto.observacaoInterna != null) campos.append("observacaoInterna", dto.observacaoInterna);

        if (campos.isEmpty()) {
            throw new IllegalArgumentException("Nenhum campo informado para atualização.");
        }
        return repository.atualizar(id, campos);
    }

    // PATCH /api/ocorrencias/{id}/status — Atualizar status
    public boolean alterarStatus(String id, String novoStatus, String observacao) {
        if (novoStatus == null || !STATUS_VALIDOS.contains(novoStatus)) {
            throw new IllegalArgumentException("Status inválido. Use: " + STATUS_VALIDOS);
        }
        return repository.atualizarStatus(id, novoStatus, observacao);
    }

    // PATCH /api/ocorrencias/{id}/prioridade — Atualizar prioridade/urgência
    public boolean alterarPrioridade(String id, String novaUrgencia) {
        if (novaUrgencia == null || !URGENCIAS_VALIDAS.contains(novaUrgencia)) {
            throw new IllegalArgumentException("Prioridade/Urgência inválida. Use: " + URGENCIAS_VALIDAS);
        }
        return repository.atualizarPrioridade(id, novaUrgencia);
    }

    // Excluir chamado
    public boolean remover(String id) {
        return repository.deletar(id);
    }

    // Cria 1 ocorrência inicial de teste caso a coleção esteja vazia no MongoDB
    public void popularDadosDeTesteSeVazio() {
        if (repository.listarComFiltros(null, null, null, null).isEmpty()) {
            CadastroOcorrenciaDTO teste = new CadastroOcorrenciaDTO();
            teste.municipioId = "campinas";
            teste.cidadaoId = "cid_001";
            teste.arvoreId = "arv_001";
            teste.tipoProblema = "Galho com Risco de Queda";
            teste.descricao = "Galho grande estalando próximo à rede elétrica após tempestade.";
            teste.localizacao = "Rua Dr. Alberto Sarmento, 123 - Taquaral";
            teste.latitude = -22.8754;
            teste.longitude = -47.0475;
            teste.urgencia = "Alta";
            abrirChamado(teste);
        }
    }
}