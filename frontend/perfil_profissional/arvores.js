// Autor: Gabrielle Mota

/*
 * Arboriza - Gestão de Árvores
 *
 * Integração do frontend com a API REST do Javalin.
 * Os dados agora são obtidos do MongoDB.
 */

(() => {

  let municipioIdFuncionario = null;
  let municipioNomeFuncionario = "";

  const el = id => document.getElementById(id);

  // Evita interpretar texto vindo do banco como HTML.
  const escapeHtml = value => String(value ?? "")
    .replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  // Facilita pesquisas sem diferenciar maiúsculas e acentos.
  const normalizar = value => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  let arvores = [];
  let arvoreSelecionada = null;
  let fotosDaArvore = [];
  let indiceFotoAtual = 0;
  let abaAtiva = "orders";
  let requisicaoOrdensDaArvore = 0;
  let toastTimer;

  const riscos = {
    BAIXO: "Baixo",
    MODERADO: "Moderado",
    ALTO: "Alto",
    CRITICO: "Crítico"
  };

  const classesRisco = {
    BAIXO: "low", MODERADO: "moderate", ALTO: "high", CRITICO: "critical"
  };

  // ========================================
  // COMUNICAÇÃO COM A API
  // ========================================

  async function requisicao(caminho, opcoes = {}) {

    const resposta = await fetch(caminho, {
      credentials: "same-origin",
      ...opcoes,
      headers: {
        ...(opcoes.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...(opcoes.headers || {})
      }
    });

    const texto = await resposta.text();

    let dados;

    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch {
      dados = null;
    }

    if (!resposta.ok) {
      throw new Error(
        dados?.erro ||
        `Falha na API (HTTP ${resposta.status}).`
      );
    }

    return dados;
  }

  // ========================================
  // AVISOS E MODAIS
  // ========================================

  function mostrarAviso(mensagem, erro = false) {

    const toast = el("treesToast");

    toast.className =
      `trees-toast ${erro ? "toast-error" : ""}`;

    toast.querySelector("span").textContent = mensagem;

    toast.querySelector("i").className = erro
      ? "bi bi-exclamation-circle-fill"
      : "bi bi-check-circle-fill";

    toast.hidden = false;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 4500);
  }

  function abrirModal(modal) {

    modal.hidden = false;

    document.body.classList.add("modal-open");

    modal.querySelector(
      "input:not([disabled]), button:not([disabled])"
    )?.focus();
  }

  function fecharModal(modal) {

    modal.hidden = true;

    const algumAberto = [
      "treeDetailsModal",
      "createTreeModal",
      "editTreeModal"
    ].some(id => !el(id).hidden);

    if (!algumAberto) {
      document.body.classList.remove("modal-open");
    }
  }

  function formatarData(valor) {

    if (!valor) return "Não registrada";

    const data = new Date(valor);

    return Number.isNaN(data.getTime())
      ? "Não registrada"
      : data.toLocaleDateString("pt-BR");
  }

  // ========================================
  // LISTAGEM E FILTROS
  // ========================================

  function renderizarTabela() {

    const busca = normalizar(
      el("treeSearchInput").value.trim()
    );

    const filtro = normalizar(
      el("treeRiskFilter").value
    );

    const lista = arvores.filter(arvore => {

      const conteudo = normalizar([
        arvore.id,
        arvore.codigoArv,
        arvore.nomePopular,
        arvore.nomeCientifico,
        arvore.especie,
        arvore.bairro,
        arvore.endereco
      ].join(" "));

      const risco = normalizar(arvore.risco);

      const filtraRisco = !filtro || risco === filtro;

      return conteudo.includes(busca) && filtraRisco;
    });

    if (el("treeSortOrder").value === "alphabetical") {
      lista.sort((a, b) => String(a.nomePopular || "")
        .localeCompare(String(b.nomePopular || ""), "pt-BR", { sensitivity: "base" }));
    }

    el("treesTableBody").innerHTML = lista.map(arvore => {

      const risco = arvore.risco || "";
      const ativa = arvore.ativa !== false;

      return `
        <tr>
          <td>
            <button
              class="tree-id-link"
              type="button"
              data-open-tree="${escapeHtml(arvore.id)}"
              title="${escapeHtml(arvore.codigoArv || arvore.id)}">
              ${escapeHtml(arvore.codigoArv || String(arvore.id).slice(0, 12))}
            </button>
          </td>

          <td>
            <strong>${escapeHtml(arvore.nomePopular || "Não informado")}</strong>
          </td>

          <td>
            ${escapeHtml(arvore.bairro || "Não informado")}
          </td>

          <td>
            <span class="tree-risk-badge ${classesRisco[risco] || "low"}">
              ${escapeHtml(riscos[risco] || "Não informado")}
            </span>
          </td>

          <td>
            <span class="tree-occurrence-badge ${ativa ? "completed" : "stopped"}">
              ${ativa ? "Ativa" : "Arquivada"}
            </span>
          </td>
        </tr>
      `;
    }).join("");

    el("treeResultCount").textContent =
      `${lista.length} ${
        lista.length === 1
          ? "árvore encontrada"
          : "árvores encontradas"
      }`;

    el("treesEmpty").hidden = lista.length > 0;

    document.querySelector(
      ".trees-table-scroll"
    ).hidden = lista.length === 0;
  }

  // Busca as árvores do MongoDB através do backend.
  async function carregarArvores() {

    el("treeResultCount").textContent =
      "Carregando árvores...";

    const sessao = await requisicao("/api/contas/sessao");
    municipioIdFuncionario = String(sessao.municipioId || "").toLowerCase();
    municipioNomeFuncionario = typeof sessao.municipioNome === "string" ? sessao.municipioNome.trim() : "";
    if (!municipioIdFuncionario) {
      throw new Error("O município do funcionário não está disponível na sessão.");
    }
    el("treeMunicipality").textContent = municipioNomeFuncionario || "Município de atuação";

    const registros = await requisicao("/api/arvores");

    if (!Array.isArray(registros)) {
      throw new Error(
        "A API não retornou uma lista de árvores."
      );
    }

    arvores = registros.filter(
      arvore => String(arvore.municipioId || "").toLowerCase() === municipioIdFuncionario
    );

    renderizarTabela();
  }

  // ========================================
  // FICHA DA ÁRVORE
  // ========================================

  function ficha(arvore) {

    arvoreSelecionada = arvore;

    el("treeDetailsCode").textContent = arvore.codigoArv || "Código não informado";
    el("treeDetailsTitle").textContent =
      arvore.nomePopular || arvore.especie || "Árvore";

    const dados = [
      ["Código", arvore.codigoArv],
      ["ObjectId", arvore.id],
      ["Nome popular", arvore.nomePopular],
      ["Nome científico", arvore.nomeCientifico],
      ["Espécie", arvore.especie],
      ["Endereço", arvore.endereco],
      ["Bairro", arvore.bairro],
      ["Latitude", arvore.latitude],
      ["Longitude", arvore.longitude],
      ["Idade estimada", arvore.idade],
      ["Altura (m)", arvore.alturaMetros],
      ["Diâmetro (cm)", arvore.diametroCm],
      ["Estado", arvore.estado],
      ["Risco", riscos[arvore.risco] || arvore.risco],
      ["Situação", arvore.ativa === false ? "Arquivada" : "Ativa"],
      ["Última poda", formatarData(arvore.ultimaPoda)],
      ["Última vistoria", formatarData(arvore.ultimaInspecao)],
      ["Próxima manutenção", formatarData(arvore.proximaManutencao)]
    ];

    el("treeInfoList").innerHTML = dados.map(
      ([campo, valor]) => `
        <div class="tree-info-row">
          <dt>${escapeHtml(campo)}</dt>
          <dd>${escapeHtml(valor ?? "Não informado")}</dd>
        </div>
      `
    ).join("");

    const botao = el("showDeleteTree");

    const arquivada = arvore.ativa === false;

    botao.innerHTML = `
      <i class="bi bi-${arquivada ? "arrow-counterclockwise" : "archive"}"></i>
      ${arquivada ? "Reativar árvore" : "Arquivar árvore"}
    `;

    fotosDaArvore = (Array.isArray(arvore.fotos) ? arvore.fotos : [])
      .filter(foto => typeof foto === "string" && foto.trim())
      .map(foto => foto.trim());
    el("treePhotoCount").textContent = fotosDaArvore.length
      ? `(${fotosDaArvore.length})`
      : "";
    el("openTreePhotos").disabled = false;

    abaAtiva = "orders";

    renderizarAba();
  }

  function renderizarAba() {

    document.querySelectorAll(
      "[data-tree-tab]"
    ).forEach(botao => {

      const ativa =
        botao.dataset.treeTab === abaAtiva;

      botao.classList.toggle("active", ativa);

      botao.setAttribute(
        "aria-selected",
        String(ativa)
      );
    });

    if (abaAtiva === "orders") {
      carregarOrdensDaArvore();
      return;
    }
    if (abaAtiva === "history") {
      carregarHistoricoDaArvore();
      return;
    }

    el("treeRelatedContent").innerHTML = `
      <div class="tree-related-empty">
        <i class="bi bi-info-circle"></i>
        <span>
          Esta aba ainda não está integrada à API correspondente.
        </span>
      </div>
    `;
  }

  async function carregarHistoricoDaArvore() {
    const arvore = arvoreSelecionada;
    if (!arvore) return;
    const request = ++requisicaoOrdensDaArvore;
    const content = el("treeRelatedContent");
    content.innerHTML = `
      <div class="tree-related-empty">
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        <span>Carregando histórico...</span>
      </div>
    `;

    try {
      const resposta = await requisicao(`/api/intervencoes?arvoreId=${encodeURIComponent(arvore.id)}`);
      const historico = (Array.isArray(resposta?.intervencoes) ? resposta.intervencoes : [])
        .slice()
        .sort((a, b) => new Date(a.dataExecucao || a.dataCriacao || 0)
          - new Date(b.dataExecucao || b.dataCriacao || 0));
      if (request !== requisicaoOrdensDaArvore || abaAtiva !== "history"
          || arvoreSelecionada?.id !== arvore.id) return;

      if (!historico.length) {
        content.innerHTML = `
          <div class="tree-related-empty">
            <i class="bi bi-clock-history" aria-hidden="true"></i>
            <span>Não possui histórico salvo.</span>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <ol class="tree-history-timeline" aria-label="Histórico de intervenções da árvore">
          ${historico.map(item => `
            <li class="tree-history-entry">
              <time>${escapeHtml(formatarData(item.dataExecucao || item.dataCriacao))}</time>
              <div class="tree-history-card">
                <strong>${escapeHtml(item.tipo || "Intervenção")}</strong>
                ${item.descricao ? `<p>${escapeHtml(item.descricao)}</p>` : ""}
              </div>
            </li>
          `).join("")}
        </ol>
      `;
    } catch (erro) {
      if (request !== requisicaoOrdensDaArvore) return;
      content.innerHTML = `
        <div class="tree-related-empty tree-related-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span>${escapeHtml(erro.message || "Não foi possível carregar o histórico da árvore.")}</span>
        </div>
      `;
    }
  }

  async function carregarOrdensDaArvore() {
    const arvore = arvoreSelecionada;
    if (!arvore) return;
    const request = ++requisicaoOrdensDaArvore;
    const content = el("treeRelatedContent");
    content.innerHTML = `
      <div class="tree-related-empty">
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        <span>Carregando ordens de serviço...</span>
      </div>
    `;

    try {
      const resposta = await requisicao("/api/ordens-servico");
      const ordens = (Array.isArray(resposta?.ordens) ? resposta.ordens : [])
        .filter(ordem => String(ordem.arvoreId || "").toLowerCase() === String(arvore.id).toLowerCase())
        .sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));
      if (request !== requisicaoOrdensDaArvore || abaAtiva !== "orders"
          || arvoreSelecionada?.id !== arvore.id) return;

      if (!ordens.length) {
        content.innerHTML = `
          <div class="tree-related-empty">
            <i class="bi bi-clipboard-check" aria-hidden="true"></i>
            <span>Nenhuma ordem de serviço vinculada a esta árvore.</span>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="tree-related-table-wrap">
          <table class="tree-related-table">
            <thead><tr>
              <th>Código da ordem</th><th>Tipo de ocorrência</th><th>Equipe</th><th>Status</th><th>Data</th>
            </tr></thead>
            <tbody>${ordens.map(ordem => `
              <tr>
                <td><strong>${escapeHtml(ordem.codigo || ordem.id || "Não informado")}</strong></td>
                <td>${escapeHtml(ordem.titulo || "Não informado")}</td>
                <td>${escapeHtml(ordem.equipeNome || "Não atribuída")}</td>
                <td>${escapeHtml(ordem.status || "Não informado")}</td>
                <td>${escapeHtml(formatarData(ordem.dataCriacao))}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        </div>
      `;
    } catch (erro) {
      if (request !== requisicaoOrdensDaArvore) return;
      content.innerHTML = `
        <div class="tree-related-empty tree-related-error">
          <i class="bi bi-exclamation-circle" aria-hidden="true"></i>
          <span>${escapeHtml(erro.message || "Não foi possível carregar as ordens de serviço.")}</span>
        </div>
      `;
    }
  }

  function exibirFotoAtual() {
    el("treeMainPhoto").src = fotosDaArvore[indiceFotoAtual];
    el("treeMainPhoto").alt = `Foto ${indiceFotoAtual + 1} da árvore`;
    el("treePhotoViewerCount").textContent =
      `${indiceFotoAtual + 1} de ${fotosDaArvore.length}`;
    el("previousTreePhoto").hidden = fotosDaArvore.length < 2;
    el("nextTreePhoto").hidden = fotosDaArvore.length < 2;
  }

  el("openTreePhotos").addEventListener("click", () => {
    if (!fotosDaArvore.length) {
      mostrarAviso("Não existem fotos anexadas a esta árvore.");
      return;
    }
    indiceFotoAtual = 0;
    exibirFotoAtual();
    el("treePhotoViewer").hidden = false;
  });

  el("closeTreePhotoViewer").addEventListener("click", () => {
    el("treePhotoViewer").hidden = true;
    el("treeMainPhoto").removeAttribute("src");
  });

  el("previousTreePhoto").addEventListener("click", () => {
    indiceFotoAtual = (indiceFotoAtual - 1 + fotosDaArvore.length) % fotosDaArvore.length;
    exibirFotoAtual();
  });

  el("nextTreePhoto").addEventListener("click", () => {
    indiceFotoAtual = (indiceFotoAtual + 1) % fotosDaArvore.length;
    exibirFotoAtual();
  });

  // ========================================
  // FORMULÁRIOS
  // ========================================

  function payloadDoFormulario(form, original = {}) {

    const v = form.elements;
    const dadosOriginais = { ...original };
    delete dadosOriginais.latitude;
    delete dadosOriginais.longitude;

    if (original && original.id) {
      return {
        ...dadosOriginais,
        idade: v.idade.value.trim(),
        alturaMetros: v.alturaMetros.value === ""
          ? null : Number(v.alturaMetros.value),
        diametroCm: v.diametroCm.value === ""
          ? null : Number(v.diametroCm.value),
        estado: v.estado.value,
        risco: v.risco.value,
        manutencao: v.manutencao.value === "true"
      };
    }

    return {
      ...dadosOriginais,

      municipioId:
        original.municipioId || municipioIdFuncionario,

      nomePopular: v.nomePopular.value.trim(),
      nomeCientifico: v.nomeCientifico.value.trim(),
      especie: v.especie.value.trim(),
      endereco: v.endereco.value.trim(),
      numero: v.numero.value.trim() || null,
      bairro: v.bairro.value.trim(),

      idade: v.idade.value.trim(),
      alturaMetros: v.alturaMetros.value === ""
        ? null : Number(v.alturaMetros.value),
      diametroCm: v.diametroCm.value === ""
        ? null : Number(v.diametroCm.value),

      estado: v.estado.value,
      risco: v.risco.value,

      frutifera: v.frutifera.value === "true",
      manutencao: v.manutencao.value === "true",
      floracao: v.floracao.value === "true"
    };
  }

  function preencherFormulario(form, arvore) {

    [
      "idade",
      "alturaMetros",
      "diametroCm",
      "estado",
      "risco"
    ].forEach(campo => {

      form.elements[campo].value =
        arvore[campo] ?? "";
    });

    // Suporta estados já salvos com um nome não incluído no select,
    // como "Bom", sem apagar esse dado durante a edição.
    const seletorEstado = form.elements.estado;
    const estadoAntigo = seletorEstado.querySelector("[data-estado-antigo]");
    if (estadoAntigo) estadoAntigo.remove();
    if (arvore.estado && ![...seletorEstado.options]
        .some(opcao => opcao.value === arvore.estado)) {
      const opcao = new Option(arvore.estado, arvore.estado);
      opcao.dataset.estadoAntigo = "true";
      seletorEstado.add(opcao);
    }
    seletorEstado.value = arvore.estado || "";

    form.elements.manutencao.value = String(Boolean(arvore.manutencao));
  }

  function validarFormulario(form) {
    return form.reportValidity();
  }

  // Executa POST ou PUT.
  async function enviarFormulario(
    form,
    caminho,
    metodo,
    original
  ) {

    if (!validarFormulario(form)) return;

    const botao = form.querySelector(
      'button[type="submit"]'
    );

    botao.disabled = true;

    try {

      const salva = await requisicao(caminho, {
        method: metodo,
        body: JSON.stringify(
          payloadDoFormulario(form, original)
        )
      });

      await carregarArvores();

      fecharModal(
        el(metodo === "POST"
          ? "createTreeModal"
          : "editTreeModal")
      );

      fecharModal(el("treeDetailsModal"));

      if (metodo === "POST") {
        form.reset();
      }

      const acao = metodo === "POST"
        ? "Árvore cadastrada no banco de dados."
        : "Árvore atualizada no MongoDB!";
      const temCoordenadas = Number.isFinite(salva?.latitude)
        && Number.isFinite(salva?.longitude);
      mostrarAviso(temCoordenadas
        ? acao
        : `${acao} O endereço não foi localizado; ela foi salva sem marcador no mapa.`);

    } catch (erro) {

      console.error(erro);
      mostrarAviso(erro.message, true);

    } finally {

      botao.disabled = false;
    }
  }

  // ========================================
  // EVENTOS DA TELA
  // ========================================

  // Pesquisa e filtros.
  el("treeSearchInput").addEventListener(
    "input",
    renderizarTabela
  );

  el("treeRiskFilter").addEventListener(
    "change",
    renderizarTabela
  );

  el("treeSortOrder").addEventListener(
    "change",
    renderizarTabela
  );

  // Abre formulário de cadastro.
  el("openCreateTree").addEventListener(
    "click",
    () => abrirModal(el("createTreeModal"))
  );

  // Consulta uma árvore pelo ID.
  el("treesTableBody").addEventListener(
    "click",
    async evento => {

      const botao = evento.target.closest(
        "[data-open-tree]"
      );

      if (!botao) return;

      try {

        const arvore = await requisicao(
          `/api/arvores/${encodeURIComponent(botao.dataset.openTree)}`
        );

        ficha(arvore);

        abrirModal(el("treeDetailsModal"));

      } catch (erro) {

        mostrarAviso(erro.message, true);
      }
    }
  );

  // Alternar abas da ficha.
  document.querySelectorAll(
    "[data-tree-tab]"
  ).forEach(botao => {

    botao.addEventListener("click", () => {

      abaAtiva = botao.dataset.treeTab;

      renderizarAba();
    });
  });

  // ========================================
  // CADASTRO
  // ========================================

  el("createTreeForm").addEventListener(
    "submit",
    evento => {

      evento.preventDefault();

      enviarFormulario(
        evento.currentTarget,
        "/api/arvores",
        "POST",
        {}
      );
    }
  );

  // ========================================
  // EDIÇÃO
  // ========================================

  el("editTreeButton").addEventListener(
    "click",
    () => {

      if (!arvoreSelecionada) return;

      preencherFormulario(
        el("editTreeForm"),
        arvoreSelecionada
      );

      fecharModal(el("treeDetailsModal"));

      abrirModal(el("editTreeModal"));
    }
  );

  el("editTreeForm").addEventListener(
    "submit",
    evento => {

      evento.preventDefault();

      if (!arvoreSelecionada) return;

      enviarFormulario(
        evento.currentTarget,
        `/api/arvores/${encodeURIComponent(arvoreSelecionada.id)}`,
        "PUT",
        arvoreSelecionada
      );
    }
  );

  // ========================================
  // ARQUIVAMENTO E REATIVAÇÃO
  // ========================================

  el("showDeleteTree").addEventListener(
    "click",
    async () => {

      if (!arvoreSelecionada) return;

      const ativar =
        arvoreSelecionada.ativa === false;

      const acao = ativar
        ? "reativar"
        : "arquivar";

      let motivo = null;
      if (!ativar) {
        motivo = window.prompt(`Informe o motivo para desativar a árvore ${arvoreSelecionada.nomePopular}:`);
        if (motivo === null) return;
        motivo = motivo.trim();
        if (!motivo) {
          mostrarAviso("Informe o motivo para desativar a árvore.", true);
          return;
        }
        if (motivo.length > 500) {
          mostrarAviso("O motivo deve ter no máximo 500 caracteres.", true);
          return;
        }
      }

      const confirmar = window.confirm(
        ativar
          ? `Deseja realmente reativar a árvore ${arvoreSelecionada.nomePopular}?`
          : `Deseja mesmo arquivar a árvore ${arvoreSelecionada.nomePopular}?\n\nMotivo: ${motivo}`
      );

      if (!confirmar) return;

      try {

        await requisicao(
          `/api/arvores/${encodeURIComponent(arvoreSelecionada.id)}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ativa: ativar,
              motivo
            })
          }
        );

        await carregarArvores();

        fecharModal(el("treeDetailsModal"));

        mostrarAviso(
          `Árvore ${
            ativar ? "reativada" : "arquivada"
          } com sucesso!`
        );

      } catch (erro) {

        console.error(erro);

        mostrarAviso(erro.message, true);
      }
    }
  );

  // ========================================
  // REGISTRO DE INTERVENÇÃO
  // ========================================

  el("startInterventionButton").addEventListener("click", () => {
    if (!arvoreSelecionada) return;
    const form = el("newInterventionForm");
    form.reset();
    form.elements.municipioId.value = municipioNomeFuncionario;
    form.elements.arvoreNome.value = `${arvoreSelecionada.codigoArv || ""} ${arvoreSelecionada.nomePopular || arvoreSelecionada.especie || "Árvore"}`.trim();
    form.elements.endereco.value = arvoreSelecionada.endereco || "";
    form.elements.numero.value = arvoreSelecionada.numero || "";
    form.elements.bairro.value = arvoreSelecionada.bairro || "";
    el("newInterventionFeedback").textContent = municipioNomeFuncionario
      ? ""
      : "Não foi possível identificar o município de atuação da sua conta.";
    abrirModal(el("newInterventionModal"));
    form.elements.tipoProblema.focus();
  });

  el("newInterventionForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!arvoreSelecionada || !validarFormulario(event.currentTarget)) return;
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const feedback = el("newInterventionFeedback");
    if (!municipioNomeFuncionario) {
      feedback.textContent = "Não foi possível identificar o município de atuação da sua conta.";
      return;
    }
    submitButton.disabled = true;
    feedback.textContent = "Registrando ocorrência...";
    try {
      const resultado = await requisicao("/api/ocorrencias", {
        method: "POST",
        body: JSON.stringify({
          tipoProblema: form.elements.tipoProblema.value,
          localizacao: arvoreSelecionada.endereco,
          numero: arvoreSelecionada.numero || null,
          bairro: arvoreSelecionada.bairro,
          descricao: form.elements.descricao.value.trim(),
          prioridade: form.elements.prioridade.value,
          municipioId: municipioNomeFuncionario,
          arvoreId: arvoreSelecionada.id
        })
      });
      const protocolo = resultado?.protocolo;
      if (!protocolo) throw new Error("A ocorrência foi enviada, mas não foi possível confirmar o registro.");
      fecharModal(el("newInterventionModal"));
      mostrarAviso(`Ocorrência ${protocolo} registrada e vinculada à árvore ${arvoreSelecionada.codigoArv}.`);
    } catch (erro) {
      feedback.textContent = erro.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  // FECHAMENTO DOS MODAIS
  // ========================================

  document.querySelectorAll(
    "[data-close-modal]"
  ).forEach(botao => {

    botao.addEventListener(
      "click",
      () => fecharModal(
        botao.closest(".tree-modal-backdrop")
      )
    );
  });

  document.querySelectorAll(
    ".tree-modal-backdrop"
  ).forEach(modal => {

    modal.addEventListener(
      "click",
      evento => {

        if (evento.target === modal) {
          fecharModal(modal);
        }
      }
    );
  });

  document.addEventListener(
    "keydown",
    evento => {

      if (el("treePhotoViewer").hidden === false) {
        if (evento.key === "Escape") {
          el("closeTreePhotoViewer").click();
        } else if (evento.key === "ArrowLeft" && fotosDaArvore.length > 1) {
          el("previousTreePhoto").click();
        } else if (evento.key === "ArrowRight" && fotosDaArvore.length > 1) {
          el("nextTreePhoto").click();
        }
        return;
      }

      if (evento.key !== "Escape") return;

      const aberto = [
        "editTreeModal",
        "createTreeModal",
        "treeDetailsModal"
      ]
        .map(el)
        .find(modal => !modal.hidden);

      if (aberto) {
        fecharModal(aberto);
      }
    }
  );

  // ========================================
  // INICIALIZAÇÃO
  // ========================================

  carregarArvores().catch(erro => {

    console.error(
      "Erro ao consultar as árvores:",
      erro
    );

    arvores = [];
    renderizarTabela();
    el("treeResultCount").textContent = "Falha ao carregar dados";
    mostrarAviso(erro.message, true);
  });

})();
