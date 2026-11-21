// Autor: Carlos Luciano, Marialvo Junior

package service;

/** Falha de comunicação ou de contrato com o servidor de validação de OS.
 * @author Marialvo Corrêa de Freitas Junior
 */
public class ValidacaoOrdemDeServicoIndisponivelException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    public ValidacaoOrdemDeServicoIndisponivelException(Throwable causa) {
        super("O servidor de validação de OS está indisponível. Nenhuma alteração foi gravada. "
                + "Tente novamente após restabelecer a conexão.", causa);
    }
}
