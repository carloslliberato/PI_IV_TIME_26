
package service;

import model.Arvore;
import repository.ArvoreRepository;

import java.util.List;
import java.util.NoSuchElementException;

public class ArvoreService {

    private final ArvoreRepository repository;

    // Recebe o Repository pelo construtor
    public ArvoreService(ArvoreRepository repository) {
        this.repository = repository;
    }

    // LISTAR TODAS AS ARVORES

    public List<Arvore> listar() {
        return repository.buscarTodas();
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

        // Impede o cadastro com ID ja existente
        if (arvore.getId() != null &&
                !arvore.getId().isBlank()) {

            if (repository.buscarPorId(arvore.getId())
                    .isPresent()) {

                throw new IllegalArgumentException(
                        "Ja existe uma arvore com esse ID.");
            }
        }

        // Uma nova arvore sempre comeca ativa
        arvore.setAtiva(true);

        repository.salvar(arvore);

        return arvore;
    }

    // ATUALIZAR ARVORE EXISTENTE

    public Arvore atualizar(String id, Arvore novosDados) {

        validarId(id);
        validarDados(novosDados);

        // Verifica se a arvore existe
        Arvore arvoreAtual = buscarPorId(id);

        // Mantem o ID original
        novosDados.setId(arvoreAtual.getId());

        // Mantem o status atual
        novosDados.setAtiva(arvoreAtual.isAtiva());

        boolean atualizou = repository.atualizar(
                id.trim(), novosDados);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        return novosDados;
    }

    // ATIVAR OU ARQUIVAR ARVORE

    public Arvore alterarStatus(String id, boolean ativa) {

        // Verifica se a arvore existe
        Arvore arvore = buscarPorId(id);

        boolean atualizou = repository.alterarStatus(
                id.trim(), ativa);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        arvore.setAtiva(ativa);

        return arvore;
    }

    // VALIDAR IDENTIFICADOR

    private void validarId(String id) {

        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException(
                    "O ID da arvore e obrigatorio.");
        }
    }

    // VALIDACOES DOS DADOS DA ARVORE

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

        // Verificar coordenadas geograficas

        Double latitude = arvore.getLatitude();
        Double longitude = arvore.getLongitude();

        if (latitude == null ||
                !Double.isFinite(latitude) ||
                latitude < -90 || latitude > 90) {

            throw new IllegalArgumentException(
                    "Latitude invalida.");
        }

        if (longitude == null ||
                !Double.isFinite(longitude) ||
                longitude < -180 || longitude > 180) {

            throw new IllegalArgumentException(
                    "Longitude invalida.");
        }

        // Verificar medidas fisicas, quando informadas

        validarMedida(arvore.getAlturaMetros(), "Altura");
        validarMedida(arvore.getDiametroCm(), "Diametro");
    }

    // VALIDAR MEDIDAS NUMERICAS

    private void validarMedida(Double valor, String campo) {

        if (valor == null) {
            return;
        }

        if (!Double.isFinite(valor) || valor < 0) {
            throw new IllegalArgumentException(
                    campo + " deve ser um numero valido e nao negativo.");
        }
    }
}
