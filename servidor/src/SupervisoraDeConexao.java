
import java.io.*;
import java.net.*;
import java.util.*;

import protocolo.Comunicado;
import protocolo.Parceiro;
import protocolo.PedidoParaSair;
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;

import service.ValidadorCadastro;

public class SupervisoraDeConexao extends Thread {

    private Parceiro usuario;
    private Socket conexao;
    private ArrayList<Parceiro> usuarios;

    public SupervisoraDeConexao(Socket conexao, ArrayList<Parceiro> usuarios)
            throws Exception {

        if (conexao == null)
            throw new Exception("Conexao ausente");

        if (usuarios == null)
            throw new Exception("Usuarios ausentes");

        this.conexao = conexao;
        this.usuarios = usuarios;
    }

    public void run() {

        ObjectOutputStream transmissor = null;
        ObjectInputStream receptor = null;

        try {
            transmissor = new ObjectOutputStream(
                    this.conexao.getOutputStream());

            receptor = new ObjectInputStream(
                    this.conexao.getInputStream());

            this.usuario = new Parceiro(
                    this.conexao,
                    receptor,
                    transmissor);

            synchronized (this.usuarios) {
                this.usuarios.add(this.usuario);
            }

            for (;;) {

                Comunicado comunicado = this.usuario.envie();

                if (comunicado == null) {
                    break;
                }

                else if (comunicado instanceof PedidoDeValidacaoCadastro) {

                    PedidoDeValidacaoCadastro pedido = (PedidoDeValidacaoCadastro) comunicado;

                    ResultadoValidacaoCadastro resultado = ValidadorCadastro.validar(pedido);

                    this.usuario.receba(resultado);
                }

                else if (comunicado instanceof PedidoParaSair) {
                    break;
                }
            }

        } catch (Exception erro) {
            System.err.println(
                    "Erro na comunicação com o cliente: "
                            + erro.getMessage());

        } finally {

            if (this.usuario != null) {

                synchronized (this.usuarios) {
                    this.usuarios.remove(this.usuario);
                }

                try {
                    this.usuario.adeus();
                } catch (Exception erro) {
                    System.err.println(
                            "Erro ao encerrar conexão: "
                                    + erro.getMessage());
                }

            } else {

                try {
                    if (receptor != null)
                        receptor.close();

                    if (transmissor != null)
                        transmissor.close();

                    this.conexao.close();

                } catch (Exception erro) {
                    System.err.println(
                            "Erro ao fechar conexão: "
                                    + erro.getMessage());
                }
            }
        }
    }
}
