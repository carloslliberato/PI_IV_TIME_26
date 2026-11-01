
package service;

// Repositórios
import repository.ContaRepository;
import repository.MunicipioRepository;

// DTO e modelo
import dto.CadastroContaDTO;
import model.Conta;

// Protocolo Socket
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;

// Bibliotecas
import java.util.List;
import org.bson.types.ObjectId;
import org.mindrot.jbcrypt.BCrypt;

public class ContaService {

    // ==========================================
    // ATRIBUTOS
    // ==========================================

    private final ContaRepository contaRepository;
    private final MunicipioRepository municipioRepository;
    private final ConexaoServidor conexaoServidor;

    // ==========================================
    // CONSTRUTOR
    // ==========================================

    public ContaService(
            ContaRepository contaRepository,
            MunicipioRepository municipioRepository,
            ConexaoServidor conexaoServidor) {

        this.contaRepository = contaRepository;
        this.municipioRepository = municipioRepository;
        this.conexaoServidor = conexaoServidor;
    }

    // ==========================================
    // MÉTODOS AUXILIARES
    // ==========================================

    // Verifica se o e-mail já está cadastrado
    public boolean emailJaCadastrado(String email) {
        return contaRepository.existeEmail(email);
    }

    // Busca o identificador do município no MongoDB
    private ObjectId buscarMunicipio(String nomeMunicipio) {

        return municipioRepository.buscarIdPorNome(nomeMunicipio)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Município não encontrado."));
    }

    // Criptografa a senha utilizando BCrypt
    private String criptografarSenha(String senha) {
        return BCrypt.hashpw(senha, BCrypt.gensalt());
    }

    // Envia os dados para validação pelo servidor Socket
    private ResultadoValidacaoCadastro validarCadastroNoServidor(
            CadastroContaDTO dados, String tipoConta) throws Exception {

        // Inicialmente, os campos específicos ficam nulos
        String setor = null;
        String outroSetor = null;
        String cargo = null;

        Boolean receberNotificacoes = null;
        List<String> preferencias = null;

        // Preenche os campos específicos de cada tipo de conta
        if ("CIDADAO".equals(tipoConta)) {

            receberNotificacoes = dados.isReceberNotificacoes();
            preferencias = dados.getPreferencias();

        } else if ("FUNCIONARIO".equals(tipoConta)) {

            setor = dados.getSetor();
            outroSetor = dados.getOutroSetor();
            cargo = dados.getCargo();
        }

        // Cria o pedido de validação
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                tipoConta,
                dados.getNome(),
                dados.getEmail(),
                dados.getTelefone(),
                dados.getMunicipio(),
                dados.getSenha(),
                dados.getConfirmarSenha(),
                setor,
                outroSetor,
                cargo,
                receberNotificacoes,
                preferencias
        );

        return conexaoServidor.validarCadastro(pedido);
    }

    // ==========================================
    // CADASTRO DE CONTAS
    // ==========================================

    // Cadastra um cidadão
    public Conta cadastrarCidadao(CadastroContaDTO dados) throws Exception {
        return cadastrarConta(dados, "CIDADAO");
    }

    // Cadastra um funcionário
    public Conta cadastrarFuncionario(CadastroContaDTO dados) throws Exception {
        return cadastrarConta(dados, "FUNCIONARIO");
    }

    // ==========================================
    // MÉTODO COMPARTILHADO DE CADASTRO
    // ==========================================

    private Conta cadastrarConta(CadastroContaDTO dados, String tipoConta) throws Exception {

        // 1. Verifica se o e-mail já está cadastrado
        if (emailJaCadastrado(dados.getEmail())) {
            throw new IllegalArgumentException(
                    "Este e-mail já está cadastrado.");
        }

        // 2. Busca o identificador do município no MongoDB
        ObjectId municipioId = buscarMunicipio(dados.getMunicipio());

        // 3. Envia os dados para validação pelo servidor Socket
        ResultadoValidacaoCadastro resultado =
                validarCadastroNoServidor(dados, tipoConta);

        // 4. Verifica se o cadastro foi aprovado
        if (!resultado.isValido()) {
            throw new IllegalArgumentException(
                    String.join(" ", resultado.getErros()));
        }

        // 5. Criptografa a senha
        String senhaHash = criptografarSenha(dados.getSenha());

        // 6. Cria a conta
        Conta conta = new Conta(
                dados.getNome(),
                dados.getEmail(),
                senhaHash,
                dados.getTelefone(),
                List.of(tipoConta),
                municipioId,
                dados.getSetor(),
                dados.getOutroSetor(),
                dados.getCargo(),
                dados.isReceberNotificacoes(),
                dados.getPreferencias()
        );

        // 7. Salva a conta no MongoDB
        contaRepository.salvar(conta);

        return conta;
    }
}
