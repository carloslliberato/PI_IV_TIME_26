const registerForm = document.getElementById('registerForm');
const fieldIds = ['nome', 'telefone', 'email', 'municipio', 'setor', 'cargo', 'senha', 'confirmarSenha', 'outroSetor'];
const message = document.getElementById('formMessage');

const setorSelect = document.getElementById('setor');
const outroSetorGroup = document.getElementById('outroSetorGroup');
const outroSetorInput = document.getElementById('outroSetor');

function atualizarCampoOutroSetor() {
  const isOutro = setorSelect.value === 'Outro';
  outroSetorGroup.classList.toggle('d-none', !isOutro);
  outroSetorInput.required = isOutro;
  if (!isOutro) {
    outroSetorInput.value = '';
    document.getElementById('outroSetorError').textContent = '';
  }
}

setorSelect.addEventListener('change', atualizarCampoOutroSetor);
atualizarCampoOutroSetor();

// Formulário demonstrativo: o envio real será conectado à API Java posteriormente.
document.getElementById('togglePassword').addEventListener('click', () => {
  const input = document.getElementById('senha');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  document.querySelector('#togglePassword i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
  document.getElementById('togglePassword').setAttribute('aria-label', showing ? 'Mostrar senha' : 'Ocultar senha');
});

document.getElementById('telefone').addEventListener('input', (event) => {
  let digits = event.target.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) digits = digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
  else if (digits.length > 6) digits = digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  else if (digits.length > 2) digits = digits.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  else if (digits.length) digits = digits.replace(/^(\d{0,2})/, '($1');
  event.target.value = digits;
});

registerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fieldIds.forEach(id => {
    const error = document.getElementById(`${id}Error`);
    if (error) error.textContent = '';
  });
  document.getElementById('declaracaoError').textContent = '';
  message.textContent = '';
  message.className = 'form-message';

  let valid = true;
  const value = id => document.getElementById(id).value.trim();
  const fail = (id, text) => { document.getElementById(`${id}Error`).textContent = text; valid = false; };

  if (value('nome').length < 3) fail('nome', 'Informe seu nome completo.');
  if (value('telefone').replace(/\D/g, '').length < 10) fail('telefone', 'Informe um telefone válido com DDD.');
  if (!document.getElementById('email').validity.valid || !value('email')) fail('email', 'Informe um e-mail válido.');
  if (!value('municipio')) fail('municipio', 'Selecione o município de gestão.');
  if (!value('setor')) fail('setor', 'Selecione a secretaria ou setor.');
  if (value('setor') === 'Outro' && value('outroSetor').length < 2) fail('outroSetor', 'Informe o nome da secretaria ou setor.');
  if (value('cargo').length < 2) fail('cargo', 'Informe seu cargo ou função.');
  if (document.getElementById('senha').value.length < 8) fail('senha', 'A senha deve ter pelo menos 8 caracteres.');
  if (document.getElementById('confirmarSenha').value !== document.getElementById('senha').value) fail('confirmarSenha', 'As senhas não coincidem.');
  if (!document.getElementById('declaracao').checked) {
    document.getElementById('declaracaoError').textContent = 'Confirme a declaração para continuar.';
    valid = false;
  }
  if (!valid) return;

  alert('Cadastro concluído com sucesso! Você será redirecionado para a página de login.');
  window.location.href = '../Login/login.html';
});
