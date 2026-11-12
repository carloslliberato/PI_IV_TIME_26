package repository;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Sorts;

import model.Especie;

import org.bson.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.mongodb.client.model.Filters.regex;

public class EspecieRepository {

    private final MongoCollection<Document> colecao;

    public EspecieRepository() {
        this.colecao = ConexaoMongo
                .getDatabase()
                .getCollection("especies");
    }

    // LISTAR ESPECIES

    public List<Especie> buscarTodas() {

        List<Especie> especies = new ArrayList<>();

        for (Document documento :
                colecao.find().sort(Sorts.ascending("nomePopular"))) {

            especies.add(converterParaEspecie(documento));
        }

        return especies;
    }

    // BUSCAR PELO NOME CIENTIFICO

    public Optional<Especie> buscarPorNomeCientifico(
            String nomeCientifico) {

        Pattern padrao = Pattern.compile(
                "^" + Pattern.quote(nomeCientifico.trim()) + "$",
                Pattern.CASE_INSENSITIVE
        );

        Document documento = colecao
                .find(regex("nomeCientifico", padrao))
                .first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(converterParaEspecie(documento));
    }

    // CADASTRAR ESPECIE

    public void salvar(Especie especie) {

        // O ID e gerado pelo sistema
        especie.setId(UUID.randomUUID().toString());

        Document documento = new Document()
                .append("_id", especie.getId())
                .append("nomePopular", especie.getNomePopular())
                .append("nomeCientifico", especie.getNomeCientifico())
                .append("descricao", especie.getDescricao())
                .append("frutifera", especie.isFrutifera())
                .append("periodoFloracao",
                        especie.getPeriodoFloracao());

        colecao.insertOne(documento);
    }

    // CONVERTER DOCUMENTO MONGODB PARA JAVA

    private Especie converterParaEspecie(Document documento) {

        Especie especie = new Especie();

        Object id = documento.get("_id");

        if (id != null) {
            especie.setId(id.toString());
        }

        especie.setNomePopular(
                documento.getString("nomePopular"));

        especie.setNomeCientifico(
                documento.getString("nomeCientifico"));

        especie.setDescricao(
                documento.getString("descricao"));

        especie.setFrutifera(
                Boolean.TRUE.equals(
                        documento.getBoolean("frutifera")));

        especie.setPeriodoFloracao(
                documento.getString("periodoFloracao"));

        return especie;
    }
}
