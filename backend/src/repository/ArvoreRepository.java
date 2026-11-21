// Autor: Guilherme Mascarenhas

package repository;

import model.Arvore;
import model.Risco;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.Updates;

import org.bson.BsonType;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.HashSet;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class ArvoreRepository {

    private static final String ID_CONTADOR_CODIGO_GLOBAL = "codigo_arvore_global";
    private static final String CAMPO_MIGRACAO_CODIGO_GLOBAL = "codigoGlobalMigrado";
    private static final Pattern FORMATO_CODIGO_ARVORE = Pattern.compile(
            "^(?:AR-(\\d+)|ARV-[A-Z]+-(\\d+))$",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> contadores;

    public ArvoreRepository() {
        this(ConexaoMongo.getDatabase());
    }

    public ArvoreRepository(MongoDatabase banco) {
        Objects.requireNonNull(banco, "O banco de árvores não pode ser nulo.");
        this.colecao = banco.getCollection("arvores");
        this.contadores = banco.getCollection("contadores_arvores");
        this.colecao.createIndex(
                com.mongodb.client.model.Indexes.ascending("codigoArv"),
                new IndexOptions()
                        .unique(true)
                        .partialFilterExpression(Filters.type("codigoArv", BsonType.STRING)));
        migrarCodigosParaSequenciaGlobal();
    }

    // LISTAR TODAS AS ARVORES

    public ArrayList<Arvore> buscarTodas() {
        return converterLista(colecao.find());
    }

    // FILTRAR ARVORES DIRETAMENTE NO MONGODB

    public ArrayList<Arvore> buscarFiltradas(
            Map<String, String> filtros,
            ObjectId municipioId) {

        List<Bson> condicoes = new ArrayList<>();

        if (municipioId != null) {
            condicoes.add(Filters.eq("municipioId", municipioId));
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
            ObjectId municipioId) {

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

        if (municipioId != null) {
            consulta.append("municipioId", municipioId);
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

    public Optional<Arvore> buscarPorId(ObjectId id) {

        Document documento = colecao
                .find(Filters.eq("_id", id))
                .first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(
                converterParaArvore(documento));
    }

    // Busca pelo código curto e ignorando diferenças entre maiúsculas e minúsculas.
    public Optional<Arvore> buscarPorCodARV(String codigoArv) {
        if (codigoArv == null || codigoArv.isBlank()) {
            return Optional.empty();
        }
        Pattern codigoExato = Pattern.compile(
                "^" + Pattern.quote(codigoArv.trim()) + "$",
                Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        Document documento = colecao.find(Filters.regex("codigoArv", codigoExato)).first();
        return documento == null
                ? Optional.empty()
                : Optional.of(converterParaArvore(documento));
    }

    // CADASTRAR ARVORE

    public void salvar(Arvore arvore) {

        if (arvore.getId() == null) {
            arvore.setId(new ObjectId());
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

    // Gera códigos únicos globalmente, sem incorporar o município ao código.
    public String gerarCodigoArv() {
        Document contador = contadores.findOneAndUpdate(
                Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL),
                Updates.inc("sequencia", 1L),
                new FindOneAndUpdateOptions()
                        .upsert(true)
                        .returnDocument(ReturnDocument.AFTER));
        if (contador == null) {
            throw new IllegalStateException("Não foi possível gerar o código global da árvore.");
        }
        long sequencia = ((Number) contador.get("sequencia")).longValue();
        return String.format(Locale.ROOT, "AR-%05d", sequencia);
    }

    private void migrarCodigosParaSequenciaGlobal() {
        Document contador = contadores.find(Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL)).first();
        if (contador != null && Boolean.TRUE.equals(contador.get(CAMPO_MIGRACAO_CODIGO_GLOBAL))) {
            return;
        }

        List<Document> documentos = colecao.find()
                .projection(new Document("_id", 1)
                        .append("codigoArv", 1)
                        .append("codigoArvMigracaoOrigem", 1))
                .sort(com.mongodb.client.model.Sorts.ascending("_id"))
                .into(new ArrayList<>());

        Map<ObjectId, String> codigosOriginais = new java.util.LinkedHashMap<>();
        Map<ObjectId, String> codigosAtuais = new java.util.LinkedHashMap<>();
        for (Document documento : documentos) {
            Object atual = documento.get("codigoArv");
            String codigoAtual = atual instanceof String texto ? texto : null;
            Object origem = documento.containsKey("codigoArvMigracaoOrigem")
                    ? documento.get("codigoArvMigracaoOrigem")
                    : atual;
            String codigoOriginal = origem instanceof String texto ? texto : null;
            ObjectId id = documento.getObjectId("_id");
            codigosAtuais.put(id, codigoAtual);
            codigosOriginais.put(id, codigoOriginal);
        }

        Map<ObjectId, String> codigosNovos = calcularCodigosGlobais(codigosOriginais);
        long maiorSequenciaAtribuida = 0;
        for (String codigo : codigosNovos.values()) {
            maiorSequenciaAtribuida = Math.max(
                    maiorSequenciaAtribuida,
                    extrairSequenciaCodigo(codigo));
        }

        for (Map.Entry<ObjectId, String> entrada : codigosNovos.entrySet()) {
            String codigoAtual = codigosAtuais.get(entrada.getKey());
            if (!Objects.equals(codigoAtual, entrada.getValue())) {
                String temporario = "MIGRANDO-AR-" + entrada.getKey().toHexString();
                colecao.updateOne(
                        Filters.eq("_id", entrada.getKey()),
                        Updates.combine(
                                Updates.set("codigoArv", temporario),
                                Updates.set("codigoArvMigracaoOrigem", codigosOriginais.get(entrada.getKey()))));
            }
        }

        for (Map.Entry<ObjectId, String> entrada : codigosNovos.entrySet()) {
            colecao.updateOne(
                    Filters.eq("_id", entrada.getKey()),
                    Updates.combine(
                            Updates.set("codigoArv", entrada.getValue()),
                            Updates.unset("codigoArvMigracaoOrigem")));
        }

        contadores.updateOne(
                Filters.eq("_id", ID_CONTADOR_CODIGO_GLOBAL),
                Updates.combine(
                        Updates.set("sequencia", maiorSequenciaAtribuida),
                        Updates.set(CAMPO_MIGRACAO_CODIGO_GLOBAL, true)),
                new UpdateOptions().upsert(true));
    }

    static Map<ObjectId, String> calcularCodigosGlobais(Map<ObjectId, String> codigosOriginais) {
        long maiorSequenciaExistente = 0;
        for (String codigo : codigosOriginais.values()) {
            maiorSequenciaExistente = Math.max(
                    maiorSequenciaExistente,
                    extrairSequenciaCodigo(codigo));
        }

        Set<Long> sequenciasUsadas = new HashSet<>();
        Map<ObjectId, String> codigosNovos = new java.util.LinkedHashMap<>();
        long proximaSequencia = maiorSequenciaExistente;
        for (Map.Entry<ObjectId, String> entrada : codigosOriginais.entrySet()) {
            long sequencia = extrairSequenciaCodigo(entrada.getValue());
            if (sequencia <= 0 || !sequenciasUsadas.add(sequencia)) {
                do {
                    if (proximaSequencia == Long.MAX_VALUE) {
                        throw new IllegalStateException("A sequência global de códigos de árvores foi esgotada.");
                    }
                    sequencia = ++proximaSequencia;
                } while (!sequenciasUsadas.add(sequencia));
            }
            codigosNovos.put(entrada.getKey(), String.format(Locale.ROOT, "AR-%05d", sequencia));
        }
        return codigosNovos;
    }

    private static long extrairSequenciaCodigo(String codigo) {
        if (codigo == null) return 0;
        Matcher matcher = FORMATO_CODIGO_ARVORE.matcher(codigo);
        if (!matcher.matches()) return 0;
        try {
            return Long.parseLong(matcher.group(1) != null ? matcher.group(1) : matcher.group(2));
        } catch (NumberFormatException erro) {
            return 0;
        }
    }

    // ATUALIZAR DADOS DE UMA ARVORE

    public boolean atualizar(
            ObjectId id,
            Arvore arvore) {

        Document documento =
                converterParaDocumento(arvore);

        // O ID nao pode ser alterado
        documento.remove("_id");

        // Preserva fotos, historico e documentos
        Document atualizacao = new Document(
                "$set", documento);

        long quantidade = colecao.updateOne(
                Filters.eq("_id", id),
                atualizacao
        ).getMatchedCount();

        return quantidade > 0;
    }

    // ATIVAR OU ARQUIVAR UMA ARVORE

    public boolean alterarStatus(
            ObjectId id,
            boolean ativa) {

        Document atualizacao = new Document(
                "$set",
                new Document("ativa", ativa));

        long quantidade = colecao.updateOne(
                Filters.eq("_id", id),
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

                .append("codigoArv", arvore.getCodigoArv())

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
        if (id instanceof ObjectId objectId) {
            arvore.setId(objectId);
        }

        arvore.setCodigoArv(documento.getString("codigoArv"));

        arvore.setNomePopular(
                documento.getString("nomePopular"));

        arvore.setNomeCientifico(
                documento.getString("nomeCientifico"));

        arvore.setEspecie(
                documento.getString("especie"));

        Object municipioId = documento.get("municipioId");
        if (municipioId instanceof ObjectId objectId) {
            arvore.setMunicipioId(objectId);
        } else if (municipioId instanceof String texto && ObjectId.isValid(texto)) {
            arvore.setMunicipioId(new ObjectId(texto));
        }

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
