package service;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.bson.types.ObjectId;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico.CadastroValidado;
import protocolo.ResultadoValidacaoOrdemDeServico.ConclusaoValidada;

/**
 * Contribuição: Marialvo Corrêa de Freitas Junior.
 * Valida e normaliza cadastro, conclusão e atribuição de equipe da OS.
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
        String arvoreId = textoDeCadastro(dados.getArvoreId(), "O identificador da árvore", 24, true);
        if (!ObjectId.isValid(arvoreId)) throw new IllegalArgumentException("O identificador da árvore é inválido.");
        String ocorrenciaId = textoDeCadastro(dados.getOcorrenciaId(), "O identificador da ocorrência", 24, false);
        if (ocorrenciaId != null && !ObjectId.isValid(ocorrenciaId))
            throw new IllegalArgumentException("O identificador da ocorrência é inválido.");
        if (dados.getEquipeId() != null && !dados.getEquipeId().isBlank())
            throw new IllegalArgumentException("Crie a OS sem equipe e use a opção Atribuir equipe após o cadastro.");
        return new CadastroValidado(new ObjectId(arvoreId).toHexString(),
                ocorrenciaId == null ? null : new ObjectId(ocorrenciaId).toHexString(),
                titulo, descricao, textoDeCadastro(dados.getPrioridade(), "A prioridade", 40, false),
                textoDeCadastro(dados.getObservacoes(), "As observações", 4000, false));
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
        for (String referencia : referencias) {
            if (referencia == null || referencia.isBlank()) {
                throw new IllegalArgumentException("As referências de fotos não podem estar vazias.");
            }
            String foto = referencia.strip();
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
}
