package service;

import org.bson.types.ObjectId;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import dto.CadastroEquipeDTO;
import dto.CadastroColaboradorDTO;
import model.Conta;
import model.Colaborador;
import model.Equipe;
import repository.ContaRepository;
import repository.EquipeRepository;
import repository.MunicipioRepository;

// Aplica as regras de negócio para criar uma equipe municipal.
public class EquipeService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final ContaRepository contaRepository;
    private final EquipeRepository equipeRepository;
    private final MunicipioRepository municipioRepository;

    public EquipeService(
            ContaRepository contaRepository,
            EquipeRepository equipeRepository,
            MunicipioRepository municipioRepository) {
        this.contaRepository = contaRepository;
        this.equipeRepository = equipeRepository;
        this.municipioRepository = municipioRepository;
    }

    // Usa a conta autenticada para definir os vínculos da equipe no banco.
    public Equipe criarEquipe(CadastroEquipeDTO dados, String usuarioId) {
        if (dados == null) {
            throw new IllegalArgumentException(
                    "Os dados da equipe não foram informados.");
        }

        Conta funcionario = buscarFuncionarioAutenticado(usuarioId);
        String emailGestor = normalizarEmail(
                dados.getGestor(),
                "Informe um e-mail válido para o gestor da equipe.");
        String municipioNome = municipioRepository
                .buscarNomePorId(funcionario.getMunicipioId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Município do funcionário não encontrado."));

        // Vincula os IDs e os nomes consultados no banco, não dados do formulário.
        Equipe equipe = new Equipe(
                dados.getNome(),
                dados.getRegiaoAtuacao(),
                emailGestor,
                funcionario.getMunicipioId(),
                municipioNome,
                funcionario.getId(),
                funcionario.getNome());

        // Persiste o novo documento e devolve a equipe criada para a API.
        equipeRepository.salvar(equipe);
        return equipe;
    }

    // Valida os dados e inclui o colaborador no documento da equipe.
    public Colaborador cadastrarColaborador(
            String equipeId,
            CadastroColaboradorDTO dados,
            String usuarioId) {
        if (dados == null) {
            throw new IllegalArgumentException(
                    "Os dados do colaborador não foram informados.");
        }

        // Confirma a identidade e o perfil da pessoa autenticada.
        Conta funcionario = buscarFuncionarioAutenticado(usuarioId);
        ObjectId idEquipe = converterId(equipeId, "ID da equipe inválido.");
        String email = normalizarEmail(
                dados.getEmail(),
                "Informe um e-mail válido para o colaborador.");

        // Impede que o usuário adicione colaboradores em uma equipe de outra conta.
        if (!equipeRepository.pertenceAoUsuario(idEquipe, funcionario.getId())) {
            throw new IllegalArgumentException(
                    "Equipe não encontrada para esta conta.");
        }

        // Impede reutilizar o mesmo e-mail em qualquer equipe existente.
        if (equipeRepository.existeEmailColaborador(email)) {
            throw new IllegalArgumentException(
                    "Já existe um colaborador cadastrado com este e-mail.");
        }

        // Herda a região da equipe e valida os campos recebidos do formulário.
        Colaborador colaborador = new Colaborador(
                dados.getNomeCompleto(),
                dados.getFuncao(),
                email,
                buscarRegiaoEquipe(idEquipe, funcionario.getId()));

        // Persiste o colaborador dentro do array colaboradores do documento equipe.
        if (!equipeRepository.adicionarColaborador(
                idEquipe,
                funcionario.getId(),
                colaborador)) {
            if (equipeRepository.existeEmailColaborador(email)) {
                throw new IllegalArgumentException(
                        "Já existe um colaborador cadastrado com este e-mail.");
            }
            throw new IllegalArgumentException(
                    "Equipe não encontrada para esta conta.");
        }

        return colaborador;
    }

    // Remove apenas uma equipe disponível, vazia e sem ordens de serviço vinculadas.
    public boolean excluirEquipe(String equipeId, String usuarioId) {
        Conta funcionario = buscarFuncionarioAutenticado(usuarioId);
        ObjectId idEquipe = converterId(equipeId, "ID da equipe inválido.");
        return equipeRepository.excluirEquipe(idEquipe, funcionario.getId());
    }

    // Exclui um colaborador somente se a equipe não estiver indisponível.
    public boolean removerColaborador(
            String equipeId,
            String colaboradorId,
            String usuarioId) {
        // Valida a sessão e converte os IDs recebidos pela rota.
        Conta funcionario = buscarFuncionarioAutenticado(usuarioId);
        ObjectId idEquipe = converterId(equipeId, "ID da equipe inválido.");
        ObjectId idColaborador = converterId(
                colaboradorId,
                "ID do colaborador inválido.");

        // Atualiza o status se houver ordem e impede a exclusão nessa situação.
        boolean indisponivel = equipeRepository.sincronizarStatusComOrdens(
                idEquipe,
                funcionario.getId());
        if (!equipeRepository.pertenceAoUsuario(idEquipe, funcionario.getId())) {
            throw new IllegalArgumentException(
                    "Equipe não encontrada para esta conta.");
        }
        if (indisponivel) {
            throw new IllegalStateException(
                    "Não é possível excluir colaboradores de uma equipe indisponível.");
        }

        // Remove o subdocumento pelo ID sem alterar outros colaboradores.
        return equipeRepository.removerColaborador(
                idEquipe,
                funcionario.getId(),
                idColaborador);
    }

    // Valida filtros e lista equipes limitadas ao município e à conta da sessão.
    public List<Equipe> listarEquipes(String usuarioId, String busca, String status) {
        Conta funcionario = buscarFuncionarioAutenticado(usuarioId);
        String municipioNome = municipioRepository
                .buscarNomePorId(funcionario.getMunicipioId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Município do funcionário não encontrado."));

        // Remove espaços externos e converte o status para um dos valores aceitos.
        String buscaNormalizada = busca == null ? "" : busca.trim();
        String statusNormalizado = normalizarStatusFiltro(status);

        // Restringe a busca aos vínculos da conta autenticada e aplica os filtros informados.
        return equipeRepository.listarPorMunicipioEUsuario(
                funcionario.getMunicipioId(),
                municipioNome,
                funcionario.getId(),
                funcionario.getNome(),
                buscaNormalizada,
                statusNormalizado);
    }

    // Aceita somente os dois status apresentados no filtro da página.
    private String normalizarStatusFiltro(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        String valor = status.trim();
        if ("Disponível".equalsIgnoreCase(valor)) {
            return "Disponível";
        }
        if ("Indisponível".equalsIgnoreCase(valor)) {
            return "Indisponível";
        }
        throw new IllegalArgumentException("O filtro de status informado é inválido.");
    }

    // Remove espaços externos, normaliza caixa e valida o formato do e-mail.
    private String normalizarEmail(String valor, String mensagemErro) {
        if (valor == null) {
            throw new IllegalArgumentException(mensagemErro);
        }

        String email = valor.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException(mensagemErro);
        }
        return email;
    }

    // Recupera a região da equipe para salvar uma cópia junto ao colaborador.
    private String buscarRegiaoEquipe(ObjectId equipeId, ObjectId usuarioId) {
        return equipeRepository.buscarRegiaoPorIdEUsuario(equipeId, usuarioId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Equipe não encontrada para esta conta."));
    }

    // Rejeita IDs malformados antes de consultar o MongoDB.
    private ObjectId converterId(String valor, String mensagem) {
        if (!ObjectId.isValid(valor)) {
            throw new IllegalArgumentException(mensagem);
        }
        return new ObjectId(valor);
    }

    // Valida o usuário da sessão e recupera sua conta antes de qualquer consulta.
    private Conta buscarFuncionarioAutenticado(String usuarioId) {
        if (usuarioId == null || !ObjectId.isValid(usuarioId)) {
            throw new SecurityException(
                    "A sessão não contém um funcionário válido.");
        }

        ObjectId id = new ObjectId(usuarioId);
        Conta funcionario = contaRepository.buscarPorId(id)
                .orElseThrow(() -> new SecurityException(
                        "Funcionário da sessão não encontrado."));

        if (!funcionario.getPerfis().contains("FUNCIONARIO")) {
            throw new SecurityException(
                    "Somente funcionários podem acessar as equipes.");
        }

        return funcionario;
    }
}
