package repository;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

public class ConexaoMongo {
    // Coloque aqui a URI do MongoDB Atlas do grupo ou "mongodb://localhost:27017"
    private static final String URI = "mongodb+srv://arboriza:arboriza1234@arboriza.4vbxujb.mongodb.net/";
    private static final String DATABASE_NAME = "arboriza_db";
    
    private static MongoClient mongoClient = null;

    // Retorna o banco de dados "Arboriza" pronto para uso nas funções
    public static MongoDatabase getDatabase() {
        if (mongoClient == null) {
            mongoClient = MongoClients.create(URI);
            System.out.println("Conectado ao MongoDB com sucesso!");
        }
        return mongoClient.getDatabase(DATABASE_NAME);
    }
}