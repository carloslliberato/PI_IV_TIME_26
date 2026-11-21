// Autor: Gabrielle Mota

// Prepara os controles do cadastro quando o DOM estiver disponivel.
function initializeCitizenSignup() {
  // Guarda referencias aos campos e ao aviso de sucesso usados na tela.
  const form = document.getElementById("citizenSignupForm");
  const toastElement = document.getElementById("citizenToast");
  const toastBody = toastElement.querySelector(".toast-body");
  const successToast = bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4500 });

  const password = document.getElementById("citizenPassword");
  const passwordConfirm = document.getElementById("citizenPasswordConfirm");
  const passwordConfirmFeedback = document.getElementById("citizenPasswordConfirmFeedback");

  // Compara as senhas e atualiza a mensagem de validacao da confirmacao.
  function validatePasswordMatch() {
    const matches = password.value === passwordConfirm.value;
    passwordConfirm.setCustomValidity(matches ? "" : "As senhas não coincidem.");

    passwordConfirmFeedback.textContent = passwordConfirm.value && !matches
      ? "As senhas não coincidem."
      : "Confirme sua senha.";

    return matches;
  }

  password.addEventListener("input", validatePasswordMatch);
  passwordConfirm.addEventListener("input", validatePasswordMatch);

  // Formata o telefone durante a digitacao e limita a entrada a 11 numeros.
  const phone = document.getElementById("citizenPhone");

  phone.addEventListener("input", () => {
    const digits = phone.value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 10) {
      phone.value = digits
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      phone.value = digits.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
    }
  });

  // Intercepta o envio para validar e enviar os dados ao backend.
  form.addEventListener("submit", async event => {
    event.preventDefault();

    form.classList.add("was-validated");
    validatePasswordMatch();

    // Usa as regras HTML dos campos e move o foco ao primeiro campo invalido.
    if (!form.checkValidity()) {
      form.querySelector(":invalid")?.focus();
      return;
    }

    // Monta o objeto com os campos esperados pelo CadastroContaDTO.
    const dadosCadastro = {
      nome: document.getElementById("citizenName").value.trim(),
      email: document.getElementById("citizenEmail").value.trim(),
      telefone: phone.value.replace(/\D/g, ""),
      senha: password.value,
      confirmarSenha: passwordConfirm.value,
      municipio: document.getElementById("citizenMunicipality").value
    };

    try {
      // Envia os dados para a rota de cadastro de cidadao.
      const resposta = await fetch("/api/contas/cidadaos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dadosCadastro)
      });

      const textoResposta = await resposta.text();
      let resultado = {};

      try {
        resultado = textoResposta ? JSON.parse(textoResposta) : {};
      } catch {
        resultado = { mensagem: textoResposta };
      }

      // Trata respostas de erro enviadas pelo backend.
      if (!resposta.ok) {
        throw new Error(
          resultado.mensagem ||
          resultado.message ||
          resultado.erro ||
          resultado.details ||
          "Não foi possível realizar o cadastro."
        );
      }

      // Cadastro concluido com sucesso.
      // Cadastro concluido com sucesso.
      toastBody.textContent =
        resultado.mensagem || "Cadastro realizado com sucesso!";

      successToast.show();

      form.reset();
      passwordConfirm.setCustomValidity("");
      form.classList.remove("was-validated");

    } catch (erro) {
      // Informa o erro sem apagar os dados preenchidos.
      alert(erro.message || "Não foi possível conectar ao servidor.");
    }
  });
}

// Aguarda o DOM ou inicializa imediatamente se ele ja estiver pronto.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCitizenSignup, { once: true });
} else {
  initializeCitizenSignup();
}
