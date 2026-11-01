
package service;

// Repositórios
import repository.ContaRepository;
import repository.MunicipioRepository;

// DTO e modelo
import dto.CadastroContaDTO;
import dto.LoginDTO;
import model.Conta;

// Protocolo Socket
import protocolo.PedidoDeValidacaoCadastro;
import protocolo.ResultadoValidacaoCadastro;

// Bibliotecas
import java.util.List;
import java.util.Optional;

import org.bson.types.ObjectId;
import org.mindrot.jbcrypt.BCrypt;

public class ContaService {

    private final ContaRepository contaRepository;
    private final MunicipioRepository municipioRepository;
    private final ConexaoServidor conexaoServidor;

    public ContaService(
            ContaRepository contaRepository,
            MunicipioRepository municipioRepository,
            ConexaoServidor conexaoServidor) {

        this.contaRepository = contaRepository;
        this.municipioRepository = municipioRepository;
        this.conexaoServidor = conexaoServidor;
    }

    // Verifica se o e-mail já está cadastrado
    public boolean emailJaCadastrado(String email) {
        return contaRepository.existeEmail(email);
    }

    // Busca o ID do município pelo nome
    private ObjectId buscarMunicipio(String nomeMunicipio) {

        return municipioRepository.buscarIdPorNome(nomeMunicipio)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Município não encontrado."));
    }

    // Busca o nome do município pelo ID
    private String buscarNomeMunicipio(ObjectId municipioId) {

        return municipioRepository.buscarNomePorId(municipioId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Município da conta não encontrado."));
    }

    // Criptografa a senha utilizando BCrypt
    private String criptografarSenha(String senha) {
        return BCrypt.hashpw(senha, BCrypt.gensalt());
    }

    // Envia os dados do cadastro para validação pelo servidor Socket
    private ResultadoValidacaoCadastro validarCadastroNoServidor(
            CadastroContaDTO dados, String tipoConta) throws Exception {

        String setor = null;
        String outroSetor = null;
        String cargo = null;

        Boolean receberNotificacoes = null;
        List<String> preferencias = null;

        // Campos específicos de cada perfil
        if ("CIDADAO".equals(tipoConta)) {

            receberNotificacoes = dados.isReceberNotificacoes();
            preferencias = dados.getPreferencias();

        } else if ("FUNCIONARIO".equals(tipoConta)) {

            setor = dados.getSetor();
            outroSetor = dados.getOutroSetor();
            cargo = dados.getCargo();
        }

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
                preferencias);

        return conexaoServidor.validarCadastro(pedido);
    }

    // Cadastra um cidadão ou adiciona o perfil a um funcionário existente
    public Conta cadastrarCidadao(CadastroContaDTO dados) throws Exception {

        Optional<Conta> contaExistente = contaRepository.buscarPorEmail(dados.getEmail());

        // Se não existir, cria uma nova conta
        if (contaExistente.isEmpty()) {
            return cadastrarConta(dados, "CIDADAO");
        }

        // Se existir, tenta adicionar o perfil de cidadão
        return adicionarPerfilCidadao(contaExistente.get(), dados);
    }

    // Adiciona o perfil de cidadão a uma conta de funcionário existente
    private Conta adicionarPerfilCidadao(
            Conta conta, CadastroContaDTO dados) throws Exception {

        List<String> perfis = conta.getPerfis();

        // Verifica se a conta já possui o perfil de cidadão
        if (perfis.contains("CIDADAO")) {
            throw new IllegalArgumentException(
                    "Esta conta já possui o perfil de cidadão.");
        }

        // Verifica se a conta possui o perfil de funcionário
        if (!perfis.contains("FUNCIONARIO")) {
            throw new IllegalArgumentException(
                    "Não é possível adicionar o perfil de cidadão a esta conta.");
        }

        // Confere a senha informada com a senha armazenada
        if (dados.getSenha() == null
                || !BCrypt.checkpw(dados.getSenha(), conta.getSenhaHash())) {

            throw new IllegalArgumentException("Senha incorreta.");
        }

        // Prepara o pedido de validação para o Socket
        PedidoDeValidacaoCadastro pedido = new PedidoDeValidacaoCadastro(
                "CIDADAO",
                conta.getNome(),
                conta.getEmail(),
                conta.getTelefone(),
                buscarNomeMunicipio(conta.getMunicipioId()),
                dados.getSenha(),
                dados.getConfirmarSenha(),
                null,
                null,
                null,
                dados.isReceberNotificacoes(),
                dados.getPreferencias());

        // Envia os dados para validação
        ResultadoValidacaoCadastro resultado = conexaoServidor.validarCadastro(pedido);

        // Verifica se a validação foi aprovada
        if (!resultado.isValido()) {
            throw new IllegalArgumentException(
                    String.join(" ", resultado.getErros()));
        }

        // Adiciona o perfil de cidadão
        perfis.add("CIDADAO");
        conta.setPerfis(perfis);

        // Atualiza as informações de notificações
        conta.setReceberNotificacoes(dados.isReceberNotificacoes());
        conta.setPreferenciasNotificacoes(dados.getPreferencias());

        // Atualiza a conta existente no MongoDB
        contaRepository.atualizar(conta);

        return conta;
    }

    // Cadastra um funcionário
    public Conta cadastrarFuncionario(CadastroContaDTO dados) throws Exception {
        return cadastrarConta(dados, "FUNCIONARIO");
    }

    // Cria uma nova conta de cidadão ou funcionário
    private Conta cadastrarConta(
            CadastroContaDTO dados, String tipoConta) throws Exception {

        // Verifica se o e-mail já está cadastrado
        if (emailJaCadastrado(dados.getEmail())) {
            throw new IllegalArgumentException(
                    "Este e-mail já está cadastrado.");
        }

        // Busca o ID do município
        ObjectId municipioId = buscarMunicipio(dados.getMunicipio());

        // Valida os dados pelo servidor Socket
        ResultadoValidacaoCadastro resultado = validarCadastroNoServidor(dados, tipoConta);

        if (!resultado.isValido()) {
            throw new IllegalArgumentException(
                    String.join(" ", resultado.getErros()));
        }

        // Criptografa a senha
        String senhaHash = criptografarSenha(dados.getSenha());

        // Cria a nova conta
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
                dados.getPreferencias());

        // Salva a nova conta no MongoDB
        contaRepository.salvar(conta);

        return conta;
    }

    public Conta autenticar(LoginDTO dados) {

        if (dados == null ||
                dados.getEmail() == null || dados.getEmail().isBlank() ||
                dados.getSenha() == null || dados.getSenha().isBlank()) {

            throw new IllegalArgumentException("E-mail e senha são obrigatórios.");
        }

        Conta conta = contaRepository.buscarPorEmail(dados.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("E-mail ou senha incorretos."));

        boolean senhaCorreta = BCrypt.checkpw(
                dados.getSenha(),
                conta.getSenhaHash());

        if (!senhaCorreta) {
            throw new IllegalArgumentException("E-mail ou senha incorretos.");
        }

        return conta;
    }
}
