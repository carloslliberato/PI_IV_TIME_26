// Autor: Guilherme Mascarenhas

package service;

import model.Arvore;
import org.bson.types.ObjectId;
import repository.ArvoreRepository;
import repository.MunicipioRepository;
import protocolo.PedidoDeValidacaoArvore;
import protocolo.ResultadoValidacaoArvore;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.logging.Logger;

public class ArvoreService {
    private static final Logger LOGGER = Logger.getLogger(ArvoreService.class.getName());

    private final ArvoreRepository repository;
    private final MunicipioRepository municipioRepository;
    private final ConexaoServidor conexaoServidor;
    private final Geocodificador geocodificador;

    public ArvoreService(
            ArvoreRepository repository,
            MunicipioRepository municipioRepository,
            ConexaoServidor conexaoServidor) {
        this(repository, municipioRepository, conexaoServidor, new NominatimGeocodificador());
    }

    public ArvoreService(
            ArvoreRepository repository,
            MunicipioRepository municipioRepository,
            ConexaoServidor conexaoServidor,
            Geocodificador geocodificador) {

        this.repository = repository;
        this.municipioRepository = municipioRepository;
        this.conexaoServidor = conexaoServidor;
        if (geocodificador == null) {
            throw new IllegalArgumentException("O geocodificador não pode ser nulo.");
        }
        this.geocodificador = geocodificador;
    }

    private void validarNoServidor(Arvore arvore) {

        if (arvore == null) {
            throw new IllegalArgumentException(
                    "Os dados da arvore sao obrigatorios.");
        }

        PedidoDeValidacaoArvore pedido =
                new PedidoDeValidacaoArvore(
                        arvore.getLatitude(),
                        arvore.getLongitude(),
                        arvore.getAlturaMetros(),
                        arvore.getDiametroCm());

        ResultadoValidacaoArvore resultado;

        try {

            resultado = conexaoServidor.validarArvore(pedido);

        } catch (Exception e) {

            throw new IllegalStateException(
                    "Servidor de validacao indisponivel.", e);
        }

        if (!resultado.isValido()) {
            throw new IllegalArgumentException(
                    String.join(" ", resultado.getErros()));
        }
    }

    public List<Arvore> listar() {
        return repository.buscarTodas();
    }

    public List<Arvore> listar(
            Map<String, String> filtros,
            ObjectId municipioId) {

        return repository.buscarFiltradas(filtros, municipioId);
    }

    public List<Arvore> buscarProximas(
            double latitude,
            double longitude,
            double raioKm,
            ObjectId municipioId) {

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

    public Arvore buscarPorId(ObjectId id) {

        validarId(id);

        return repository.buscarPorId(id)
                .orElseThrow(() ->
                        new NoSuchElementException(
                                "Arvore nao encontrada."));
    }

    public Arvore buscarPorCodARV(String codigoArv) {
        if (codigoArv == null || codigoArv.isBlank()) {
            throw new IllegalArgumentException("O código da árvore é obrigatório.");
        }
        return repository.buscarPorCodARV(codigoArv.trim())
                .orElseThrow(() -> new NoSuchElementException("Árvore não encontrada para esse código."));
    }

    public Arvore cadastrar(Arvore arvore) {
        limparCoordenadasRecebidas(arvore);
        validarDados(arvore);

        String nomeMunicipio = municipioRepository.buscarNomePorId(arvore.getMunicipioId())
                .orElseThrow(() -> new IllegalArgumentException("Municipio nao encontrado."));
        geocodificarEndereco(arvore, nomeMunicipio);
        validarDados(arvore);
        validarNoServidor(arvore);

        // O identificador é sempre gerado como ObjectId pelo backend.
        arvore.setId(null);
        arvore.setCodigoArv(repository.gerarCodigoArv(arvore.getMunicipioId(), nomeMunicipio));
        arvore.setAtiva(true);

        repository.salvar(arvore);

        return arvore;
    }

    public Arvore atualizar(
            ObjectId id,
            Arvore novosDados) {

        validarId(id);
        Arvore arvoreAtual = buscarPorId(id);
        limparCoordenadasRecebidas(novosDados);
        validarDados(novosDados);
        String nomeMunicipio = municipioRepository.buscarNomePorId(novosDados.getMunicipioId())
                .orElseThrow(() -> new IllegalArgumentException("Municipio nao encontrado."));
        geocodificarEndereco(novosDados, nomeMunicipio);
        validarDados(novosDados);
        validarNoServidor(novosDados);

        novosDados.setId(arvoreAtual.getId());
        novosDados.setCodigoArv(arvoreAtual.getCodigoArv());

        novosDados.setAtiva(
                arvoreAtual.isAtiva());

        boolean atualizou = repository.atualizar(
                id,
                novosDados);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        return novosDados;
    }

    private void limparCoordenadasRecebidas(Arvore arvore) {
        if (arvore == null) {
            throw new IllegalArgumentException("Os dados da arvore sao obrigatorios.");
        }
        arvore.setLatitude(null);
        arvore.setLongitude(null);
    }

    private void geocodificarEndereco(Arvore arvore, String nomeMunicipio) {
        var coordenadas = geocodificador.geocodificar(
                arvore.getEndereco(), null, arvore.getBairro(), nomeMunicipio);
        if (coordenadas.isPresent()) {
            arvore.setLatitude(coordenadas.get().latitude());
            arvore.setLongitude(coordenadas.get().longitude());
        } else {
            arvore.setLatitude(null);
            arvore.setLongitude(null);
            LOGGER.warning("Endereço da árvore não geocodificado; as coordenadas serão omitidas.");
        }
    }

    public Arvore alterarStatus(
            ObjectId id,
            boolean ativa) {

        Arvore arvore = buscarPorId(id);

        boolean atualizou =
                repository.alterarStatus(
                        id,
                        ativa);

        if (!atualizou) {
            throw new NoSuchElementException(
                    "Arvore nao encontrada.");
        }

        arvore.setAtiva(ativa);

        return arvore;
    }

    private void validarId(ObjectId id) {

        if (id == null) {
            throw new IllegalArgumentException(
                    "O ID da arvore e obrigatorio.");
        }
    }

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

        if (arvore.getMunicipioId() == null) {

            throw new IllegalArgumentException(
                    "O municipio e obrigatorio.");
        }

        if (municipioRepository.buscarNomePorId(arvore.getMunicipioId()).isEmpty()) {
            throw new IllegalArgumentException("Municipio nao encontrado.");
        }

        if (arvore.getEndereco() == null || arvore.getEndereco().isBlank()) {
            throw new IllegalArgumentException("O endereço da árvore é obrigatório.");
        }
        if (arvore.getBairro() == null || arvore.getBairro().isBlank()) {
            throw new IllegalArgumentException("O bairro da árvore é obrigatório.");
        }

        if (arvore.getRisco() == null) {
            throw new IllegalArgumentException(
                    "O nivel de risco e obrigatorio.");
        }

        Double latitude = arvore.getLatitude();
        Double longitude = arvore.getLongitude();
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("Informe latitude e longitude juntas.");
        }
        if (latitude != null && (!Double.isFinite(latitude) || latitude < -90 || latitude > 90)) {
            throw new IllegalArgumentException("Latitude invalida.");
        }
        if (longitude != null && (!Double.isFinite(longitude) || longitude < -180 || longitude > 180)) {
            throw new IllegalArgumentException("Longitude invalida.");
        }

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
