package repository;

import backend.src.model.Arvore;
import backend.src.model.Risco;

import com.mongodb.client.MongoCollection;

import org.bson.Document;

import java.util.ArrayList;

public class ArvoreRepository {

    private MongoCollection<Document> colecao;

    public ArvoreRepository() {
        this.colecao = ConexaoMongo.getDatabase().getCollection("arvores");
    }

    public ArrayList<Arvore> buscarTodas() {

        ArrayList<Arvore> arvores = new ArrayList<>();

        for (Document documento : colecao.find()) {

            int id = documento.getInteger("id");
            String especie = documento.getString("especie");
            double latitude = documento.getDouble("latitude");
            double longitude = documento.getDouble("longitude");
            String riscoTexto = documento.getString("risco");

            Risco risco = Risco.valueOf(riscoTexto);

            Arvore arvore = new Arvore(
                id,
                especie,
                latitude,
                longitude,
                risco
            );

            arvores.add(arvore);
        }

        return arvores;
    }
}