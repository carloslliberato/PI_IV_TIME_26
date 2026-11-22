// Autor: Marialvo junior

package service;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.bson.types.ObjectId;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico.CadastroValidado;
import protocolo.ResultadoValidacaoOrdemDeServico.ConclusaoValidada;

/**
 * Contribuição: Marialvo Corrêa de Freitas Junior.
 * Valida e normaliza cadastro, conclusão, atribuição de equipe e cancelamento da OS.
 * Autorização municipal, consulta de referências e persistência ficam no backend.
 */
public final class ValidadorOrdemDeServico {
    private ValidadorOrdemDeServico() {
    }

    public static ResultadoValidacaoOrdemDeServico validar(PedidoDeValidacaoOrdemDeServico pedido) {
        if (pedido == null) {
            return ResultadoValidacaoOrdemDeServico.reprovado(null,
                    "O pedido de validação da OS não foi informado.");
        }
        if (pedido.getOperacao() == null) {
            return ResultadoValidacaoOrdemDeServico.reprovado(pedido,
                    "A operação de validação da OS não foi informada.");
        }
        try {
            return switch (pedido.getOperacao()) {
                case CADASTRO -> ResultadoValidacaoOrdemDeServico.cadastroAprovado(
                        pedido, prepararCadastro(pedido));
                case CONCLUSAO -> ResultadoValidacaoOrdemDeServico.conclusaoAprovada(
                        pedido, prepararConclusao(pedido, pedido.getAgora()));
                case ATRIBUICAO_EQUIPE -> ResultadoValidacaoOrdemDeServico.equipeAprovada(
                        pedido, validarIdEquipe(pedido));
                case CANCELAMENTO -> ResultadoValidacaoOrdemDeServico.cancelamentoAprovado(
                        pedido, validarCancelamento(pedido));
            };
        } catch (IllegalArgumentException erro) {
            return ResultadoValidacaoOrdemDeServico.reprovado(pedido, erro.getMessage());
        }
    }

    // Mantém as regras e a ordem das validações do cadastro existente.
    private static CadastroValidado prepararCadastro(PedidoDeValidacaoOrdemDeServico dados) {
        if (!dados.isDadosPresentes()) throw new IllegalArgumentException("Informe os dados da nova ordem de serviço.");
        String titulo = textoDeCadastro(dados.getTitulo(), "O título", 160, true);
        String descricao = textoDeCadastro(dados.getDescricao(), "A descrição", 4000, true);
        String ocorrenciaId = textoDeCadastro(dados.getOcorrenciaId(), "O identificador da ocorrência", 24, false);
        if (ocorrenciaId != null && !ObjectId.isValid(ocorrenciaId))
            throw new IllegalArgumentException("O identificador da ocorrência é inválido.");
        String arvoreId = textoDeCadastro(dados.getArvoreId(), "O identificador da árvore", 24, false);
        if (arvoreId != null && !ObjectId.isValid(arvoreId))
            throw new IllegalArgumentException("O identificador da árvore é inválido.");
        String endereco = textoDeCadastro(dados.getEndereco(), "O endereço local", 300, false);
        String bairro = textoDeCadastro(dados.getBairro(), "O bairro", 120, false);
        if (ocorrenciaId == null && arvoreId == null
                && (endereco == null || bairro == null)) {
            throw new IllegalArgumentException(
                    "Informe o endereço local e o bairro para criar uma OS sem ocorrência.");
        }
        if (dados.getEquipeId() != null && !dados.getEquipeId().isBlank())
            throw new IllegalArgumentException("Crie a OS sem equipe e use a opção Atribuir equipe após o cadastro.");
        return new CadastroValidado(arvoreId == null ? null : new ObjectId(arvoreId).toHexString(),
                ocorrenciaId == null ? null : new ObjectId(ocorrenciaId).toHexString(),
                titulo, descricao, textoDeCadastro(dados.getPrioridade(), "A prioridade", 40, false),
                textoDeCadastro(dados.getObservacoes(), "As observações", 4000, false),
                endereco, bairro);
    }

    private static String textoDeCadastro(String valor, String nome, int limite, boolean obrigatorio) {
        if (valor == null || valor.isBlank()) {
            if (obrigatorio) throw new IllegalArgumentException(nome + " deve ser informado.");
            return null;
        }
        String texto = valor.strip();
        if (texto.length() > limite) throw new IllegalArgumentException(nome + " deve ter no máximo " + limite + " caracteres.");
        return texto;
    }

