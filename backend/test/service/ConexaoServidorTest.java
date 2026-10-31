package service;

/*Recurso	Para que serve
@Test	Identifica um método como teste.
@BeforeEach	Executa uma preparação antes de cada teste.
@AfterEach	Executa uma limpeza depois de cada teste. */

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;

import static org.junit.jupiter.api.Assertions.*;

import org.jetbrains.annotations.TestOnly;

public class ConexaoServidorTest {

    private ConexaoServidor conexaoServidor;

    @BeforeEach
    public void configurar() {
        conexaoServidor = new ConexaoServidor("localhost", 3000);

        boolean conectado = conexaoServidor.conectar();

        assertTrue(conectado,
                "Não foi possível conectar ao servidor Socket.");
    }

    @AfterEach
    public void finalizar() {
        if (conexaoServidor != null) {
            conexaoServidor.fechar();
        }
    }

    @Test
    public void deveConectarAoServidorSocket() {

        // verifica se o objeto Parceiro foi criado
        assertNotNull(conexaoServidor.getParceiro(),
                "O Parceiro deveria ser criado após a conexão.");

    }

    @Test
    public void deveValidarCadastroDeCidadao() throws Exception {

        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "CIDADAO",
                "Carlos Teste",
                "carlos@email.com",
                "19999999999",
                "campinas",
                "Senha123",
                "Senha123",
                null,
                null,
                null,
                false,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado, "O servidor deveria retornar um resultado.");

        assertTrue(resultado.isValido(), "O cadastro deveria ser considerado válido.");

        assertTrue(resultado.getErros().isEmpty(), "A lista de erros deveria estar vazia.");
    }

    @Test
    public void deveRejeitarCadastroDeCidadaoInvalido() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "ADMIN",
                null,
                "carlosemail.com",
                "1999999",
                "piracicaba",
                "Senha123",
                "Senha124",
                null,
                null,
                null,
                false,
                null);
        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado, "O servidor deveria retornar um resultado.");

        assertFalse(resultado.isValido(), "O cadastro deveria ser considerado inválido.");
    }

    @Test
    public void deveRejeitarCadastroSemNome() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "CIDADAO",
                null,
                "carlos@email.com",
                "19999999999",
                "campinas",
                "Senha123",
                "Senha123",
                null,
                null,
                null,
                false,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarCadastroComEmailInvalido() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "CIDADAO",
                "Carlos Teste",
                "carlosemail.com",
                "19999999999",
                "campinas",
                "Senha123",
                "Senha123",
                null,
                null,
                null,
                false,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarCadastroComTipoDeContaInvalido() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "ADMIN",
                "Carlos Teste",
                "carlos@email.com",
                "19999999999",
                "campinas",
                "Senha123",
                "Senha123",
                null,
                null,
                null,
                false,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveValidarCadastroDeFuncionario() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                "Departamento de Arborização Urbana",
                null,
                "Analista Ambiental",
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertTrue(resultado.isValido());
        assertTrue(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarFuncionarioSemSetor() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                null,
                null,
                "Analista Ambiental",
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarFuncionarioComSetorInvalido() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                "Secretaria de Tecnologia",
                null,
                "Analista Ambiental",
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarFuncionarioSemEspecificarOutroSetor() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                "Outro",
                null,
                "Analista Ambiental",
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarFuncionarioSemCargo() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                "Departamento de Arborização Urbana",
                null,
                null,
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }

    @Test
    public void deveRejeitarFuncionarioComCargoInvalido() throws Exception {
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "FUNCIONARIO",
                "Carlos Teste",
                "carlos.teste@arboriza.com",
                "19999999999",
                "campinas",
                "Arboriza123",
                "Arboriza123",
                "Departamento de Arborização Urbana",
                null,
                "A",
                null,
                null);

        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        assertNotNull(resultado);
        assertFalse(resultado.isValido());
        assertFalse(resultado.getErros().isEmpty());
    }
}