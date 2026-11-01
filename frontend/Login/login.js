
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
function acessarPerfil(perfil) {

    salvarSessao(usuarioAutenticado, perfil);

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
citizenAccess.addEventListener('click', () => {
    acessarPerfil('CIDADAO');
});

// Escolha do portal profissional.
employeeAccess.addEventListener('click', () => {
    acessarPerfil('FUNCIONARIO');
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

// Informa que a recuperação de senha ainda não está disponível.
document.getElementById('forgotPassword').addEventListener('click', (event) => {

    event.preventDefault();

    formMessage.className = 'form-message';
    formMessage.textContent =
        'A recuperação de senha será disponibilizada em uma próxima etapa.';
});
