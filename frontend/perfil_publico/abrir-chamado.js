// feito por Sophia
// Arboriza — formulário de abertura de chamado integrado com a API Java (Javalin + MongoDB).

// Inicializa os controles do formulário depois que a página carregar
function initializeReportForm() {
  // Pega os elementos do HTML pelos IDs originais da tela
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

  if (!form) return;

  // Guarda o ID do cidadão caso ele esteja logado na sessão
  let cidadaoLogadoId = null;

  // Consulta o back-end para saber se o cidadão está logado e preenche nome/e-mail automaticamente
  async function carregarDadosDaSessao() {
    try {
      const response = await fetch("/api/contas/sessao");
      if (!response.ok) return;

      const sessao = await response.json();
      if (sessao && (sessao.nome || sessao.email)) {
        cidadaoLogadoId = sessao.id || sessao._id || null;
        if (nameInput && sessao.nome) nameInput.value = sessao.nome;
        if (emailInput && sessao.email) emailInput.value = sessao.email;
        if (phoneInput && sessao.telefone) phoneInput.value = sessao.telefone;
      }
    } catch (erro) {
      // Se não estiver logado, continua normalmente como cidadão anônimo
    }
  }

  // Mostra ou esconde os campos de contato (Nome, E-mail e Telefone) quando marca o checkbox
  function toggleNotificationFields() {
    const enabled = wantsNotifications.checked;
    notificationFields.classList.toggle("d-none", !enabled);
    [nameInput, emailInput, phoneInput].forEach(input => {
      input.disabled = !enabled;
      input.required = enabled;
      if (!enabled) input.classList.remove("is-invalid");
    });
  }

  // Ativa o evento de clique no checkbox de notificações
  wantsNotifications.addEventListener("change", toggleNotificationFields);
  toggleNotificationFields();
  carregarDadosDaSessao();

  // Aplica máscara automática de telefone no formato (00) 00000-0000 enquanto o usuário digita
  phoneInput.addEventListener("input", () => {
    if (phoneInput.disabled || phoneInput.readOnly) return;
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      phoneInput.value = digits.replace(
        /(\d{2})(\d{0,4})(\d{0,4})/,
        (_, a, b, c) => `(${a}${a.length === 2 ? ") " : ""}${b || ""}${c ? "-" + c : ""}`
      );
    } else {
      phoneInput.value = digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
    }
  });

  // Formata o tamanho da imagem anexada em KB ou MB
  function formatBytes(bytes) {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Converte a imagem escolhida para texto Base64 para poder salvar junto no JSON do MongoDB
  function converterImagemParaBase64(file) {
    return new Promise((resolve) => {
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // Valida se a foto anexada é JPG/PNG/WEBP de até 8MB e mostra a prévia na tela
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

  // Botão para remover a imagem selecionada
  document.getElementById("removeImage").addEventListener("click", () => {
    if (imagePreview.src.startsWith("blob:")) URL.revokeObjectURL(imagePreview.src);
    imageInput.value = "";
    imagePreview.removeAttribute("src");
    imagePreviewWrap.classList.add("d-none");
    uploadArea.classList.remove("d-none");
    imageError.classList.add("d-none");
  });

  // Pega o valor de um campo do formulário procurando pelos possíveis IDs ou nomes do HTML
  function obterValorDoCampo(seletorPrincipal, seletorAlternativo) {
    const el = form.querySelector(seletorPrincipal) || form.querySelector(seletorAlternativo);
    return el ? el.value.trim() : "";
  }

  // Quando o usuário clica em "Enviar chamado", valida tudo e envia para o back-end
  form.addEventListener("submit", async event => {
    event.preventDefault();
    form.classList.add("was-validated");
    let valid = form.checkValidity();

    // Se marcou que quer receber notificações, valida se o telefone tem 10 ou 11 dígitos
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

    // Captura os valores preenchidos nos campos de tipo, endereço, bairro e descrição
    const tipoSelecionado = obterValorDoCampo("#reportType, #tipoProblema, #tipoOcorrencia", "select");
    const enderecoDigitado = obterValorDoCampo(
      "#reportAddress, #reportLocation, #localizacao, #endereco",
      'input[type="text"]:not(#reportContactName)'
    );
    const bairroDigitado = obterValorDoCampo("#reportNeighborhood, #bairro", 'input[name*="bairro" i]');
    const descricaoDigitada = obterValorDoCampo("#reportDescription, #descricao", "textarea");
    const municipioSelecionado = obterValorDoCampo("#reportMunicipality, #municipioId", 'select[name*="municipio" i]');

    // Se o usuário anexou uma foto, converte para Base64
    const arquivoFoto = imageInput.files && imageInput.files[0];
    const imagemBase64 = await converterImagemParaBase64(arquivoFoto);

    // Monta o JSON com os exatos nomes que o CadastroOcorrenciaDTO.java espera no back-end
    const dadosChamado = {
      tipoProblema: tipoSelecionado,
      localizacao: enderecoDigitado,
      bairro: bairroDigitado,
      descricao: descricaoDigitada,
      // O nome enviado é resolvido para ObjectId pelo MunicipioRepository, como no cadastro de conta.
      municipioId: municipioSelecionado,
      cidadaoId: cidadaoLogadoId,
      imagem: imagemBase64,
      receberNotificacoes: wantsNotifications.checked,
      nomeContato: wantsNotifications.checked ? nameInput.value.trim() : null,
      emailContato: wantsNotifications.checked ? emailInput.value.trim() : null,
      telefoneContato: wantsNotifications.checked ? phoneInput.value.trim() : null
    };

    try {
      // Envia os dados para a rota POST /api/ocorrencias no Javalin
      const response = await fetch("/api/ocorrencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosChamado)
      });

      const resultado = await response.json();

      if (!response.ok) {
        alert(resultado.erro || "Não foi possível enviar o chamado. Tente novamente.");
        return;
      }

      // Exibe mensagem de sucesso com o número do protocolo gerado pelo Java e redireciona
      alert(`Chamado enviado com sucesso!\nProtocolo para acompanhamento: ${resultado.protocolo}`);
      window.location.href = "/ocorrencias-cidadao";
    } catch (erro) {
      console.error("Erro ao enviar chamado para a API:", erro);
      alert("Erro de conexão com o servidor ao registrar o chamado.");
    }
  });
}

// Inicia o script assim que o HTML terminar de carregar
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeReportForm, { once: true });
} else {
  initializeReportForm();
}
