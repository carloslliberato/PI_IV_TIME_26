package service;

import java.time.Instant;
import org.bson.types.ObjectId;
import dto.AtribuicaoEquipeOrdemDeServicoDTO;
import dto.CadastroOrdemDeServicoDTO;
import dto.ConclusaoOrdemDeServicoDTO;
import protocolo.PedidoDeValidacaoOrdemDeServico;
import protocolo.PedidoDeValidacaoOrdemDeServico.Operacao;
import protocolo.ResultadoValidacaoOrdemDeServico;
import protocolo.ResultadoValidacaoOrdemDeServico.CadastroValidado;
import protocolo.ResultadoValidacaoOrdemDeServico.ConclusaoValidada;

/** Converte os DTOs HTTP para o protocolo e utiliza os valores aprovados no servidor.
 * @author Marialvo Corrêa de Freitas Junior
 */
public class ValidadorOrdemDeServicoRemoto {
    private final ConexaoServidor conexaoServidor;

    public ValidadorOrdemDeServicoRemoto(ConexaoServidor conexaoServidor) {
        if (conexaoServidor == null) {
            throw new IllegalArgumentException("A conexão com o servidor de validação é obrigatória.");
        }
        this.conexaoServidor = conexaoServidor;
    }

    public CadastroValidado prepararCadastro(CadastroOrdemDeServicoDTO dados) {
        PedidoDeValidacaoOrdemDeServico pedido = dados == null
                ? PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CADASTRO, null)
                : PedidoDeValidacaoOrdemDeServico.cadastro(dados.getArvoreId(), dados.getOcorrenciaId(),
                        dados.getEquipeId(), dados.getTitulo(), dados.getDescricao(),
                        dados.getPrioridade(), dados.getObservacoes());
        CadastroValidado cadastro = enviar(pedido).getCadastro();
        // A conversão confirma o contrato da resposta antes de reservar o código ou gravar.
        try {
            new ObjectId(cadastro.arvoreId());
            if (cadastro.ocorrenciaId() != null) new ObjectId(cadastro.ocorrenciaId());
            if (cadastro.titulo() == null || cadastro.descricao() == null) {
                throw new IllegalArgumentException("Resposta de cadastro incompleta.");
            }
        } catch (RuntimeException erro) {
            throw respostaInvalida(erro);
        }
        return cadastro;
    }

    public ConclusaoValidada prepararConclusao(ConclusaoOrdemDeServicoDTO dados, Instant agora) {
        PedidoDeValidacaoOrdemDeServico pedido = dados == null
                ? PedidoDeValidacaoOrdemDeServico.semDados(Operacao.CONCLUSAO, agora)
                : PedidoDeValidacaoOrdemDeServico.conclusao(dados.getTipo(), dados.getDescricao(),
                        dados.getDataExecucao(), dados.getFotos(), agora);
        ConclusaoValidada conclusao = enviar(pedido).getConclusao();
        if (conclusao.tipo() == null || conclusao.descricao() == null
                || conclusao.dataExecucao() == null || conclusao.fotos() == null) {
            throw respostaInvalida(new IllegalArgumentException("Resposta de conclusão incompleta."));
        }
        return conclusao;
    }

    public ObjectId validarIdEquipe(AtribuicaoEquipeOrdemDeServicoDTO dados) {
        PedidoDeValidacaoOrdemDeServico pedido = dados == null
                ? PedidoDeValidacaoOrdemDeServico.semDados(Operacao.ATRIBUICAO_EQUIPE, null)
                : PedidoDeValidacaoOrdemDeServico.atribuicaoEquipe(dados.getEquipeId());
        String equipeId = enviar(pedido).getEquipeId();
        try {
            return new ObjectId(equipeId);
        } catch (RuntimeException erro) {
            throw respostaInvalida(erro);
        }
    }

    private ResultadoValidacaoOrdemDeServico enviar(PedidoDeValidacaoOrdemDeServico pedido) {
        ResultadoValidacaoOrdemDeServico resultado = conexaoServidor.validarOrdemDeServico(pedido);
        if (!resultado.isValido()) {
            throw new IllegalArgumentException(resultado.getErro());
        }
        return resultado;
    }

    private ValidacaoOrdemDeServicoIndisponivelException respostaInvalida(RuntimeException erro) {
        conexaoServidor.fechar();
        return new ValidacaoOrdemDeServicoIndisponivelException(erro);
    }
}
