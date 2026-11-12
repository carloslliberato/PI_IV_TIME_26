package repository;

import model.Arvore;
import model.Risco;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.FindIterable;
import com.mongodb.client.model.Filters;

import org.bson.Document;
import org.bson.conversions.Bson;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.mongodb.client.model.Filters.eq;

public class ArvoreRepository {

    private final MongoCollection<Document> colecao;

    public ArvoreRepository() {
        this.colecao = ConexaoMongo
                .getDatabase()
                .getCollection("arvores");
    }

    // LISTAR TODAS AS ARVORES

    public ArrayList<Arvore> buscarTodas() {
        return converterLista(colecao.find());
    }

    // FILTRAR ARVORES DIRETAMENTE NO MONGODB

    public ArrayList<Arvore> buscarFiltradas(
            Map<String, String> filtros) {

        List<Bson> condicoes = new ArrayList<>();

        String municipioId = filtros.get("municipioId");

        if (municipioId != null) {
            condicoes.add(
                    Filters.eq("municipioId", municipioId));
        }

        adicionarTexto(
                condicoes, "bairro", filtros.get("bairro"));

        adicionarTexto(
                condicoes, "especie", filtros.get("especie"));

        adicionarTexto(
                condicoes, "estado", filtros.get("estado"));

        String risco = filtros.get("risco");

        if (risco != null) {

            switch (normalizarTexto(risco)) {

                case "BAIXO":
                    condicoes.add(
                            Filters.in("risco", "Baixo", "BAIXO"));
                    break;

                case "MEDIO":
                case "MODERADO":
                    condicoes.add(
                            Filters.in(
                                    "risco",
                                    "Médio",
                                    "Medio",
                                    "MODERADO",
                                    "MEDIO"));
                    break;

                case "ALTO":
                    condicoes.add(
                            Filters.in("risco", "Alto", "ALTO"));
                    break;

                case "CRITICO":
                    condicoes.add(
                            Filters.in(
                                    "risco",
                                    "Crítico",
                                    "Critico",
                                    "CRITICO"));
                    break;

                default:
                    throw new IllegalArgumentException(
                            "Filtro de risco invalido.");
            }
        }

        adicionarBooleano(
                condicoes, "ativa", filtros.get("ativa"));

        adicionarBooleano(
                condicoes,
                "caracteristicas.frutifera",
                filtros.get("frutifera"));

        adicionarBooleano(
                condicoes,
                "caracteristicas.floracao",
                filtros.get("floracao"));

        adicionarBooleano(
                condicoes,
                "caracteristicas.manutencao",
                filtros.get("manutencao"));

        Bson consulta = condicoes.isEmpty()
                ? new Document()
                : Filters.and(condicoes);

        return converterLista(colecao.find(consulta));
    }

    // BUSCAR ARVORES ATIVAS PROXIMAS DE UM PONTO

    public ArrayList<Arvore> buscarProximas(
            double latitude,
            double longitude,
            double raioKm,
            String municipioId) {

        // GeoJSON: longitude primeiro, latitude depois
        Document ponto = new Document("type", "Point")
                .append(
                        "coordinates",
                        Arrays.asList(longitude, latitude));

        // O MongoDB recebe a distancia em metros
        Document perto = new Document(
                "$nearSphere",
                new Document("$geometry", ponto)
                        .append(
                                "$maxDistance",
                                raioKm * 1000.0));

        Document consulta = new Document(
                "localizacao", perto)
                .append("ativa", true);

        if (municipioId != null &&
                !municipioId.isBlank()) {

            consulta.append(
                    "municipioId",
                    municipioId.trim());
        }

        // Limita a quantidade retornada
        return converterLista(
                colecao.find(consulta).limit(100));
    }

    // CONVERTER RESULTADOS DO MONGODB PARA LISTA JAVA

    private ArrayList<Arvore> converterLista(
            FindIterable<Document> documentos) {

        ArrayList<Arvore> resultado =
                new ArrayList<>();

        for (Document documento : documentos) {
            resultado.add(
                    converterParaArvore(documento));
        }

        return resultado;
    }

    // ADICIONAR FILTROS DE TEXTO

