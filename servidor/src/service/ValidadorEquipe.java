package service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import protocolo.PedidoDeValidacaoEquipe;
import protocolo.ResultadoValidacaoEquipe;

/**
 * Valida os campos de cadastro de equipe recebidos pelo servidor Socket.
 */
public final class ValidadorEquipe {
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private ValidadorEquipe() {
    }

    public static ResultadoValidacaoEquipe validar(PedidoDeValidacaoEquipe pedido) {
        List<String> erros = new ArrayList<>();
        if (pedido == null) {
            erros.add("Os dados da equipe não foram informados.");
            return new ResultadoValidacaoEquipe(false, erros);
        }

        validarTextoObrigatorio(pedido.getNome(), "O nome da equipe", 100, erros);
        validarTextoObrigatorio(
                pedido.getRegiaoAtuacao(), "A região de atuação", 160, erros);
        validarEmailGestor(pedido.getGestor(), erros);

        return new ResultadoValidacaoEquipe(erros.isEmpty(), erros);
    }

    private static void validarTextoObrigatorio(
            String valor, String campo, int limite, List<String> erros) {
        if (valor == null || valor.isBlank()) {
            erros.add(campo + " é obrigatório.");
            return;
        }
        if (valor.strip().length() > limite) {
            erros.add(campo + " deve ter no máximo " + limite + " caracteres.");
        }
    }

    private static void validarEmailGestor(String valor, List<String> erros) {
        if (valor == null) {
            erros.add("Informe um e-mail válido para o gestor da equipe.");
            return;
        }
        String email = valor.strip().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
            erros.add("Informe um e-mail válido para o gestor da equipe.");
        }
    }
}