    // Usa o mesmo instante enviado pelo backend, inclusive quando a data foi omitida.
    private static ConclusaoValidada prepararConclusao(PedidoDeValidacaoOrdemDeServico dados, Instant agora) {
        if (!dados.isDadosPresentes()) {
            throw new IllegalArgumentException("Informe os dados da conclusão da OS.");
        }
        if (agora == null) {
            throw new IllegalArgumentException("O horário de referência da conclusão não foi informado.");
        }

        String tipo = validarTextoDeConclusao(dados.getTipo(), "O tipo de serviço", 80);
        String descricao = validarTextoDeConclusao(dados.getDescricao(), "A descrição do serviço executado", 4000);
        Instant dataExecucao = agora;

        if (dados.getDataExecucao() != null) {
            try {
                OffsetDateTime data = OffsetDateTime.parse(dados.getDataExecucao().strip());
                if (data.getYear() < 1 || data.getYear() > 9999) {
                    throw new IllegalArgumentException("O ano da execução deve estar entre 1 e 9999.");
                }
                dataExecucao = data.toInstant();
            } catch (DateTimeParseException erro) {
                throw new IllegalArgumentException("Informe a data de execução em formato ISO com fuso, por exemplo 2026-11-20T12:00:00-03:00.");
            }
        }

        int anoUtc = dataExecucao.atOffset(ZoneOffset.UTC).getYear();
        if (anoUtc < 1 || anoUtc > 9999) {
            throw new IllegalArgumentException("O ano da execução deve estar entre 1 e 9999.");
        }
        if (dataExecucao.isAfter(agora)) {
            throw new IllegalArgumentException("A data de execução não pode estar no futuro.");
        }

        List<String> referencias = dados.getFotos() == null ? List.of() : dados.getFotos();
        if (referencias.size() > 10) {
            throw new IllegalArgumentException("Informe no máximo 10 referências de fotos.");
        }

        List<String> fotos = new ArrayList<>();
        long tamanhoFotos = 0;
        for (String referencia : referencias) {
            if (referencia == null || referencia.isBlank()) {
                throw new IllegalArgumentException("As referências de fotos não podem estar vazias.");
            }
            String foto = referencia.strip();
            if (foto.startsWith("data:image/")) {
                tamanhoFotos += validarFotoAnexada(foto);
                if (tamanhoFotos > 7L * 1024 * 1024) {
                    throw new IllegalArgumentException("O tamanho total das fotos excede 7 MB.");
                }
                fotos.add(foto);
                continue;
            }
            if (foto.length() > 2048) {
                throw new IllegalArgumentException("Cada referência de foto deve ter no máximo 2048 caracteres.");
            }
            try {
                URI uri = new URI(foto);
                boolean protocoloValido = "http".equalsIgnoreCase(uri.getScheme())
                        || "https".equalsIgnoreCase(uri.getScheme());
                if (!uri.isAbsolute() || !protocoloValido || uri.getHost() == null
                        || uri.getRawUserInfo() != null) {
                    throw new IllegalArgumentException("Use referências de fotos HTTP ou HTTPS completas, com domínio e sem credenciais.");
                }
            } catch (URISyntaxException erro) {
                throw new IllegalArgumentException("Uma das referências de fotos não é uma URL válida.");
            }
            fotos.add(foto);
        }

        return new ConclusaoValidada(tipo, descricao, dataExecucao, fotos);
    }

    private static int validarFotoAnexada(String foto) {
        if (foto.length() > 2_800_000) throw new IllegalArgumentException("Cada foto deve ter no máximo 2 MB.");
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")
                .matcher(foto);
        if (!matcher.matches()) throw new IllegalArgumentException("Anexe fotos JPG, PNG ou WebP válidas.");
        byte[] dados;
        try {
            dados = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException erro) {
            throw new IllegalArgumentException("Uma das fotos anexadas é inválida.");
        }
        if (dados.length == 0 || dados.length > 2 * 1024 * 1024) {
            throw new IllegalArgumentException("Cada foto deve ter no máximo 2 MB.");
        }
        boolean assinaturaValida = switch (matcher.group(1)) {
            case "jpeg" -> dados.length >= 3 && (dados[0] & 0xff) == 0xff
                    && (dados[1] & 0xff) == 0xd8 && (dados[2] & 0xff) == 0xff;
            case "png" -> dados.length >= 8 && (dados[0] & 0xff) == 0x89 && dados[1] == 0x50
                    && dados[2] == 0x4e && dados[3] == 0x47 && dados[4] == 0x0d
                    && dados[5] == 0x0a && dados[6] == 0x1a && dados[7] == 0x0a;
            case "webp" -> dados.length >= 12 && dados[0] == 0x52 && dados[1] == 0x49
                    && dados[2] == 0x46 && dados[3] == 0x46 && dados[8] == 0x57
                    && dados[9] == 0x45 && dados[10] == 0x42 && dados[11] == 0x50;
            default -> false;
        };
        if (!assinaturaValida) throw new IllegalArgumentException("O conteúdo de uma foto não corresponde ao formato informado.");
        return dados.length;
    }

    private static String validarTextoDeConclusao(String valor, String nome, int limite) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(nome + " deve ser informado.");
        }
        String texto = valor.strip();
        if (texto.length() > limite) {
            throw new IllegalArgumentException(nome + " deve ter no máximo " + limite + " caracteres.");
        }
        return texto;
    }

    // Verifica somente o formato; disponibilidade e município são checados na transação.
    private static String validarIdEquipe(PedidoDeValidacaoOrdemDeServico dados) {
        if (!dados.isDadosPresentes() || dados.getEquipeId() == null || dados.getEquipeId().isBlank())
            throw new IllegalArgumentException("Selecione uma equipe para a ordem de serviço.");
        String equipeId = dados.getEquipeId().strip();
        if (!ObjectId.isValid(equipeId))
            throw new IllegalArgumentException("O identificador da equipe é inválido.");
        return new ObjectId(equipeId).toHexString();
    }

    // O motivo fica separado das observações e é devolvido sem espaços externos.
    private static String validarCancelamento(PedidoDeValidacaoOrdemDeServico dados) {
        if (!dados.isDadosPresentes() || dados.getMotivoCancelamento() == null) {
            throw new IllegalArgumentException("O motivo do cancelamento deve ser informado.");
        }
        // Inclui espaços não separáveis e BOM; apenas as bordas são removidas.
        String motivo = dados.getMotivoCancelamento().replaceAll(
                "(?U)^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
        if (motivo.isEmpty()) {
            throw new IllegalArgumentException("O motivo do cancelamento deve ser informado.");
        }
        if (motivo.length() > 1000) {
            throw new IllegalArgumentException("O motivo do cancelamento deve ter no máximo 1000 caracteres.");
        }
        return motivo;
    }
}
