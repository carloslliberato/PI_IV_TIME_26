// feito por Sophia
package service;

import java.util.List;
import java.util.Set;

import org.bson.Document;

import dto.AtualizacaoOcorrenciaDTO;
import dto.CadastroOcorrenciaDTO;
import model.Ocorrencia;
import repository.OcorrenciaRepository;

// Classe com as regras de negócio e validações das ocorrências
public class OcorrenciaService {

    private final OcorrenciaRepository repository;

    // Lista de status e prioridades permitidos no sistema
    private static final Set<String> STATUS_VALIDOS = Set.of(
            "Recebida", "Em Análise", "Em Atendimento", "Concluída", "Cancelada"
    );

    private static final Set<String> URGENCIAS_VALIDAS = Set.of(
            "Baixa", "Média", "Alta", "Crítica"
    );

    public OcorrenciaService(OcorrenciaRepository repository) {
        this.repository = repository;
    }

    // Valida os campos do formulário e cria um novo chamado
    public Document abrirChamado(CadastroOcorrenciaDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Os dados da ocorrência não foram enviados.");
        }

        // Aceita tanto tipoProblema quanto tipoOcorrencia vindos do front-end
        String tipo = (dto.tipoProblema != null && !dto.tipoProblema.isBlank()) ? dto.tipoProblema : dto.tipoOcorrencia;
        String local = (dto.localizacao != null && !dto.localizacao.isBlank()) ? dto.localizacao : dto.endereco;

        if (tipo == null || tipo.isBlank()) {
            throw new IllegalArgumentException("Selecione o tipo de ocorrência.");
        }
        if (local == null || local.isBlank()) {
            throw new IllegalArgumentException("Informe o endereço do local.");
        }
        if (dto.descricao == null || dto.descricao.isBlank()) {
            throw new IllegalArgumentException("Informe a descrição do problema.");
        }

        // Se o cidadão marcou que quer receber notificações, valida se preencheu nome, email e telefone
        boolean querNotificacao = Boolean.TRUE.equals(dto.receberNotificacoes);
        if (querNotificacao) {
            if (dto.nomeContato == null || dto.nomeContato.isBlank() ||
                dto.emailContato == null || dto.emailContato.isBlank() ||
                dto.telefoneContato == null || dto.telefoneContato.isBlank()) {
                throw new IllegalArgumentException("Para receber notificações, preencha nome completo, e-mail e telefone.");
            }
        }

        // Monta o objeto Ocorrencia com os dados validados
        Ocorrencia nova = new Ocorrencia();
        nova.setTipoProblema(tipo.trim());
        nova.setLocalizacao(local.trim());
        nova.setBairro((dto.bairro != null && !dto.bairro.isBlank()) ? dto.bairro.trim() : extrairBairro(local));
        nova.setDescricao(dto.descricao.trim());
        nova.setImagem(dto.imagem);
        nova.setReceberNotificacoes(querNotificacao);
        nova.setNomeContato(dto.nomeContato != null ? dto.nomeContato.trim() : null);
        nova.setEmailContato(dto.emailContato != null ? dto.emailContato.trim() : null);
        nova.setTelefoneContato(dto.telefoneContato != null ? dto.telefoneContato.trim() : null);
        nova.setLatitude(dto.latitude);
        nova.setLongitude(dto.longitude);

        if (dto.urgencia != null && !dto.urgencia.isBlank()) {
            nova.setUrgencia(dto.urgencia);
        }
        if (dto.municipioId != null && !dto.municipioId.isBlank()) {
            nova.setMunicipioId(dto.municipioId.toLowerCase());
        }
        if (dto.cidadaoId != null && !dto.cidadaoId.isBlank()) {
            nova.setCidadaoId(dto.cidadaoId);
        }
        nova.setArvoreId(dto.arvoreId);

        // Define coordenadas reais ou gera um ponto válido em Campinas caso o cidadão tenha aberto pelo formulário público
        if (dto.latitude != null && dto.longitude != null) {
            nova.setLatitude(dto.latitude);
            nova.setLongitude(dto.longitude);
        } else {
            double[] coords = obterCoordenadasPorBairro(nova.getBairro());
            nova.setLatitude(coords[0]);
            nova.setLongitude(coords[1]);
        }

        return repository.criar(nova);
    }

    // Busca todas as ocorrências aplicando os filtros escolhidos na tela
    public List<Document> listarOcorrencias(String municipioId, String tipo, String status, String prioridade) {
        return repository.listarComFiltros(municipioId, tipo, status, prioridade, null);
    }

    // Busca as ocorrências de um cidadão específico
    public List<Document> listarMinhasOcorrencias(String cidadaoId) {
        if (cidadaoId == null || cidadaoId.isBlank()) {
            cidadaoId = "cid_001";
        }
        return repository.listarComFiltros(null, null, null, null, cidadaoId);
    }

    public Document buscarPorId(String id) {
        return repository.buscarPorId(id);
    }

    public Document buscarPorProtocolo(String protocolo) {
        return repository.buscarPorProtocolo(protocolo);
    }

    // Valida e altera o status da ocorrência
    public boolean alterarStatus(String id, String novoStatus, String observacao) {
        if (novoStatus == null || !STATUS_VALIDOS.contains(novoStatus)) {
            throw new IllegalArgumentException("Status inválido. Use: " + STATUS_VALIDOS);
        }
        return repository.atualizarStatus(id, novoStatus, observacao);
    }

    // Valida e altera a prioridade da ocorrência
    public boolean alterarPrioridade(String id, String novaPrioridade) {
        if (novaPrioridade == null || !URGENCIAS_VALIDAS.contains(novaPrioridade)) {
            throw new IllegalArgumentException("Prioridade inválida. Use: " + URGENCIAS_VALIDAS);
        }
        return repository.atualizarPrioridade(id, novaPrioridade);
    }

    // Tenta extrair o bairro caso o endereço tenha sido digitado como "Rua X, 123 - Bairro"
    private String extrairBairro(String endereco) {
        if (endereco != null && endereco.contains("-")) {
            String[] partes = endereco.split("-");
            return partes[partes.length - 1].trim();
        }
        return "Centro";
    }

    // Chama o repositório para salvar a preferência de notificação
    public boolean alterarNotificacao(String id, AtualizacaoOcorrenciaDTO dto) {
        boolean receber = dto != null && Boolean.TRUE.equals(dto.receberNotificacoes);
        return repository.atualizarNotificacao(id, receber,
                dto != null ? dto.nomeContato : null,
                dto != null ? dto.emailContato : null,
                dto != null ? dto.telefoneContato : null);
    }

    // Retorna coordenadas aproximadas em Campinas para que ocorrências sem GPS apareçam no mapa
    private double[] obterCoordenadasPorBairro(String bairro) {
        String b = (bairro != null) ? bairro.toLowerCase() : "";
        if (b.contains("taquaral")) return new double[]{-22.8754, -47.0475};
        if (b.contains("cambu")) return new double[]{-22.8942, -47.0531};
        if (b.contains("chapad")) return new double[]{-22.8895, -47.0742};
        if (b.contains("barao") || b.contains("barão")) return new double[]{-22.8228, -47.0805};
        // Padrão: Centro de Campinas (com leve variação para não sobrepor pinos)
        double offset = (Math.random() - 0.5) * 0.006;
        return new double[]{-22.9056 + offset, -47.0608 + offset};
    }
}