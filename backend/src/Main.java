import service.ConexaoServidor;
import java.io.IOException;
import repository.ConexaoMongo;
import service.ServidorHttp;

public class Main {
    public static final String HOST_PADRAO = "localhost";
    public static final int PORTA_PADRAO = 3000;

    public static void main(String[] args) {

        ConexaoServidor conexaoServidor = null;
        try {

            conexaoServidor = new ConexaoServidor(HOST_PADRAO, PORTA_PADRAO);

        } catch (Exception erro) {
            System.err.println("Erro no servidor: porta e host incorretos!\n");
            return;
        }

        boolean conectado = conexaoServidor.conectar();
        if (conectado) {
            System.out.println("Conexão servidor-cliente estabelecida com sucesso!");
        } else {
            System.err.println("Não foi possível iniciar a conexão.");
            return;
        }

        try{
            ConexaoMongo.getDatabase();
        }catch(Exception e){
            System.err.printf("Erro ao conectar o banco de dados: %s%n", e);
            return;
        }

        try{
            ServidorHttp servidorHttp = new ServidorHttp();
            servidorHttp.iniciar();
        }catch(Exception e){
            System.err.printf("Erro ao iniciar servidor http: %s%n", e);
            return;
        }

    }
}
