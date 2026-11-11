
package service;

import repository.ContaRepository;
import repository.RecuperacaoSenhaRepository;

import model.Conta;
import model.RecuperacaoSenha;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Optional;

import org.mindrot.jbcrypt.BCrypt;

public class RecuperacaoSenhaService {

    private final ContaRepository contaRepository;
    private final RecuperacaoSenhaRepository recuperacaoRepository;
    private final ServicoEmail servicoEmail;
    private final ContaService contaService;

    private final SecureRandom geradorAleatorio = new SecureRandom();

    public RecuperacaoSenhaService(
            ContaRepository contaRepository,
            RecuperacaoSenhaRepository recuperacaoRepository,
            ServicoEmail servicoEmail,
            ContaService contaService) {

        this.contaRepository = contaRepository;
        this.recuperacaoRepository = recuperacaoRepository;
        this.servicoEmail = servicoEmail;
        this.contaService = contaService;
    }

    // Gera um código aleatório de seis dígitos
    private String gerarCodigo() {

        int codigo = geradorAleatorio.nextInt(1000000);

        return String.format("%06d", codigo);
    }

    // Solicita a recuperação de senha
    public void solicitarRecuperacao(String email) {

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "O e-mail é obrigatório.");
        }

        Optional<Conta> resultado =
                contaRepository.buscarPorEmail(email);

        // Não revela se o e-mail está cadastrado
        if (resultado.isEmpty()) {
            return;
        }

        Conta conta = resultado.get();

        // Gera o código e seu hash
        String codigo = gerarCodigo();
        String codigoHash = BCrypt.hashpw(
                codigo,
                BCrypt.gensalt());

        // Invalida solicitações anteriores
        recuperacaoRepository.invalidarPorContaId(
                conta.getId());

        // Define a validade de dez minutos
        Instant dataExpiracao = Instant.now().plusSeconds(600);

        // Cria e salva a recuperação
        RecuperacaoSenha recuperacao = new RecuperacaoSenha(
                conta.getId(),
                codigoHash,
                dataExpiracao);

        recuperacaoRepository.salvar(recuperacao);

        // Prepara o e-mail
        String assunto = "Recuperação de senha - Arboriza";

        String mensagem = "Olá, " + conta.getNome() + "!\n\n"
                + "Você solicitou a recuperação de sua senha no Arboriza.\n\n"
                + "Seu código de recuperação é: " + codigo + "\n\n"
                + "Este código é válido por 10 minutos e só pode ser utilizado uma vez.\n\n"
                + "Se você não solicitou esta recuperação, ignore este e-mail.";

        // Envia o e-mail
        try {

            servicoEmail.enviarEmail(
                    conta.getEmail(),
                    assunto,
                    mensagem);

        } catch (RuntimeException erroEnvio) {

            // Invalida o código caso o envio falhe
            try {

                recuperacaoRepository.marcarComoUtilizado(
                        recuperacao.getId());

            } catch (RuntimeException erroInvalidacao) {

                erroEnvio.addSuppressed(erroInvalidacao);
            }

            throw new RuntimeException(
                    "Não foi possível enviar o e-mail de recuperação.",
                    erroEnvio);
        }
    }

    // Valida o código de recuperação
    private void validarCodigo(
            RecuperacaoSenha recuperacao,
            String codigo) {

        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException(
                    "O código de recuperação é obrigatório.");
        }

        // Verifica se o código já foi utilizado
        if (recuperacao.isUtilizado()) {
            throw new IllegalArgumentException(
                    "Código de recuperação inválido ou expirado.");
        }

        // Verifica se o código expirou
        if (recuperacao.estaExpirado()) {

            recuperacaoRepository.marcarComoUtilizado(
                    recuperacao.getId());

            throw new IllegalArgumentException(
                    "Código de recuperação inválido ou expirado.");
        }

        // Verifica se o limite de tentativas foi atingido
        if (recuperacao.getTentativas() >= 5) {

            recuperacaoRepository.marcarComoUtilizado(
                    recuperacao.getId());

            throw new IllegalArgumentException(
                    "Código de recuperação inválido ou expirado.");
        }

        // Compara o código informado com o hash armazenado
        boolean codigoCorreto = BCrypt.checkpw(
                codigo,
                recuperacao.getCodigoHash());

        if (!codigoCorreto) {

            int tentativas = recuperacao.getTentativas() + 1;

            recuperacaoRepository.atualizarTentativas(
                    recuperacao.getId(),
                    tentativas);

            // Invalida após a quinta tentativa incorreta
            if (tentativas >= 5) {

                recuperacaoRepository.marcarComoUtilizado(
                        recuperacao.getId());
            }

            throw new IllegalArgumentException(
                    "Código de recuperação inválido ou expirado.");
        }
    }

    // Redefine a senha utilizando o código de recuperação
    public void redefinirSenha(
            String email,
            String codigo,
            String novaSenha,
            String confirmarNovaSenha) {

        // Verifica se os campos foram preenchidos
        if (email == null || email.isBlank()
                || codigo == null || codigo.isBlank()
                || novaSenha == null || novaSenha.isBlank()
                || confirmarNovaSenha == null
                || confirmarNovaSenha.isBlank()) {

            throw new IllegalArgumentException(
                    "Todos os campos são obrigatórios.");
        }

        // Verifica se as senhas são iguais
        if (!novaSenha.equals(confirmarNovaSenha)) {
            throw new IllegalArgumentException(
                    "As senhas não coincidem.");
        }

        // Busca a conta pelo e-mail
        Conta conta = contaRepository.buscarPorEmail(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Código de recuperação inválido ou expirado."));

        // Busca a solicitação de recuperação
        RecuperacaoSenha recuperacao = recuperacaoRepository
                .buscarPorContaId(conta.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Código de recuperação inválido ou expirado."));

        // Valida o código
        validarCodigo(recuperacao, codigo);

        // Atualiza a senha da conta
        contaService.redefinirSenha(
                conta.getId(),
                novaSenha);

        // Impede que o código seja utilizado novamente
        recuperacaoRepository.marcarComoUtilizado(
                recuperacao.getId());
    }
}
