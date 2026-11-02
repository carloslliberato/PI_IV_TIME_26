
// Localiza os elementos do formulário.
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('senha');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const formMessage = document.getElementById('formMessage');

// Localiza os elementos da escolha de perfil.
const profileChoice = document.getElementById('profileChoice');
const citizenAccess = document.getElementById('citizenAccess');
const employeeAccess = document.getElementById('employeeAccess');
const backToLogin = document.getElementById('backToLogin');

// Guarda temporariamente os dados recebidos do backend.
let usuarioAutenticado = null;

// Alterna a visibilidade da senha.
document.getElementById('togglePassword').addEventListener('click', () => {
    const showing = passwordInput.type === 'text';

    passwordInput.type = showing ? 'password' : 'text';

    document.querySelector('#togglePassword i').className =
        showing ? 'bi bi-eye' : 'bi bi-eye-slash';

    document.getElementById('togglePassword').setAttribute(
        'aria-label',
        showing ? 'Mostrar senha' : 'Ocultar senha'
    );
});

// Salva os dados do usuário e o perfil escolhido.
function salvarSessao(usuario, perfil) {

    const dadosSessao = {
        login: true,
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfis: usuario.perfis,
        perfilAtivo: perfil,
        setor: usuario.setor,
        cargo: usuario.cargo
    };

    localStorage.setItem('login', 'true');
    localStorage.setItem('nome', usuario.nome);
    localStorage.setItem('idSetor', 'null');

    localStorage.setItem(
        'arborizaUsuario',
        JSON.stringify(dadosSessao)
    );
}

// Redireciona de acordo com o perfil escolhido.
async function acessarPerfil(perfil) {

    // Envia o perfil escolhido para o backend.
    const resposta = await fetch('/api/contas/perfil', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            perfil: perfil
        })
    });

    const resultado = await resposta.json();

    // Verifica se o backend aceitou a escolha.
    if (!resposta.ok) {
        throw new Error(resultado.erro || 'Não foi possível selecionar o perfil.');
    }

    // Guarda os dados apenas para utilização visual no frontend.
    salvarSessao(usuarioAutenticado, perfil);

    // Redireciona para o portal escolhido.
    if (perfil === 'CIDADAO') {
        window.location.href = '/';
    } else if (perfil === 'FUNCIONARIO') {
        window.location.href = '/perfil-profissional';
    }
}

// Realiza a autenticação na API Java.
loginForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    emailError.textContent = '';
    passwordError.textContent = '';
    formMessage.textContent = '';
    formMessage.className = 'form-message';

    let valid = true;

    // Valida o e-mail.
    if (!emailInput.value.trim() || !emailInput.validity.valid) {
        emailError.textContent = 'Informe um e-mail válido.';
        valid = false;
    }

    // Valida a senha.
    if (!passwordInput.value || passwordInput.value.length < 8) {
        passwordError.textContent = 'A senha deve ter pelo menos 8 caracteres.';
        valid = false;
    }

    if (!valid) return;

    // Evita envios repetidos enquanto a API responde.
    const botaoEntrar = loginForm.querySelector('button[type="submit"]');
    botaoEntrar.disabled = true;

    formMessage.textContent = 'Verificando seus dados...';

    try {

        // Envia as credenciais para o backend.
        const resposta = await fetch('/api/contas/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailInput.value.trim(),
                senha: passwordInput.value
            })
        });

        const resultado = await resposta.json();

        // Trata respostas de erro do backend.
        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível realizar o login.');
        }

        usuarioAutenticado = resultado;

        // Verifica os perfis associados à conta.
        const perfis = resultado.perfis || [];

        const possuiCidadao = perfis.includes('CIDADAO');
        const possuiFuncionario = perfis.includes('FUNCIONARIO');

        // Se possui os dois perfis, apresenta a escolha.
        if (possuiCidadao && possuiFuncionario) {

            loginForm.classList.add('d-none');
            profileChoice.classList.remove('d-none');

            formMessage.textContent = '';

            // Se possui somente perfil de cidadão.
        } else if (possuiCidadao) {

            acessarPerfil('CIDADAO');

            // Se possui somente perfil de funcionário.
        } else if (possuiFuncionario) {

            acessarPerfil('FUNCIONARIO');

        } else {
            throw new Error('Esta conta não possui um perfil de acesso válido.');
        }

    } catch (erro) {

        formMessage.textContent = erro.message;
        formMessage.classList.add('error');

    } finally {

        botaoEntrar.disabled = false;
    }
});

// Escolha do portal público.
citizenAccess.addEventListener('click', async () => {

    try {
        await acessarPerfil('CIDADAO');

    } catch (erro) {
        formMessage.textContent = erro.message;
        formMessage.classList.add('error');
    }
});

employeeAccess.addEventListener('click', async () => {

    try {
        await acessarPerfil('FUNCIONARIO');

    } catch (erro) {
        formMessage.textContent = erro.message;
        formMessage.classList.add('error');
    }
});

// Permite voltar e entrar com outra conta.
backToLogin.addEventListener('click', () => {

    usuarioAutenticado = null;

    profileChoice.classList.add('d-none');
    loginForm.classList.remove('d-none');

    emailInput.value = '';
    passwordInput.value = '';

    formMessage.textContent = '';
    formMessage.className = 'form-message';
});

// Elementos da recuperação de senha.
const recoveryPanel = document.getElementById('recoveryPanel');

const recoveryRequestStep = document.getElementById('recoveryRequestStep');
const recoveryResetStep = document.getElementById('recoveryResetStep');

const requestRecoveryForm = document.getElementById('requestRecoveryForm');
const resetPasswordForm = document.getElementById('resetPasswordForm');

