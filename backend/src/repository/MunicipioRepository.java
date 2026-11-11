package repository;

import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import org.bson.Document;
import org.bson.types.ObjectId;

import java.util.Optional;

import static com.mongodb.client.model.Filters.eq;

// import model.Municipio;
public class MunicipioRepository {

    private final MongoCollection<Document> colecao;

    public MunicipioRepository() /*implements Repository<Municipio> */ {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("municipios");
    }

    public Optional<ObjectId> buscarIdPorNome(String nome) {

        Document documento = colecao.find(eq("nome", nome)).first();

        if (documento == null) {
            return Optional.empty();
        }

        return Optional.of(documento.getObjectId("_id"));
    }

    public Optional<String> buscarNomePorId(ObjectId id) {

    Document documento = colecao.find(eq("_id", id)).first();

    if (documento == null) {
        return Optional.empty();
    }

    return Optional.of(documento.getString("nome"));
}
}