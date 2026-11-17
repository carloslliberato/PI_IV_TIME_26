package service;

import model.Especie;
import repository.EspecieRepository;

import java.util.List;

public class EspecieService {

    private final EspecieRepository repository;

    public EspecieService(EspecieRepository repository) {
        this.repository = repository;
    }

    // LISTAR ESPECIES

    public List<Especie> listar() {
        return repository.buscarTodas();
    }

    // CADASTRAR ESPECIE

    public Especie cadastrar(Especie especie) {

        validarDados(especie);

        // Nao permite cadastrar duas especies
        // com o mesmo nome cientifico.
        boolean jaExiste = repository
                .buscarPorNomeCientifico(
                        especie.getNomeCientifico())
                .isPresent();

        if (jaExiste) {
            throw new IllegalStateException(
                    "Ja existe uma especie com esse nome cientifico.");
        }

        repository.salvar(especie);

        return especie;
    }

    // VALIDACOES

    private void validarDados(Especie especie) {

        if (especie == null) {
            throw new IllegalArgumentException(
                    "Informe os dados da especie.");
        }

        if (especie.getNomePopular() == null ||
                especie.getNomePopular().isBlank()) {

            throw new IllegalArgumentException(
                    "O nome popular e obrigatorio.");
        }

        if (especie.getNomeCientifico() == null ||
                especie.getNomeCientifico().isBlank()) {

            throw new IllegalArgumentException(
                    "O nome cientifico e obrigatorio.");
        }

        especie.setNomePopular(
                especie.getNomePopular().trim());

        especie.setNomeCientifico(
                especie.getNomeCientifico().trim());

        if (especie.getDescricao() != null) {
            especie.setDescricao(
                    especie.getDescricao().trim());
        }

        if (especie.getPeriodoFloracao() != null) {
            especie.setPeriodoFloracao(
                    especie.getPeriodoFloracao().trim());
        }
    }
}
