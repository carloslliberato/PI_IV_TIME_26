package service;

import java.net.Socket;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;

import protocolo.Parceiro;

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

            transmissor = new ObjectOutputStream(
                    conexao.getOutputStream());

            receptor = new ObjectInputStream(
                    conexao.getInputStream());

            parceiro = new Parceiro(
                    conexao,
                    receptor,
                    transmissor);

            return true;

        } catch (Exception erro) {
            System.err.println(
                    "Não foi possível conectar ao servidor Socket: "
                            + erro.getMessage());

            fechar();
            return false;
        }
    }

    public void fechar() {

        try {
            if (receptor != null) {
                receptor.close();
                receptor = null;
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar receptor: " + erro.getMessage());
        }

        try {
            if (transmissor != null) {
                transmissor.close();
                transmissor = null;
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar transmissor: " + erro.getMessage());
        }

        boolean conexaoFechada = false;

        try {
            if (conexao != null) {
                conexao.close();
                conexao = null;
                conexaoFechada = true;
            }
        } catch (Exception erro) {
            System.err.println("Erro ao fechar Socket: " + erro.getMessage());
        }

        parceiro = null;

        if (conexaoFechada) {
            System.out.println("Conexão com o servidor Socket encerrada!");
        }
    }
}