
/*
 * Arboriza - Gestão de Árvores
 *
 * Integração do frontend com a API REST do Javalin.
 * Os dados agora são obtidos do MongoDB.
 */

(() => {

  // Temporário: município de Campinas para os testes.
  // Futuramente deverá vir da sessão do funcionário.
  const MUNICIPIO_ID_TESTE = "6ae666a7680e8a4330a1ab66";

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
  let abaAtiva = "occurrences";
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

  // Acrescenta filtros sem alterar o HTML/CSS existente ou a navegação.
  // Por enquanto os filtros atuam sobre os dados já recebidos da API.
  const filtrosExtras = [
    ["ativas", "Somente ativas"],
    ["arquivadas", "Somente arquivadas"],
    ["frutiferas", "Árvores frutíferas"],
    ["estado:saudavel", "Estado: Saudável"],
    ["estado:bom", "Estado: Bom"],
    ["estado:regular", "Estado: Regular"],
    ["estado:ruim", "Estado: Ruim"],
    ["estado:critico", "Estado: Crítico"]
  ];
  const seletorFiltro = el("treeRiskFilter");
  filtrosExtras.forEach(([valor, titulo]) => {
    seletorFiltro.add(new Option(titulo, valor));
  });

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
        arvore.nomePopular,
        arvore.nomeCientifico,
        arvore.especie,
        arvore.bairro,
        arvore.endereco
      ].join(" "));

      const risco = normalizar(arvore.risco);

      const filtraRisco =
        !filtro ||
        risco === filtro ||
        (filtro === "manutencao" && arvore.manutencao) ||
        (filtro === "floracao" && arvore.floracao) ||
        (filtro === "frutiferas" && arvore.frutifera) ||
        (filtro === "ativas" && arvore.ativa !== false) ||
        (filtro === "arquivadas" && arvore.ativa === false) ||
        (filtro.startsWith("estado:") &&
          normalizar(arvore.estado) === filtro.slice(7));

      return conteudo.includes(busca) && filtraRisco;
    });

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
              title="${escapeHtml(arvore.id)}">
              ${escapeHtml(String(arvore.id).slice(0, 12))}…
            </button>
          </td>

          <td>
            <strong>
              ${escapeHtml(
                arvore.nomePopular ||
                arvore.especie ||
                "Não informado"
              )}
            </strong>
            <small class="tree-scientific-cell">
              ${escapeHtml(arvore.bairro || "Bairro não informado")}
            </small>
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

    const registros = await requisicao("/api/arvores");

    if (!Array.isArray(registros)) {
      throw new Error(
        "A API não retornou uma lista de árvores."
      );
    }

    // Temporário: filtro por Campinas.
    // A restrição de município também precisa existir
    // no backend para garantir a autorização.
    arvores = registros.filter(
      arvore => arvore.municipioId === MUNICIPIO_ID_TESTE
    );

    renderizarTabela();
  }

  // ========================================
  // FICHA DA ÁRVORE
  // ========================================

  function ficha(arvore) {

    arvoreSelecionada = arvore;

    el("treeDetailsTitle").textContent =
      arvore.nomePopular || arvore.especie || "Árvore";

    const dados = [
      ["ID", arvore.id],
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

    // Fotos ainda não possuem integração com a API.
    el("treePhotoCount").textContent =
      "(integração pendente)";

    el("openTreePhotos").disabled = true;

    abaAtiva = "occurrences";

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

    el("treeRelatedContent").innerHTML = `
      <div class="tree-related-empty">
        <i class="bi bi-info-circle"></i>
        <span>
          Esta aba ainda não está integrada à API correspondente.
        </span>
      </div>
    `;
  }

  // ========================================
  // FORMULÁRIOS
  // ========================================

  function payloadDoFormulario(form, original = {}) {

    const v = form.elements;

    return {
      ...original,

      municipioId:
        original.municipioId || MUNICIPIO_ID_TESTE,

      nomePopular: v.nomePopular.value.trim(),
      nomeCientifico: v.nomeCientifico.value.trim(),
      especie: v.especie.value.trim(),
      endereco: v.endereco.value.trim(),
      bairro: v.bairro.value.trim(),

      latitude: Number(v.latitude.value),
      longitude: Number(v.longitude.value),

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
      "nomePopular",
      "nomeCientifico",
      "especie",
      "endereco",
      "bairro",
      "idade",
      "latitude",
      "longitude",
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

    [
      "frutifera",
      "manutencao",
      "floracao"
    ].forEach(campo => {

      form.elements[campo].value =
        String(Boolean(arvore[campo]));
    });
  }

  function validarFormulario(form) {

    if (!form.reportValidity()) {
      return false;
    }

    const latitude =
      Number(form.elements.latitude.value);

    const longitude =
      Number(form.elements.longitude.value);

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      mostrarAviso(
        "Latitude ou longitude fora dos limites permitidos.",
        true
      );

      return false;
    }

    return true;
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

      await requisicao(caminho, {
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

      mostrarAviso(
        metodo === "POST"
          ? "Árvore cadastrada no MongoDB!"
          : "Árvore atualizada no MongoDB!"
      );

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

      const confirmar = window.confirm(
        `Deseja ${acao} a árvore ${arvoreSelecionada.nomePopular}?`
      );

      if (!confirmar) return;

      try {

        await requisicao(
          `/api/arvores/${encodeURIComponent(arvoreSelecionada.id)}/status`,
          {
            method: "PATCH",
            body: JSON.stringify({
              ativa: ativar
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
  // FUNCIONALIDADES PENDENTES
  // ========================================

  el("startInterventionButton").disabled = true;

  el("startInterventionButton").title =
    "Intervenções: integração com API pendente";

  // ========================================
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

  el("treeMunicipality").textContent =
    "Campinas - SP (teste)";

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