const recoveryEmailInput = document.getElementById('recoveryEmail');
const recoveryCodeInput = document.getElementById('recoveryCode');

const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');

const recoveryRequestMessage = document.getElementById('recoveryRequestMessage');
const resetPasswordMessage = document.getElementById('resetPasswordMessage');

const recoveryEmailDisplay = document.getElementById('recoveryEmailDisplay');

const recoverySuccess = document.getElementById('recoverySuccess');

const signupLine = document.querySelector('.signup-line');

let emailRecuperacao = '';


// Abre a tela de recuperação de senha.
document.getElementById('forgotPassword').addEventListener('click', (event) => {

    event.preventDefault();

    loginForm.classList.add('d-none');
    profileChoice.classList.add('d-none');

    signupLine.classList.add('d-none');

    recoveryPanel.classList.remove('d-none');

    recoveryRequestStep.classList.remove('d-none');
    recoveryResetStep.classList.add('d-none');

    recoveryEmailInput.value = emailInput.value.trim();

    formMessage.textContent = '';
    recoveryRequestMessage.textContent = '';
    resetPasswordMessage.textContent = '';
});


// Volta para a tela de login.
function voltarAoLogin() {

    recoveryPanel.classList.add('d-none');

    loginForm.classList.remove('d-none');

    signupLine.classList.remove('d-none');

    recoveryRequestStep.classList.remove('d-none');
    recoveryResetStep.classList.add('d-none');

    loginForm.reset();
    requestRecoveryForm.reset();
    resetPasswordForm.reset();

    recoverySuccess.classList.add('d-none');
    resetPasswordForm.classList.remove('d-none');

    recoveryRequestMessage.textContent = '';
    resetPasswordMessage.textContent = '';

    formMessage.textContent = '';
    formMessage.className = 'form-message';

    emailRecuperacao = '';
}


// Botão para voltar ao login na primeira etapa.
document.getElementById('backToLoginFromRequest')
    .addEventListener('click', voltarAoLogin);


// Solicita o código de recuperação.
requestRecoveryForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    recoveryRequestMessage.textContent = '';
    recoveryRequestMessage.className = 'form-message';

    const email = recoveryEmailInput.value.trim();

    if (!email || !recoveryEmailInput.validity.valid) {
        recoveryRequestMessage.textContent = 'Informe um e-mail válido.';
        recoveryRequestMessage.classList.add('error');
        return;
    }

    const botao = requestRecoveryForm.querySelector('button[type="submit"]');

    botao.disabled = true;
    recoveryRequestMessage.textContent = 'Enviando solicitação...';

    try {

        const resposta = await fetch('/api/contas/recuperacao-senha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível solicitar a recuperação.');
        }

        emailRecuperacao = email;

        recoveryEmailDisplay.textContent = email;

        // Avança para a etapa de redefinição.
        recoveryRequestStep.classList.add('d-none');
        recoveryResetStep.classList.remove('d-none');

        recoveryRequestMessage.textContent = '';

    } catch (erro) {

        recoveryRequestMessage.textContent = erro.message;
        recoveryRequestMessage.classList.add('error');

    } finally {

        botao.disabled = false;
    }
});


// Redefine a senha utilizando o código recebido.
resetPasswordForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    resetPasswordMessage.textContent = '';
    resetPasswordMessage.className = 'form-message';

    const codigo = recoveryCodeInput.value.trim();
    const novaSenha = newPasswordInput.value;
    const confirmarNovaSenha = confirmNewPasswordInput.value;

    // Valida o código.
    if (!/^[0-9]{6}$/.test(codigo)) {
        resetPasswordMessage.textContent =
            'Informe o código de seis dígitos recebido por e-mail.';
        resetPasswordMessage.classList.add('error');
        return;
    }

    // Valida o tamanho da senha.
    if (novaSenha.length < 8) {
        resetPasswordMessage.textContent =
            'A senha deve possuir pelo menos 8 caracteres.';
        resetPasswordMessage.classList.add('error');
        return;
    }

    // Confere as senhas.
    if (novaSenha !== confirmarNovaSenha) {
        resetPasswordMessage.textContent =
            'As senhas não coincidem.';
        resetPasswordMessage.classList.add('error');
        return;
    }

    const botao = resetPasswordForm.querySelector('button[type="submit"]');

    botao.disabled = true;
    resetPasswordMessage.textContent = 'Redefinindo senha...';

    try {

        const resposta = await fetch('/api/contas/redefinir-senha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailRecuperacao,
                codigo: codigo,
                novaSenha: novaSenha,
                confirmarNovaSenha: confirmarNovaSenha
            })
        });

        const resultado = await resposta.json();

        if (!resposta.ok) {
            throw new Error(resultado.erro || 'Não foi possível redefinir a senha.');
        }

        // Exibe a confirmação de sucesso.
        resetPasswordForm.classList.add('d-none');

        document.getElementById('changeRecoveryEmail').classList.add('d-none');

        resetPasswordMessage.textContent = '';

        recoverySuccess.classList.remove('d-none');

    } catch (erro) {

        resetPasswordMessage.textContent = erro.message;
        resetPasswordMessage.classList.add('error');

    } finally {

        botao.disabled = false;
    }
});


// Permite voltar e alterar o e-mail informado.
document.getElementById('changeRecoveryEmail')
    .addEventListener('click', () => {

        recoveryResetStep.classList.add('d-none');
        recoveryRequestStep.classList.remove('d-none');

        recoveryRequestMessage.textContent = '';
        resetPasswordMessage.textContent = '';

        recoveryCodeInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    });


// Finaliza a recuperação e retorna ao login.
document.getElementById('finishRecovery')
    .addEventListener('click', voltarAoLogin);