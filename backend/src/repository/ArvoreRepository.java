
package repository;

import model.Arvore;
import model.Risco;

import com.mongodb.client.MongoCollection;

import org.bson.Document;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

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

        ArrayList<Arvore> arvores = new ArrayList<>();

        for (Document documento : colecao.find()) {
            Arvore arvore = converterParaArvore(documento);
            arvores.add(arvore);
        }

        return arvores;
    }

    // BUSCAR ARVORE PELO ID

    public Optional<Arvore> buscarPorId(String id) {

        Document documento = colecao
                .find(eq("_id", id))
                .first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(converterParaArvore(documento));
    }

    // CADASTRAR ARVORE

    public void salvar(Arvore arvore) {

        // Gera um identificador caso nenhum seja informado
        if (arvore.getId() == null ||
                arvore.getId().isBlank()) {

            arvore.setId(UUID.randomUUID().toString());
        }

        Document documento = converterParaDocumento(arvore);

        // Inicializa as colecoes de dados associados
        documento.append("fotos", new ArrayList<>());
        documento.append("historico", new ArrayList<>());
        documento.append("documentos", new ArrayList<>());

        colecao.insertOne(documento);
    }

    // ATUALIZAR DADOS DE UMA ARVORE

    public boolean atualizar(String id, Arvore arvore) {

        Document documento = converterParaDocumento(arvore);

        // O identificador nao pode ser alterado
        documento.remove("_id");

        // Atualiza somente os dados cadastrais.
        // Fotos, historico e documentos sao preservados.
        Document atualizacao = new Document(
                "$set", documento
        );

        long quantidade = colecao.updateOne(
                eq("_id", id),
                atualizacao
        ).getMatchedCount();

        return quantidade > 0;
    }

    // ATIVAR OU ARQUIVAR UMA ARVORE

    public boolean alterarStatus(String id, boolean ativa) {

        Document atualizacao = new Document(
                "$set",
                new Document("ativa", ativa)
        );

        long quantidade = colecao.updateOne(
                eq("_id", id),
                atualizacao
        ).getMatchedCount();

        return quantidade > 0;
    }

    // CONVERTER OBJETO JAVA PARA DOCUMENTO MONGODB

    private Document converterParaDocumento(Arvore arvore) {

        // GeoJSON utiliza longitude primeiro, latitude depois
        Document localizacao = new Document("type", "Point")
                .append(
                        "coordinates",
                        Arrays.asList(
                                arvore.getLongitude(),
                                arvore.getLatitude()
                        )
                );

        // Caracteristicas adicionais
        Document caracteristicas = new Document()
                .append("frutifera", arvore.isFrutifera())
                .append("manutencao", arvore.isManutencao())
                .append("floracao", arvore.isFloracao())
                .append("alertaClimatico",
                        arvore.isAlertaClimatico());

        return new Document("_id", arvore.getId())
                .append("nomePopular", arvore.getNomePopular())
                .append("nomeCientifico",
                        arvore.getNomeCientifico())
                .append("especie", arvore.getEspecie())
                .append("municipioId", arvore.getMunicipioId())
                .append("endereco", arvore.getEndereco())
                .append("bairro", arvore.getBairro())
                .append("idade", arvore.getIdade())
                .append("alturaMetros", arvore.getAlturaMetros())
                .append("diametroCm", arvore.getDiametroCm())
                .append("estado", arvore.getEstado())
                .append("risco", converterRiscoParaTexto(
                        arvore.getRisco()))
                .append("ativa", arvore.isAtiva())
                .append("caracteristicas", caracteristicas)
                .append("localizacao", localizacao)
                .append("ultimaPoda", arvore.getUltimaPoda())
                .append("ultimaInspecao",
                        arvore.getUltimaInspecao())
                .append("proximaManutencao",
                        arvore.getProximaManutencao());
    }

    // CONVERTER DOCUMENTO MONGODB PARA OBJETO JAVA

    private Arvore converterParaArvore(Document documento) {

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
                converterNumero(documento.get("alturaMetros")));
        arvore.setDiametroCm(
                converterNumero(documento.get("diametroCm")));

        arvore.setRisco(
                converterTextoParaRisco(
                        documento.getString("risco")
                )
        );

        // Registros antigos sem "ativa" sao considerados ativos
        Boolean ativa = documento.getBoolean("ativa");
        arvore.setAtiva(ativa == null || ativa);

        // Caracteristicas
        Document caracteristicas =
                documento.get("caracteristicas", Document.class);

        if (caracteristicas != null) {

            arvore.setFrutifera(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean("frutifera")));

            arvore.setManutencao(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean("manutencao")));

            arvore.setFloracao(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean("floracao")));

            arvore.setAlertaClimatico(
                    Boolean.TRUE.equals(
                            caracteristicas.getBoolean("alertaClimatico")));
        }

        // Localizacao GeoJSON
        Document localizacao =
                documento.get("localizacao", Document.class);

        if (localizacao != null) {

            Object coordenadas = localizacao.get("coordinates");

            if (coordenadas instanceof List<?>) {

                List<?> lista = (List<?>) coordenadas;

                if (lista.size() >= 2) {

                    arvore.setLongitude(
                            converterNumero(lista.get(0)));

                    arvore.setLatitude(
                            converterNumero(lista.get(1)));
                }
            }
        }

        // Datas das manutencoes
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

    // CONVERTER O ENUM PARA O FORMATO DO BANCO

    private String converterRiscoParaTexto(Risco risco) {

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

    // CONVERTER O RISCO DO BANCO PARA ENUM

    private Risco converterTextoParaRisco(String texto) {

        if (texto == null || texto.isBlank()) {
            return null;
        }

        String normalizado = Normalizer
                .normalize(texto, Normalizer.Form.NFD)
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
