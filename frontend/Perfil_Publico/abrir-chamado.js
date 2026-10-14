// Arboriza — formulário demonstrativo para abertura de chamado.
// A integração com a API Java será feita posteriormente.

function initializeReportForm() {
  const form = document.getElementById("reportForm");
  const wantsNotifications = document.getElementById("wantsReportNotifications");
  const notificationFields = document.getElementById("reportNotificationFields");
  const nameInput = document.getElementById("reportContactName");
  const emailInput = document.getElementById("reportContactEmail");
  const phoneInput = document.getElementById("reportContactPhone");
  const imageInput = document.getElementById("reportImage");
  const imagePreviewWrap = document.getElementById("imagePreviewWrap");
  const imagePreview = document.getElementById("imagePreview");
  const imageFileName = document.getElementById("imageFileName");
  const imageFileSize = document.getElementById("imageFileSize");
  const imageError = document.getElementById("imageError");
  const uploadArea = document.getElementById("uploadArea");

  // FUTURO BACK-END: quando existir sessão autenticada, consultar o perfil do cidadão.
  // Exemplo de integração (ajustar endpoint e nomes conforme a API Java):
  // const token = localStorage.getItem("token");
  // if (token) {
  //   fetch("http://localhost:8080/api/cidadaos/me", {
  //     headers: { Authorization: `Bearer ${token}` }
  //   })
  //   .then(response => { if (!response.ok) throw new Error("Falha ao carregar perfil"); return response.json(); })
  //   .then(cidadao => {
  //     nameInput.value = cidadao.nomeCompleto || "";
  //     emailInput.value = cidadao.email || "";
  //     phoneInput.value = cidadao.telefone || "";
  //     // Evita edição quando os dados vierem do perfil autenticado, se essa for a regra de negócio.
  //     nameInput.readOnly = true;
  //     emailInput.readOnly = true;
  //     phoneInput.readOnly = true;
  //     form.dataset.loggedIn = "true";
  //   })
  //   .catch(error => console.error("Não foi possível carregar o perfil do cidadão:", error));
  // }

  function toggleNotificationFields() {
    const enabled = wantsNotifications.checked;
    notificationFields.classList.toggle("d-none", !enabled);
    [nameInput, emailInput, phoneInput].forEach(input => {
      input.disabled = !enabled;
      input.required = enabled;
      if (!enabled) input.classList.remove("is-invalid");
    });

    // FUTURO BACK-END: se a pessoa estiver autenticada, buscar os dados do perfil ao ativar notificações.
    // Evite confiar apenas em dados guardados no navegador; o back-end deve validar a sessão.
  }

  wantsNotifications.addEventListener("change", toggleNotificationFields);
  toggleNotificationFields();

  // Máscara simples de telefone para facilitar o preenchimento.
  phoneInput.addEventListener("input", () => {
    if (phoneInput.disabled || phoneInput.readOnly) return;
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      phoneInput.value = digits.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `(${a}${a.length === 2 ? ") " : ""}${b || ""}${c ? "-" + c : ""}`);
    } else {
      phoneInput.value = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    }
  });

  function formatBytes(bytes) {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  imageInput.addEventListener("change", () => {
    imageError.classList.add("d-none");
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type) || file.size > 8 * 1024 * 1024) {
      imageInput.value = "";
      imageError.classList.remove("d-none");
      imagePreviewWrap.classList.add("d-none");
      uploadArea.classList.remove("d-none");
      return;
    }
    imagePreview.src = URL.createObjectURL(file);
    imageFileName.textContent = file.name;
    imageFileSize.textContent = formatBytes(file.size);
    imagePreviewWrap.classList.remove("d-none");
    uploadArea.classList.add("d-none");
  });

  document.getElementById("removeImage").addEventListener("click", () => {
    if (imagePreview.src.startsWith("blob:")) URL.revokeObjectURL(imagePreview.src);
    imageInput.value = "";
    imagePreview.removeAttribute("src");
    imagePreviewWrap.classList.add("d-none");
    uploadArea.classList.remove("d-none");
    imageError.classList.add("d-none");
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    form.classList.add("was-validated");
    let valid = form.checkValidity();

    if (wantsNotifications.checked) {
      const phoneDigits = phoneInput.value.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        phoneInput.setCustomValidity("Informe um telefone válido.");
        valid = false;
      } else {
        phoneInput.setCustomValidity("");
      }
      [nameInput, emailInput, phoneInput].forEach(input => {
        if (!input.checkValidity()) valid = false;
      });
    }

    if (!valid) {
      form.reportValidity();
      return;
    }

    // FUTURO BACK-END: enviar FormData à API Java (inclui o arquivo anexado).
    // Exemplo:
    // const formData = new FormData(form);
    // const token = localStorage.getItem("token");
    // const response = await fetch("http://localhost:8080/api/ocorrencias", {
    //   method: "POST",
    //   headers: token ? { Authorization: `Bearer ${token}` } : {},
    //   body: formData
    // });
    // if (!response.ok) { alert("Não foi possível enviar o chamado. Tente novamente."); return; }

    // Modo demonstrativo: não persiste a ocorrência no banco de dados.
    alert("Chamado enviado com sucesso, agradecemos a colaboração.");
    window.location.href = "index.html";
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeReportForm, { once: true });
} else {
  initializeReportForm();
}
