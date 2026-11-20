package model;

// Resultado das duas gravações confirmadas na mesma transação.
public record ConclusaoOrdemDeServico(
        OrdemDeServico ordem,
        Intervencao intervencao) {
}
