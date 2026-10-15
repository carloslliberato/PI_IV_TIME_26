// Localiza o formulario e os elementos que recebem dados, erros e mensagens de status.
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('senha');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const formMessage = document.getElementById('formMessage');

// Demonstração visual: a autenticação real será conectada à API Java posteriormente.
// Alterna a visibilidade da senha e atualiza o icone e o rotulo acessivel do botao.
document.getElementById('togglePassword').addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  document.querySelector('#togglePassword i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
  document.getElementById('togglePassword').setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
});

// Controla o envio: limpa mensagens antigas, valida os campos e inicia a sessao demonstrativa.
loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  emailError.textContent = '';
  passwordError.textContent = '';
  formMessage.textContent = '';
  formMessage.className = 'form-message';
  let valid = true;

  // Verifica se o e-mail foi informado e se segue o formato esperado pelo navegador.
  if (!emailInput.value.trim() || !emailInput.validity.valid) {
    emailError.textContent = 'Informe um e-mail válido.';
    valid = false;
  }
  // Exige uma senha com pelo menos seis caracteres antes de prosseguir.
  if (!passwordInput.value || passwordInput.value.length < 6) {
    passwordError.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    valid = false;
  }
  if (!valid) return;

  // Cria um nome demonstrativo e guarda os dados da sessao no armazenamento local.
  const emailName = emailInput.value.trim().split('@')[0].replace(/[._-]+/g, ' ');
  const nome = emailName.replace(/\b\p{L}/gu, letra => letra.toLocaleUpperCase('pt-BR')) || 'Cidadão';
  localStorage.setItem('login', 'true');
  localStorage.setItem('nome', nome);
  localStorage.setItem('idSetor', 'null');
  localStorage.setItem('arborizaUsuario', JSON.stringify({ login: true, nome, idSetor: null }));
  formMessage.textContent = 'Sessão demonstrativa iniciada. A autenticação real será conectada à API do Arboriza.';
  formMessage.classList.add('success');
  // Redireciona para o portal publico depois de registrar os dados demonstrativos.
  window.location.href = '../Perfil_Publico/index.html';
});

// Informa que a recuperacao de senha ainda nao esta disponivel nesta etapa.
document.getElementById('forgotPassword').addEventListener('click', (event) => {
  event.preventDefault();
  formMessage.className = 'form-message';
  formMessage.textContent = 'A recuperação de senha será disponibilizada na etapa de autenticação.';
});

// Exibe uma mensagem demonstrativa no atalho para cadastro.
document.getElementById('signupLink').addEventListener('click', (event) => {
  event.preventDefault();
  formMessage.className = 'form-message';
  formMessage.textContent = 'A página de cadastro será criada em uma próxima etapa.';
});
