
const registerForm = document.getElementById('registerForm');
const message = document.getElementById('formMessage');

const toastElement = document.getElementById('employeeToast');
const toastBody = toastElement.querySelector('.toast-body');

// Campos do formulario.
const fieldIds = [
  'nome',
  'telefone',
  'email',
  'municipio',
  'setor',
  'outroSetor',
  'cargo',
  'senha',
  'confirmarSenha'
];

// Retorna o valor de um campo sem espacos extras.
function value(id) {
  return document.getElementById(id).value.trim();
}

// Exibe uma mensagem de erro em um campo.
function mostrarErro(id, texto) {
  const error = document.getElementById(`${id}Error`);

  if (error) {
    error.textContent = texto;
  }
}

// Limpa as mensagens de erro.
function limparErros() {
  fieldIds.forEach(id => {
    mostrarErro(id, '');
  });

  document.getElementById('declaracaoError').textContent = '';
}

// Exibe ou oculta o campo de outro setor.
function atualizarCampoOutroSetor() {
  const setor = document.getElementById('setor').value;
  const campoOutroSetor = document.getElementById('outroSetorGroup');
  const outroSetor = document.getElementById('outroSetor');

  const mostrar = setor === 'Outro';

  campoOutroSetor.classList.toggle('d-none', !mostrar);
  outroSetor.required = mostrar;

  if (!mostrar) {
    outroSetor.value = '';
    mostrarErro('outroSetor', '');
  }
}

// Atualiza o campo quando o setor e alterado.
document.getElementById('setor').addEventListener('change', atualizarCampoOutroSetor);

// Controle de visualizacao da senha.
document.getElementById('togglePassword').addEventListener('click', () => {
  const campo = document.getElementById('senha');
  const icone = document.querySelector('#togglePassword i');

  if (campo.type === 'password') {
    campo.type = 'text';
    icone.classList.replace('bi-eye', 'bi-eye-slash');
  } else {
    campo.type = 'password';
    icone.classList.replace('bi-eye-slash', 'bi-eye');
  }
});

// Mascara de telefone.
document.getElementById('telefone').addEventListener('input', event => {
  let numero = event.target.value.replace(/\D/g, '');

  if (numero.length > 11) {
    numero = numero.substring(0, 11);
  }

  if (numero.length > 10) {
    numero = numero.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (numero.length > 6) {
    numero = numero.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (numero.length > 2) {
    numero = numero.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
  } else if (numero.length > 0) {
    numero = numero.replace(/^(\d*)/, '($1');
  }

  event.target.value = numero;
});

// Envio do formulario.
registerForm.addEventListener('submit', async event => {
  event.preventDefault();

  limparErros();

  message.textContent = '';
  message.className = 'form-message';

  let formularioValido = true;

  // Nome.
  if (value('nome').length < 3) {
    mostrarErro('nome', 'Informe seu nome completo.');
    formularioValido = false;
  }

  // Telefone.
  const telefone = value('telefone').replace(/\D/g, '');

  if (telefone.length < 10 || telefone.length > 11) {
    mostrarErro('telefone', 'Informe um telefone válido com DDD.');
    formularioValido = false;
  }

  // E-mail.
  const email = value('email');
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!emailValido) {
    mostrarErro('email', 'Informe um e-mail válido.');
    formularioValido = false;
  }

  // Municipio.
  if (!value('municipio')) {
    mostrarErro('municipio', 'Selecione seu município.');
    formularioValido = false;
  }

  // Setor.
  const setor = value('setor');

  if (!setor) {
    mostrarErro('setor', 'Selecione seu setor.');
    formularioValido = false;
  }

  // Outro setor.
  if (setor === 'Outro' && value('outroSetor').length < 2) {
    mostrarErro('outroSetor', 'Informe o nome do seu setor.');
    formularioValido = false;
  }

  // Cargo.
  if (value('cargo').length < 2) {
    mostrarErro('cargo', 'Informe seu cargo.');
    formularioValido = false;
  }

  // Senha.
  const senha = document.getElementById('senha').value;
  const confirmarSenha = document.getElementById('confirmarSenha').value;

  if (senha.length < 8) {
    mostrarErro('senha', 'A senha deve ter pelo menos 8 caracteres.');
    formularioValido = false;
  }

  if (senha !== confirmarSenha) {
    mostrarErro('confirmarSenha', 'As senhas não coincidem.');
    formularioValido = false;
  }

  // Declaracao.
  const declaracao = document.getElementById('declaracao');

  if (!declaracao.checked) {
    document.getElementById('declaracaoError').textContent =
      'É necessário confirmar a declaração.';

    formularioValido = false;
  }

  // Interrompe o envio se houver erros.
  if (!formularioValido) {
    message.textContent = 'Verifique os campos destacados.';
    message.classList.add('error');
    return;
  }

  // Organiza os dados que serao enviados ao backend.
  const dadosCadastro = {
    nome: value('nome'),
    telefone: telefone,
    email: email,
    municipio: value('municipio'),
    setor: setor,
    outroSetor: setor === 'Outro' ? value('outroSetor') : null,
    cargo: value('cargo'),
    senha: senha,
    confirmarSenha: confirmarSenha
  };

  try {
    // Envia os dados para a API do Arboriza.
    const resposta = await fetch('/api/contas/funcionarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosCadastro)
    });

    // Interpreta a resposta do backend.
    const textoResposta = await resposta.text();

    let resultado = {};

    try {
      resultado = textoResposta ? JSON.parse(textoResposta) : {};
    } catch {
      resultado = { mensagem: textoResposta };
    }

    // Trata respostas de erro.
    if (!resposta.ok) {
      throw new Error(
        resultado.erro ||
        resultado.mensagem ||
        resultado.message ||
        'Não foi possível realizar o cadastro.'
      );
    }

    // Exibe a notificacao de sucesso.
    toastBody.textContent =
      resultado.mensagem || 'Cadastro realizado com sucesso!';

    const toast = bootstrap.Toast.getOrCreateInstance(toastElement, {
      delay: 5000
    });

    toast.show();

    // Limpa o formulario depois do cadastro.
    registerForm.reset();

    atualizarCampoOutroSetor();
    limparErros();

    message.textContent = '';
    message.className = 'form-message';

  } catch (erro) {
    // Exibe o erro sem apagar os dados preenchidos.
    message.textContent = erro.message;
    message.classList.add('error');

    console.error('Erro ao cadastrar funcionário:', erro);
  }
});

// Estado inicial do campo condicional.
atualizarCampoOutroSetor();