    private void adicionarTexto(
            List<Bson> condicoes,
            String campo,
            String valor) {

        if (valor != null && !valor.isBlank()) {

            Pattern padrao = Pattern.compile(
                    "^" + Pattern.quote(valor.trim()) + "$",
                    Pattern.CASE_INSENSITIVE |
                            Pattern.UNICODE_CASE);

            condicoes.add(
                    Filters.regex(campo, padrao));
        }
    }

    // ADICIONAR FILTROS BOOLEANOS

    private void adicionarBooleano(
            List<Bson> condicoes,
            String campo,
            String valor) {

        if (valor != null) {

            if (!valor.equalsIgnoreCase("true") &&
                    !valor.equalsIgnoreCase("false")) {

                throw new IllegalArgumentException(
                        "Filtro booleano invalido: " + campo);
            }

            condicoes.add(
                    Filters.eq(
                            campo,
                            Boolean.parseBoolean(valor)));
        }
    }

    // NORMALIZAR TEXTO PARA COMPARACAO

    private String normalizarTexto(String texto) {

        return Normalizer
                .normalize(
                        texto,
                        Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    // BUSCAR ARVORE PELO ID

    public Optional<Arvore> buscarPorId(String id) {

        Document documento = colecao
                .find(eq("_id", id))
                .first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(
                converterParaArvore(documento));
    }

    // CADASTRAR ARVORE

    public void salvar(Arvore arvore) {

        if (arvore.getId() == null ||
                arvore.getId().isBlank()) {

            arvore.setId(
                    UUID.randomUUID().toString());
        }

        Document documento =
                converterParaDocumento(arvore);

        documento.append(
                "fotos",
                new ArrayList<>());

        documento.append(
                "historico",
                new ArrayList<>());

        documento.append(
                "documentos",
                new ArrayList<>());

        colecao.insertOne(documento);
    }

    // ATUALIZAR DADOS DE UMA ARVORE

    public boolean atualizar(
            String id,
            Arvore arvore) {

        Document documento =
                converterParaDocumento(arvore);

        // O ID nao pode ser alterado
        documento.remove("_id");

        // Preserva fotos, historico e documentos
        Document atualizacao = new Document(
                "$set", documento);

        long quantidade = colecao.updateOne(
                eq("_id", id),
                atualizacao
        ).getMatchedCount();

        return quantidade > 0;
    }

    // ATIVAR OU ARQUIVAR UMA ARVORE

    public boolean alterarStatus(
            String id,
            boolean ativa) {

        Document atualizacao = new Document(
                "$set",
                new Document("ativa", ativa));

        long quantidade = colecao.updateOne(
                eq("_id", id),
                atualizacao
        ).getMatchedCount();

        return quantidade > 0;
    }

    // CONVERTER OBJETO JAVA PARA DOCUMENTO MONGODB

    private Document converterParaDocumento(
            Arvore arvore) {

        Document localizacao = new Document(
                "type", "Point")
                .append(
                        "coordinates",
                        Arrays.asList(
                                arvore.getLongitude(),
                                arvore.getLatitude()));

        Document caracteristicas = new Document()
                .append(
                        "frutifera",
                        arvore.isFrutifera())
                .append(
                        "manutencao",
                        arvore.isManutencao())
                .append(
                        "floracao",
                        arvore.isFloracao())
                .append(
                        "alertaClimatico",
                        arvore.isAlertaClimatico());

        return new Document(
                "_id", arvore.getId())

                .append(
                        "nomePopular",
                        arvore.getNomePopular())

                .append(
                        "nomeCientifico",
                        arvore.getNomeCientifico())

                .append(
                        "especie",
                        arvore.getEspecie())

                .append(
                        "municipioId",
                        arvore.getMunicipioId())

                .append(
                        "endereco",
                        arvore.getEndereco())

                .append(
                        "bairro",
                        arvore.getBairro())

                .append(
                        "idade",
                        arvore.getIdade())

                .append(
                        "alturaMetros",
                        arvore.getAlturaMetros())

                .append(
                        "diametroCm",
                        arvore.getDiametroCm())

                .append(
                        "estado",
                        arvore.getEstado())

                .append(
                        "risco",
                        converterRiscoParaTexto(
                                arvore.getRisco()))

                .append(
                        "ativa",
                        arvore.isAtiva())

                .append(
                        "caracteristicas",
                        caracteristicas)

                .append(
                        "localizacao",
                        localizacao)

                .append(
                        "ultimaPoda",
                        arvore.getUltimaPoda())

                .append(
                        "ultimaInspecao",
                        arvore.getUltimaInspecao())

                .append(
                        "proximaManutencao",
                        arvore.getProximaManutencao());
    }

    // CONVERTER DOCUMENTO MONGODB PARA OBJETO JAVA

    private Arvore converterParaArvore(
            Document documento) {

        Arvore arvore = new Arvore();

        Object id = documento.get("_id");

        if (id != null) {
            arvore.setId(id.toString());
        }

        arvore.setNomePopular(
                documento.getString("nomePopular"));

        arvore.setNomeCientifico(
                documento.getString("nomeCientifico"));

        arvore.setEspecie(
                documento.getString("especie"));

        arvore.setMunicipioId(
                documento.getString("municipioId"));

        arvore.setEndereco(
                documento.getString("endereco"));

        arvore.setBairro(
                documento.getString("bairro"));

        arvore.setIdade(
                documento.getString("idade"));

        arvore.setEstado(
                documento.getString("estado"));

        arvore.setAlturaMetros(
                converterNumero(
                        documento.get("alturaMetros")));

        arvore.setDiametroCm(
                converterNumero(
                        documento.get("diametroCm")));

        arvore.setRisco(
                converterTextoParaRisco(
                        documento.getString("risco")));

        Boolean ativa = documento.getBoolean(
                "ativa");

        arvore.setAtiva(
                ativa == null || ativa);

        // CARACTERISTICAS

        Document caracteristicas = documento.get(
                "caracteristicas",
                Document.class);

        if (caracteristicas != null) {

            arvore.setFrutifera(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean(
                                    "frutifera")));

            arvore.setManutencao(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean(
                                    "manutencao")));

            arvore.setFloracao(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean(
                                    "floracao")));

            arvore.setAlertaClimatico(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean(
                                    "alertaClimatico")));
        }

        // LOCALIZACAO GEOJSON

        Document localizacao = documento.get(
                "localizacao",
                Document.class);

        if (localizacao != null) {

            Object coordenadas =
                    localizacao.get("coordinates");

            if (coordenadas instanceof List<?>) {

                List<?> lista =
                        (List<?>) coordenadas;

                if (lista.size() >= 2) {

                    arvore.setLongitude(
                            converterNumero(
                                    lista.get(0)));

                    arvore.setLatitude(
                            converterNumero(
                                    lista.get(1)));
                }
            }
        }

        // DATAS

        arvore.setUltimaPoda(
                documento.getDate("ultimaPoda"));

        arvore.setUltimaInspecao(
                documento.getDate("ultimaInspecao"));

        arvore.setProximaManutencao(
                documento.getDate("proximaManutencao"));

        return arvore;
    }

    // CONVERTER DADOS NUMERICOS

    private Double converterNumero(Object valor) {

        if (valor instanceof Number) {
            return ((Number) valor).doubleValue();
        }

        return null;
    }

    // CONVERTER ENUM PARA TEXTO DO BANCO

    private String converterRiscoParaTexto(
            Risco risco) {

        if (risco == null) {
            return null;
        }

        switch (risco) {

            case BAIXO:
                return "Baixo";

            case MODERADO:
                return "Médio";

            case ALTO:
                return "Alto";

            case CRITICO:
                return "Crítico";

            default:
                throw new IllegalArgumentException(
                        "Nivel de risco invalido.");
        }
    }

    // CONVERTER TEXTO DO BANCO PARA ENUM

    private Risco converterTextoParaRisco(
            String texto) {

        if (texto == null || texto.isBlank()) {
            return null;
        }

        String normalizado = Normalizer
                .normalize(
                        texto,
                        Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toUpperCase(Locale.ROOT);

        switch (normalizado) {

            case "BAIXO":
                return Risco.BAIXO;

            case "MEDIO":
            case "MODERADO":
                return Risco.MODERADO;

            case "ALTO":
                return Risco.ALTO;

            case "CRITICO":
                return Risco.CRITICO;

            default:
                throw new IllegalArgumentException(
                        "Nivel de risco desconhecido: " + texto);
        }
    }
}
