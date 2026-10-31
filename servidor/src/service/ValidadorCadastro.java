
package service;

import java.util.Arrays;
import java.util.List;
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;

public class ValidadorCadastro {

    private static final List<String> MUNICIPIOS = Arrays.asList(
            "campinas",
            "hortolandia",
            "sumare",
            "outro");

    private static final List<String> SETORES = Arrays.asList(
            "Secretaria do Meio Ambiente",
            "Departamento de Arborização Urbana",
            "Departamento de Parques e Jardins",
            "Secretaria de Serviços Públicos",
            "Defesa Civil",
            "Outro");

    private static final List<String> PREFERENCIAS = Arrays.asList(
            "arvores-risco",
            "alertas-meteorologicos",
            "podas-programadas",
            "floracao",
            "frutificacao");

    public static ResultadoValidacaoCadastro validar(
            PedidoDeValidacaoCadastro pedido) {

        List<String> erros = new java.util.ArrayList<>();

        if (pedido == null) {
            erros.add("O pedido de cadastro não foi informado.");
            return new ResultadoValidacaoCadastro(false, erros);
        }

        // VALIDAÇÕES COMUNS

        String tipoConta = pedido.getTipoConta();

        if (tipoConta == null ||
                !(tipoConta.equals("FUNCIONARIO") ||
                        tipoConta.equals("CIDADAO"))) {

            erros.add("Tipo de conta inválido.");
        }

        if (pedido.getNome() == null ||
                pedido.getNome().trim().length() < 3) {

            erros.add("O nome deve possuir pelo menos 3 caracteres.");
        }

        String email = pedido.getEmail();

        if (email == null ||
                !email.matches("^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$")) {

            erros.add("E-mail inválido.");
        }

        String telefone = pedido.getTelefone();

        if (telefone == null ||
                !telefone.replaceAll("\\D", "").matches("\\d{10,11}")) {

            erros.add("Telefone inválido. Informe DDD e número.");
        }

        if (pedido.getMunicipio() == null ||
                !MUNICIPIOS.contains(pedido.getMunicipio())) {

            erros.add("Município inválido.");
        }

        String senha = pedido.getSenha();
        String confirmarSenha = pedido.getConfirmarSenha();

        if (senha == null || senha.length() < 8) {
            erros.add("A senha deve possuir pelo menos 8 caracteres.");
        }

        if (senha == null || confirmarSenha == null ||
                !senha.equals(confirmarSenha)) {

            erros.add("A confirmação da senha não corresponde à senha.");
        }

        // VALIDAÇÕES DE FUNCIONÁRIO

        if ("FUNCIONARIO".equals(tipoConta)) {

            if (pedido.getSetor() == null ||
                    !SETORES.contains(pedido.getSetor())) {

                erros.add("Setor inválido.");
            }

            if ("Outro".equals(pedido.getSetor()) &&
                    (pedido.getOutroSetor() == null ||
                            pedido.getOutroSetor().trim().length() < 2)) {

                erros.add("Informe o nome do outro setor.");
            }

            if (pedido.getCargo() == null ||
                    pedido.getCargo().trim().length() < 2) {

                erros.add("O cargo deve possuir pelo menos 2 caracteres.");
            }

            if (pedido.getReceberNotificacoes() != null ||
                    pedido.getPreferenciasNotificacoes() != null) {

                erros.add("Funcionários não devem enviar dados de notificações.");
            }
        }

        // VALIDAÇÕES DE CIDADÃO

        if ("CIDADAO".equals(tipoConta)) {

            if (pedido.getSetor() != null ||
                    pedido.getOutroSetor() != null ||
                    pedido.getCargo() != null) {

                erros.add("Cidadãos não devem enviar dados profissionais.");
            }

            if (pedido.getReceberNotificacoes() == null) {

                erros.add("Informe se deseja receber notificações.");

            } else if (pedido.getReceberNotificacoes()) {

                List<String> preferencias = pedido.getPreferenciasNotificacoes();

                if (preferencias == null || preferencias.isEmpty()) {

                    erros.add("Selecione pelo menos uma preferência de notificação.");

                } else {

                    for (String preferencia : preferencias) {
                        if (!PREFERENCIAS.contains(preferencia)) {
                            erros.add("Preferência de notificação inválida: "
                                    + preferencia);
                        }
                    }
                }

            } else if (pedido.getPreferenciasNotificacoes() != null &&
                    !pedido.getPreferenciasNotificacoes().isEmpty()) {

                erros.add("Não devem existir preferências quando as notificações estão desativadas.");
            }
        }

        return new ResultadoValidacaoCadastro(erros.isEmpty(), erros);
    }
}
