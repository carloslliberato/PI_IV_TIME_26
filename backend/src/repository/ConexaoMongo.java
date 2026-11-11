package repository;

import org.bson.Document;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

public class ConexaoMongo {
    // Coloque aqui a URI do MongoDB Atlas do grupo ou "mongodb://localhost:27017"
    private static final String URI = "mongodb+srv://arboriza:arboriza1234@arboriza.4vbxujb.mongodb.net/";
    private static final String DATABASE_NAME = "arboriza_db";

    private static MongoClient mongoClient = null;

    public static MongoDatabase getDatabase() {
        try {
            if (mongoClient == null) {
                mongoClient = MongoClients.create(URI);
            }

            MongoDatabase database = mongoClient.getDatabase(DATABASE_NAME);

            // Testa se a conexão com o MongoDB realmente funciona.
            database.runCommand(new Document("ping", 1));

            System.out.println("Conectado ao MongoDB com sucesso!");

            return database;

        } catch (Exception erro) {
            fechar();

            throw new RuntimeException(
                "Não foi possível conectar ao MongoDB.",
                erro
            );
        }
    }

    public static void fechar() {
        if (mongoClient != null) {
            try {
                mongoClient.close();
                System.out.println("Conexão com MongoDB encerrada!");
            } finally {
                mongoClient = null;
            }
        }
    }
}
