function initializeCitizenSignup() {
  const form = document.getElementById("citizenSignupForm");
  const notificationToggle = document.getElementById("wantsNotifications");
  const preferencesPanel = document.getElementById("notificationPreferences");
  const preferencesHint = document.getElementById("preferencesHint");
  const preferenceInputs = [...document.querySelectorAll('input[name="preferencias"]')];
  const toastElement = document.getElementById("citizenToast");
  const successToast = bootstrap.Toast.getOrCreateInstance(toastElement, { delay: 4500 });

  function togglePreferences() {
    const enabled = notificationToggle.checked;
    preferencesPanel.classList.toggle("d-none", !enabled);
    preferenceInputs.forEach(input => { input.required = false; });
    if (!enabled) {
      preferenceInputs.forEach(input => { input.checked = false; });
      preferencesHint.classList.add("d-none");
    }
  }

  notificationToggle.addEventListener("change", togglePreferences);
  preferenceInputs.forEach(input => input.addEventListener("change", () => {
    const anySelected = preferenceInputs.some(option => option.checked);
    preferencesHint.classList.toggle("d-none", !notificationToggle.checked || anySelected);
  }));

  const password = document.getElementById("citizenPassword");
  const passwordConfirm = document.getElementById("citizenPasswordConfirm");
  const passwordConfirmFeedback = document.getElementById("citizenPasswordConfirmFeedback");

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

  const phone = document.getElementById("citizenPhone");
  phone.addEventListener("input", () => {
    const digits = phone.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      phone.value = digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      phone.value = digits.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
    }
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    form.classList.add("was-validated");
    validatePasswordMatch();

    if (!form.checkValidity()) {
      form.querySelector(":invalid")?.focus();
      return;
    }

    if (notificationToggle.checked && !preferenceInputs.some(input => input.checked)) {
      preferencesHint.classList.remove("d-none");
      preferencesHint.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Protótipo: validação local. A senha ainda não é enviada à API nem persistida.
    successToast.show();
    form.reset();
    passwordConfirm.setCustomValidity("");
    form.classList.remove("was-validated");
    togglePreferences();
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCitizenSignup, { once: true });
} else {
  initializeCitizenSignup();
}
