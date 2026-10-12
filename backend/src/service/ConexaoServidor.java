package backend.src.service;

import java.net.*;
import java.io.*;
import backend.src.protocolo.Parceiro;

public class ConexaoServidor {
    private String host;
    private int porta;
    private Socket conexao;
    private ObjectOutputStream transmissor;
    private ObjectInputStream receptor;
    private Parceiro parceiro;

    public ConexaoServidor(String host, int porta) {
        this.host = host;
        this.porta = porta;
    }

    public boolean conectar() {

        try {
            conexao = new Socket(host, porta);
        } catch (Exception erro) {
            System.err.println("Indique o servidor e a porta corretos!\n");
            fechar();
            return false;
        }

        try {
            transmissor = new ObjectOutputStream(
                    conexao.getOutputStream());
        } catch (Exception erro) {
            System.err.println("Indique o servidor e a porta corretos!\n");
            fechar();
            return false;
        }

        try {
            receptor = new ObjectInputStream(
                    conexao.getInputStream());
        } catch (Exception erro) {
            System.err.println("Indique o servidor e a porta corretos!\n");
            fechar();
            return false;
        }

        try {
            parceiro = new Parceiro(conexao, receptor, transmissor);
        } catch (Exception erro) {
            System.err.println("Erro ao criar o parceiro: " + erro.getMessage());
            fechar();
            return false;
        }

        return true;
    }

    public void fechar() {
        try {
            if (receptor != null) {
                receptor.close();
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar o receptor.");
        }

        try {
            if (transmissor != null) {
                transmissor.close();
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar o transmissor.");
        }

        try {
            if (conexao != null) {
                conexao.close();
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar a conexão.");
        }
    }

    // TratadoraDeComunicadoDeDesligamento tratadoraDeComunicadoDeDesligamento =
    // null;try
    // {
    // tratadoraDeComunicadoDeDesligamento = new
    // TratadoraDeComunicadoDeDesligamento(servidor);
    // }catch(
    // Exception erro)
    // {
    // } // sei que servidor foi instanciado

    // tratadoraDeComunicadoDeDesligamento.start();

    // try
    // {
    // servidor.receba(new PedidoParaSair());
    // }catch(
    // Exception erro)
    // {
    // }

    // System.out.println("Obrigado por usar este programa!");System.exit(0);
}
