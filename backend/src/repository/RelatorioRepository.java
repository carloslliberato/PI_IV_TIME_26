package repository;

import static com.mongodb.client.model.Filters.eq;
import java.util.ArrayList;
import java.util.List;
import org.bson.Document;
import org.bson.types.ObjectId;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;

public class RelatorioRepository{
    private final MongoCollection<Document> colecao;

    public RelatorioRepository(){
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("ordens_servico");
    }

    // Consulta apenas os campos utilizados no relatório municipal de OS.
    public List<Document> listarDadosDasOrdens(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        List<Document> ordens = new ArrayList<>();
        Document campos = new Document("_id", 0)
                .append("status", 1)
                .append("dataCriacao", 1);

        try (MongoCursor<Document> cursor = colecao.find(eq("municipioId", municipioId))
                .projection(campos)
                .iterator()) {

            while (cursor.hasNext()){
                ordens.add(cursor.next());
            }
        }

        return ordens;
    }
}
