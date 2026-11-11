
// Prepara os controles do cadastro quando o DOM estiver disponivel.
function initializeCitizenSignup() {
  // Guarda referencias aos campos, preferencias e aviso de sucesso usados na tela.
  const form = document.getElementById("citizenSignupForm");
  const notificationToggle = document.getElementById("wantsNotifications");
  const preferencesPanel = document.getElementById("notificationPreferences");
  const preferencesHint = document.getElementById("preferencesHint");
  const preferenceInputs = [...document.querySelectorAll('input[name="preferencias"]')];
  const toastElement = document.getElementById("citizenToast");
  const toastBody = toastElement.querySelector(".toast-body");
  const successToast = bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4500 });

  // Exibe as preferencias quando notificacoes estao ligadas e limpa selecoes ao desativar.
  function togglePreferences() {
    const enabled = notificationToggle.checked;
    preferencesPanel.classList.toggle("d-none", !enabled);
    preferenceInputs.forEach(input => { input.required = false; });

    if (!enabled) {
      preferenceInputs.forEach(input => { input.checked = false; });
      preferencesHint.classList.add("d-none");
    }
  }

  // Atualiza o painel sempre que a opcao principal de notificacoes muda.
  notificationToggle.addEventListener("change", togglePreferences);

  preferenceInputs.forEach(input => input.addEventListener("change", () => {
    const anySelected = preferenceInputs.some(option => option.checked);
    preferencesHint.classList.toggle("d-none", !notificationToggle.checked || anySelected);
  }));

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

    // Exige uma categoria quando a pessoa opta por receber notificacoes.
    const preferenciasSelecionadas = preferenceInputs
      .filter(input => input.checked)
      .map(input => input.value);

    if (notificationToggle.checked && preferenciasSelecionadas.length === 0) {
      preferencesHint.classList.remove("d-none");
      preferencesHint.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Monta o objeto com os campos esperados pelo CadastroContaDTO.
    const dadosCadastro = {
      nome: document.getElementById("citizenName").value.trim(),
      email: document.getElementById("citizenEmail").value.trim(),
      telefone: phone.value.replace(/\D/g, ""),
      senha: password.value,
      confirmarSenha: passwordConfirm.value,
      municipio: document.getElementById("citizenMunicipality").value,
      receberNotificacoes: notificationToggle.checked,
      preferencias: notificationToggle.checked ? preferenciasSelecionadas : []
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
      togglePreferences();

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
