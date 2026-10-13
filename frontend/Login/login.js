const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('senha');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');
const formMessage = document.getElementById('formMessage');

// Demonstração visual: a autenticação real será conectada à API Java posteriormente.
document.getElementById('togglePassword').addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  document.querySelector('#togglePassword i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
  document.getElementById('togglePassword').setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  emailError.textContent = '';
  passwordError.textContent = '';
  formMessage.textContent = '';
  formMessage.className = 'form-message';
  let valid = true;

  if (!emailInput.value.trim() || !emailInput.validity.valid) {
    emailError.textContent = 'Informe um e-mail válido.';
    valid = false;
  }
  if (!passwordInput.value || passwordInput.value.length < 6) {
    passwordError.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    valid = false;
  }
  if (!valid) return;

  formMessage.textContent = 'A tela está pronta para integração. A autenticação será habilitada quando conectarmos a API do Arboriza.';
  formMessage.classList.add('success');
});

document.getElementById('forgotPassword').addEventListener('click', (event) => {
  event.preventDefault();
  formMessage.className = 'form-message';
  formMessage.textContent = 'A recuperação de senha será disponibilizada na etapa de autenticação.';
});

document.getElementById('signupLink').addEventListener('click', (event) => {
  event.preventDefault();
  formMessage.className = 'form-message';
  formMessage.textContent = 'A página de cadastro será criada em uma próxima etapa.';
});
