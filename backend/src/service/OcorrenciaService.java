// Autor: Sophia Fernandes, Gabrielle Mota

package service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.logging.Logger;

import org.bson.Document;
import org.bson.types.ObjectId;

import dto.AtualizacaoOcorrenciaDTO;
import dto.CadastroOcorrenciaDTO;
import model.Ocorrencia;
import repository.MunicipioRepository;
import repository.OcorrenciaRepository;

// Classe com as regras de negócio e validações das ocorrências
public class OcorrenciaService {
    private static final Logger LOGGER = Logger.getLogger(OcorrenciaService.class.getName());

    private final OcorrenciaRepository repository;
    private final MunicipioRepository municipioRepository;
    private final Geocodificador geocodificador;

    // Lista de status e prioridades permitidos no sistema
    private static final Set<String> STATUS_VALIDOS = Set.of(
            "Recebida", "Em andamento", "Cancelada", "Concluída"
    );

    private static final Set<String> URGENCIAS_VALIDAS = Set.of(
            "Baixa", "Média", "Alta", "Crítica"
    );

    public OcorrenciaService(OcorrenciaRepository repository, MunicipioRepository municipioRepository) {
        this(repository, municipioRepository, new NominatimGeocodificador());
    }

    public OcorrenciaService(
            OcorrenciaRepository repository,
            MunicipioRepository municipioRepository,
            Geocodificador geocodificador) {
        this.repository = repository;
        this.municipioRepository = municipioRepository;
        if (geocodificador == null) {
            throw new IllegalArgumentException("O geocodificador não pode ser nulo.");
        }
        this.geocodificador = geocodificador;
    }

    // Valida os campos do formulário e cria um novo chamado
    public Document abrirChamado(CadastroOcorrenciaDTO dto) {
        // Etapa 1: rejeita requisições sem dados.
        if (dto == null) {
            throw new IllegalArgumentException("Os dados da ocorrência não foram enviados.");
        }

        // Etapa 2: compatibiliza os nomes de campos usados pelas versões do front-end.
        String tipo = (dto.tipoProblema != null && !dto.tipoProblema.isBlank()) ? dto.tipoProblema : dto.tipoOcorrencia;
        String local = (dto.localizacao != null && !dto.localizacao.isBlank()) ? dto.localizacao : dto.endereco;

        // Etapa 3: valida os dados obrigatórios antes de consultar o banco.
        if (tipo == null || tipo.isBlank()) {
            throw new IllegalArgumentException("Selecione o tipo de ocorrência.");
        }
        if (local == null || local.isBlank()) {
            throw new IllegalArgumentException("Informe o endereço do local.");
        }
        if (dto.bairro == null || dto.bairro.isBlank()) {
            throw new IllegalArgumentException("Informe o bairro do local.");
        }
        if (dto.descricao == null || dto.descricao.isBlank()) {
            throw new IllegalArgumentException("Informe a descrição do problema.");
        }
        if (dto.municipioId == null || dto.municipioId.isBlank()) {
            throw new IllegalArgumentException("Selecione o município da ocorrência.");
        }

        // Etapa 4: resolve o nome do município para o identificador armazenado na ocorrência.
        String municipioNome = dto.municipioId.trim();
        ObjectId municipioId = municipioRepository.buscarIdPorNome(municipioNome)
                .orElseThrow(() -> new IllegalArgumentException("Município não encontrado."));

        // Etapa 5: monta a ocorrência com os campos já validados e normalizados.
        Ocorrencia nova = new Ocorrencia();
        nova.setTipoProblema(tipo.trim());
        nova.setLocalizacao(local.trim());
        nova.setNumero(dto.numero == null || dto.numero.isBlank() ? null : dto.numero.trim());
        nova.setBairro(dto.bairro.trim());
        nova.setDescricao(dto.descricao.trim());
        nova.setImagem(dto.imagem);

        String prioridade = dto.prioridade != null ? dto.prioridade : dto.urgencia;
        if (prioridade != null && !prioridade.isBlank()) {
            if (!URGENCIAS_VALIDAS.contains(prioridade)) {
                throw new IllegalArgumentException("Prioridade inválida. Use: " + URGENCIAS_VALIDAS);
            }
            nova.setUrgencia(prioridade);
        }
        nova.setMunicipioId(municipioId);
        if (dto.cidadaoId != null && !dto.cidadaoId.isBlank()) {
            nova.setCidadaoId(dto.cidadaoId.trim());
        }
        if (dto.emailCidadao != null && !dto.emailCidadao.isBlank()) {
            nova.setEmailCidadao(dto.emailCidadao.trim().toLowerCase(Locale.ROOT));
        }
        nova.setArvoreId(dto.arvoreId);

        // Etapa 6: tenta localizar a árvore pelo endereço informado no chamado.
        var coordenadas = geocodificador.geocodificar(
                nova.getLocalizacao(), nova.getNumero(), nova.getBairro(), municipioNome);
        if (coordenadas.isPresent()) {
            // Se houver correspondência, guarda o ponto para exibição nos mapas.
            nova.setLatitude(coordenadas.get().latitude());
            nova.setLongitude(coordenadas.get().longitude());
        } else {
            // Sem correspondência, mantém o chamado, mas não inventa coordenadas.
            nova.setLatitude(null);
            nova.setLongitude(null);
            LOGGER.warning("Endereço da ocorrência não geocodificado; as coordenadas serão omitidas.");
        }

        // Etapa 7: persiste a ocorrência e retorna o documento criado.
        return repository.criar(nova);
    }

    // Busca todas as ocorrências aplicando os filtros escolhidos na tela
    public List<Document> listarOcorrencias(String municipioId, String tipo, String status, String prioridade) {
        return repository.listarComFiltros(municipioId, tipo, status, prioridade, null, null);
    }

    // Busca as ocorrências de um cidadão específico
    public List<Document> listarMinhasOcorrencias(String cidadaoId) {
        if (cidadaoId == null || cidadaoId.isBlank()) {
            return List.of();
        }
        return repository.listarPorCidadaoId(cidadaoId);
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

}
