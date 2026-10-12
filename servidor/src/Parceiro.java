import java.io.*;
import java.net.*;
// import java.util.*;
import java.util.concurrent.Semaphore;

public class Parceiro {
    private Socket conexao;
    private ObjectInputStream receptor;
    private ObjectOutputStream transmissor;

    private Comunicado proximoComunicado = null;

    private Semaphore mutEx = new Semaphore(1, true);

    public Parceiro(
            Socket conexao,
            ObjectInputStream receptor,
            ObjectOutputStream transmissor)
            throws Exception // se parametro nulos
    {
        if (conexao == null)
            throw new Exception("Conexao ausente");

        if (receptor == null)
            throw new Exception("Receptor ausente");

        if (transmissor == null)
            throw new Exception("Transmissor ausente");

        this.conexao = conexao;
        this.receptor = receptor;
        this.transmissor = transmissor;
    }

    public void receba(Comunicado comunicado) throws Exception {
        // envia um objeto de mensagem ao outro lado da conexão
        try {
            this.transmissor.writeObject(comunicado);
            this.transmissor.flush();
        } catch (IOException erro) {
            throw new Exception("Erro de transmissao");
        }
    }

    public Comunicado espie() throws Exception {
        // permite verificar a próxima mensagem sem consumi-la imediatamente.
        try {
            this.mutEx.acquireUninterruptibly();
            if (this.proximoComunicado == null)
                this.proximoComunicado = (Comunicado) this.receptor.readObject();
            this.mutEx.release();
            return this.proximoComunicado;
        } catch (Exception erro) {
            throw new Exception("Erro de recepcao");
        }
    }

    public Comunicado envie() throws Exception {
        // lê uma mensagem recebida, podendo devolver uma mensagem que já foi lida
        // anteriormente
        try {
            if (this.proximoComunicado == null)
                this.proximoComunicado = (Comunicado) this.receptor.readObject();
            Comunicado ret = this.proximoComunicado;
            this.proximoComunicado = null;
            return ret;
        } catch (Exception erro) {
            throw new Exception("Erro de recepcao");
        }
    }

    public void adeus() throws Exception {
        try {
            this.transmissor.close();
            this.receptor.close();
            this.conexao.close();
        } catch (Exception erro) {
            throw new Exception("Erro de desconexao");
        }
    }
}
