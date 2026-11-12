package service;

import model.Arvore;
import repository.ArvoreRepository;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

public class ArvoreService {

    private final ArvoreRepository repository;

    public ArvoreService(
            ArvoreRepository repository) {

        this.repository = repository;
    }

    // LISTAR TODAS AS ARVORES

    public List<Arvore> listar() {
        return repository.buscarTodas();
    }

    // LISTAR COM FILTROS OPCIONAIS

    public List<Arvore> listar(
            Map<String, String> filtros) {

        return repository.buscarFiltradas(filtros);
    }

    // BUSCA GEOGRAFICA

    public List<Arvore> buscarProximas(
            double latitude,
            double longitude,
            double raioKm,
            String municipioId) {

        if (!Double.isFinite(latitude) ||
                latitude < -90 ||
                latitude > 90) {

            throw new IllegalArgumentException(
                    "Latitude invalida.");
        }

        if (!Double.isFinite(longitude) ||
                longitude < -180 ||
                longitude > 180) {

            throw new IllegalArgumentException(
                    "Longitude invalida.");
        }

        if (!Double.isFinite(raioKm) ||
                raioKm <= 0 ||
                raioKm > 50) {

            throw new IllegalArgumentException(
                    "O raioKm deve ser maior que 0 e ate 50 km.");
        }

        return repository.buscarProximas(
                latitude,
                longitude,
                raioKm,
                municipioId);
    }

    // BUSCAR ARVORE POR ID

    public Arvore buscarPorId(String id) {

        validarId(id);

        return repository.buscarPorId(id.trim())
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Arvore nao encontrada."));
    }

    // CADASTRAR NOVA ARVORE

    public Arvore cadastrar(Arvore arvore) {

        validarDados(arvore);

        if (arvore.getId() != null &&
                !arvore.getId().isBlank()) {

            if (repository.buscarPorId(
                    arvore.getId()).isPresent()) {

                throw new IllegalArgumentException(
                        "Ja existe uma arvore com esse ID.");
            }
        }

        arvore.setAtiva(true);

        repository.salvar(arvore);

        return arvore;
    }

    // ATUALIZAR ARVORE EXISTENTE

    public Arvore atualizar(
            String id,
            Arvore novosDados) {

        validarId(id);
        validarDados(novosDados);

        Arvore arvoreAtual = buscarPorId(id);

        // Preserva o ID e o status
        novosDados.setId(
                arvoreAtual.getId());

        novosDados.setAtiva(
                arvoreAtual.isAtiva());

        boolean atualizou = repository.atualizar(
                id.trim(),
                novosDados);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        return novosDados;
    }

    // ATIVAR OU ARQUIVAR ARVORE

    public Arvore alterarStatus(
            String id,
            boolean ativa) {

        Arvore arvore = buscarPorId(id);

        boolean atualizou =
                repository.alterarStatus(
                        id.trim(),
                        ativa);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        arvore.setAtiva(ativa);

        return arvore;
    }

    // VALIDAR ID

    private void validarId(String id) {

        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException(
                    "O ID da arvore e obrigatorio.");
        }
    }

    // VALIDAR DADOS CADASTRAIS

    private void validarDados(Arvore arvore) {

        if (arvore == null) {
            throw new IllegalArgumentException(
                    "Os dados da arvore sao obrigatorios.");
        }

        if (arvore.getNomePopular() == null ||
                arvore.getNomePopular().isBlank()) {

            throw new IllegalArgumentException(
                    "O nome popular e obrigatorio.");
        }

        if (arvore.getEspecie() == null ||
                arvore.getEspecie().isBlank()) {

            throw new IllegalArgumentException(
                    "A especie e obrigatoria.");
        }

        if (arvore.getMunicipioId() == null ||
                arvore.getMunicipioId().isBlank()) {

            throw new IllegalArgumentException(
                    "O municipio e obrigatorio.");
        }

        if (arvore.getRisco() == null) {
            throw new IllegalArgumentException(
                    "O nivel de risco e obrigatorio.");
        }

        // COORDENADAS

        Double latitude = arvore.getLatitude();
        Double longitude = arvore.getLongitude();

        if (latitude == null ||
                !Double.isFinite(latitude) ||
                latitude < -90 ||
                latitude > 90) {

            throw new IllegalArgumentException(
                    "Latitude invalida.");
        }

        if (longitude == null ||
                !Double.isFinite(longitude) ||
                longitude < -180 ||
                longitude > 180) {

            throw new IllegalArgumentException(
                    "Longitude invalida.");
        }

        // MEDIDAS

        validarMedida(
                arvore.getAlturaMetros(),
                "Altura");

        validarMedida(
                arvore.getDiametroCm(),
                "Diametro");
    }

    private void validarMedida(
            Double valor,
            String campo) {

        if (valor == null) {
            return;
        }

        if (!Double.isFinite(valor) || valor < 0) {
            throw new IllegalArgumentException(
                    campo +
                    " deve ser um numero valido e nao negativo.");
        }
    }
}
