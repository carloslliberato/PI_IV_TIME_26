// Autor: Gabrielle Mota, Sophia Fernandes

// Painel profissional de gestão de ocorrências integrado com o back-end Java (Javalin + MongoDB).

// Guarda na memória os dados reais vindos do banco de dados
const occurrenceData = {
  occurrences: [],
  teams: [],
  teamsLoading: false,
  teamsError: "",
  teamsRequestId: 0
};

// Mantém as referências dos elementos HTML da página pelos IDs originais
const occurrencePage = {
  tableBody: document.getElementById("occurrencesTableBody"),
  emptyState: document.getElementById("occurrencesEmpty"),
  count: document.getElementById("occurrencesResultCount"),
  search: document.getElementById("occurrencesSearch"),
  sort: document.getElementById("occurrencesSort"),
  modal: document.getElementById("occurrenceModal"),
  modalContent: document.getElementById("occurrenceModalContent"),
  toast: document.getElementById("occurrencesToast")
};

let selectedOccurrenceId = null;
let occurrenceToastTimer = null;
let occurrenceOrderInProgress = false;

// Protege o HTML escapando caracteres especiais nos textos vindos do banco
function escapeOccurrenceText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Remove acentos e deixa tudo minúsculo para facilitar a busca na barra de pesquisa
function normalizeOccurrenceText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

// Converte a urgência/risco em classe CSS para colorir a etiqueta (badge)
function occurrenceRiskClass(risk) {
  const normalized = normalizeOccurrenceText(risk);
  if (normalized.includes("crit")) return "critical";
  if (normalized.includes("alt")) return "high";
  if (normalized.includes("med")) return "medium";
  return "low";
}

// Ordena as ocorrências por nível de criticidade ou por data mais recente
function sortOccurrences(records) {
  const criticality = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...records];
  if (occurrencePage.sort && occurrencePage.sort.value === "critical") {
    return sorted.sort((left, right) => {
      const riskDifference = criticality[occurrenceRiskClass(right.risk)] - criticality[occurrenceRiskClass(left.risk)];
      return riskDifference || right.date.localeCompare(left.date);
    });
  }
  return sorted.sort((left, right) => right.date.localeCompare(left.date));
}

// Filtra as ocorrências conforme o texto digitado na busca (bairro, árvore, ID ou tipo)
function getVisibleOccurrences() {
  const query = normalizeOccurrenceText(occurrencePage.search ? occurrencePage.search.value.trim() : "");
  const filtered = occurrenceData.occurrences.filter(item => {
    const searchableValues = [item.neighborhood, item.tree, item.treeId, item.type, item.id];
    return !query || searchableValues.some(value => normalizeOccurrenceText(value).includes(query));
  });
  return sortOccurrences(filtered);
}

// Formata a data ISO (ex: 2026-10-28T14:30:00Z) para o padrão brasileiro DD/MM/AAAA
function formatOccurrenceDate(isoDate) {
  if (!isoDate) return "—";
  const cleanDate = String(isoDate).split("T")[0];
  const parts = cleanDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

// Desenha a coluna de Ordem de Serviço na tabela (mostra se já tem OS ou se está sem ordem)
function renderOccurrenceOrderCell(occurrence) {
  if (!occurrence.order) {
    return '<span class="occurrence-order-missing"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i><span>Sem ordem</span></span>';
  }
  return `<span class="occurrence-order-created"><i class="bi bi-check-circle-fill" aria-hidden="true"></i>${escapeOccurrenceText(occurrence.order.id)}</span>`;
}

// Desenha todas as linhas da tabela de ocorrências na tela do funcionário
function renderOccurrencesTable() {
  if (!occurrencePage.tableBody) return;
  const records = getVisibleOccurrences();

  occurrencePage.tableBody.innerHTML = records.map(occurrence => {
    const assignedTeam = occurrence.order?.teamName || "—";

    return `
      <tr>
        <td><button class="occurrence-id-link" type="button" data-open-occurrence="${escapeOccurrenceText(occurrence.id)}">${escapeOccurrenceText(occurrence.codigoIdentificador)}</button></td>
        <td>${escapeOccurrenceText(occurrence.type)}</td>
        <td>${escapeOccurrenceText(occurrence.neighborhood)}</td>
        <td><span class="occurrence-risk-badge ${occurrenceRiskClass(occurrence.risk)}">${escapeOccurrenceText(occurrence.risk)}</span></td>
        <td>${renderOccurrenceOrderCell(occurrence)}</td>
        <td>${escapeOccurrenceText(assignedTeam)}</td>
        <td>${formatOccurrenceDate(occurrence.date)}</td>
      </tr>
    `;
  }).join("");

  if (occurrencePage.count) {
    occurrencePage.count.textContent = `${records.length} ${records.length === 1 ? "ocorrência encontrada" : "ocorrências encontradas"}`;
  }
  if (occurrencePage.emptyState) {
    occurrencePage.emptyState.hidden = records.length > 0;
  }
}

// Monta o conteúdo do modal com os detalhes completos da ocorrência e controles de status/prioridade
function renderOccurrenceDetails(occurrence) {
  const team = occurrence.order
    ? occurrenceData.teams.find(item => item.id === occurrence.order.teamId)
    : null;

  const actionMarkup = occurrence.order
    ? `
      <section class="occurrence-order-summary">
        <h3><i class="bi bi-clipboard-check" aria-hidden="true"></i> Ordem de serviço ${escapeOccurrenceText(occurrence.order.id)}</h3>
        <div class="occurrence-detail-grid">
          <div><span>Status da ordem</span><strong>${escapeOccurrenceText(occurrence.order.status)}</strong></div>
          <div><span>Equipe destinada</span><strong>${escapeOccurrenceText(occurrence.order.teamName || team?.name || "Equipe designada")}</strong></div>
        </div>
        <p>O status da ocorrência está como <strong>${escapeOccurrenceText(occurrence.status)}</strong>.</p>
      </section>
    `
    : renderCreateOrderForm();

  occurrencePage.modalContent.innerHTML = `
    <header class="occurrence-detail-heading">
      <span class="occurrence-detail-icon ${occurrenceRiskClass(occurrence.risk)}"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
      <div><span class="occurrence-detail-eyebrow">${escapeOccurrenceText(occurrence.protocolo)} · ${formatOccurrenceDate(occurrence.date)}</span><h2 id="occurrenceModalTitle">${escapeOccurrenceText(occurrence.type)}</h2></div>
    </header>
    <div class="occurrence-detail-grid occurrence-detail-meta">
      <div><span>Árvore</span><strong>${escapeOccurrenceText(occurrence.tree)} · ID ${escapeOccurrenceText(occurrence.treeId)}</strong></div>
      <div><span>Nível de risco</span><strong><span class="occurrence-risk-badge ${occurrenceRiskClass(occurrence.risk)}">${escapeOccurrenceText(occurrence.risk)}</span></strong></div>
      <div><span>Bairro</span><strong>${escapeOccurrenceText(occurrence.neighborhood)}</strong></div>
      <div><span>Endereço</span><strong>${escapeOccurrenceText(occurrence.address)}</strong></div>
      <div><span>Relatada por</span><strong>${escapeOccurrenceText(occurrence.reporter)}</strong></div>
      <div><span>Status</span><strong>${escapeOccurrenceText(occurrence.status)}</strong></div>
    </div>
    <section class="occurrence-description">
      <h3>Descrição da ocorrência</h3>
      <p>${escapeOccurrenceText(occurrence.description)}</p>
    </section>
    ${actionMarkup}
  `;
}

// Monta o formulário dentro do modal para escolher uma equipe livre e gerar a Ordem de Serviço
function renderCreateOrderForm() {
  if (occurrenceData.teamsLoading) {
    return '<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p role="status">Consultando equipes disponíveis para o município da ocorrência...</p></section>';
  }
  if (occurrenceData.teamsError) {
    return `<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p class="occurrence-no-team">${escapeOccurrenceText(occurrenceData.teamsError)}</p><button class="occurrence-primary-button" type="button" data-reload-occurrence-teams>Tentar carregar equipes novamente</button></section>`;
  }

  const freeTeams = occurrenceData.teams.filter(team => team.available);
  if (!freeTeams.length) {
    return '<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p class="occurrence-no-team"><i class="bi bi-exclamation-circle" aria-hidden="true"></i> Não há equipes disponíveis neste município.</p><button class="occurrence-primary-button" type="button" data-reload-occurrence-teams>Atualizar equipes</button></section>';
  }
  return `
    <form class="occurrence-order-create" id="createOccurrenceOrderForm">
      <div><h3>Criar ordem de serviço</h3><p>Selecione uma equipe livre para encaminhar esta ocorrência.</p></div>
      <label for="availableTeamSelect">Equipe livre</label>
      <div class="occurrence-order-form-row">
        <select id="availableTeamSelect" name="teamId" required>
          <option value="">Selecione uma equipe</option>
          ${freeTeams.map(team => `<option value="${escapeOccurrenceText(team.id)}">${escapeOccurrenceText(team.name)}</option>`).join("")}
        </select>
        <button class="occurrence-primary-button" type="submit"><i class="bi bi-clipboard-plus" aria-hidden="true"></i>Criar ordem</button>
      </div>
    </form>
  `;
}

// Abre o modal de detalhes quando o funcionário clica no protocolo da ocorrência
function openOccurrenceDetails(occurrenceId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(occurrenceId));
  if (!occurrence) return;
  selectedOccurrenceId = occurrence.id;
  renderOccurrenceDetails(occurrence);
  occurrencePage.modal.hidden = false;
  document.body.classList.add("occurrence-modal-open");
  document.getElementById("closeOccurrenceModal")?.focus();
  if (!occurrence.order) carregarEquipesDisponiveisDaOcorrencia(occurrence);
}

// Fecha o modal de detalhes
function closeOccurrenceDetails() {
  occurrencePage.modal.hidden = true;
  document.body.classList.remove("occurrence-modal-open");
}

// Mostra um aviso rápido (toast) na tela após salvar uma alteração
function showOccurrenceToast(message) {
  if (!occurrencePage.toast) return;
  occurrencePage.toast.textContent = message;
  occurrencePage.toast.hidden = false;
  window.clearTimeout(occurrenceToastTimer);
  occurrenceToastTimer = window.setTimeout(() => { occurrencePage.toast.hidden = true; }, 3600);
}

// Consulta a API já validada pelo município da ocorrência e exibe somente equipes disponíveis.
async function carregarEquipesDisponiveisDaOcorrencia(occurrence) {
  const requestId = ++occurrenceData.teamsRequestId;
  occurrenceData.teams = [];
  occurrenceData.teamsError = "";
  occurrenceData.teamsLoading = true;
  if (String(selectedOccurrenceId) === String(occurrence.id)) renderOccurrenceDetails(occurrence);

  try {
    // Usa o ObjectId do Mongo, não o identificador público OC-..., na rota protegida.
    const response = await fetch(
      `/api/ordens-servico/ocorrencias/${encodeURIComponent(occurrence.databaseId)}/equipes-disponiveis`,
      { credentials: "same-origin", cache: "no-store" }
    );
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("O servidor retornou uma resposta inválida ao consultar as equipes.");
    }
    if (!response.ok) {
      throw new Error(responseData.erro || `O servidor respondeu com status ${response.status}.`);
    }
    if (!Array.isArray(responseData.equipes)
        || responseData.equipes.some(team => !team || typeof team.id !== "string"
          || typeof team.nome !== "string" || team.disponivel !== true)) {
      throw new Error("A resposta do servidor não contém uma lista válida de equipes disponíveis.");
    }
    if (requestId !== occurrenceData.teamsRequestId) return;

    // Converte o formato da API para os campos usados pelo seletor do modal.
    occurrenceData.teams = responseData.equipes.map(team => ({
      id: team.id,
      name: team.nome,
      available: true
    }));
  } catch (error) {
    if (requestId !== occurrenceData.teamsRequestId) return;
    console.error("Erro ao consultar equipes da ocorrência:", error);
    occurrenceData.teamsError = error.message;
  } finally {
    if (requestId === occurrenceData.teamsRequestId) {
      occurrenceData.teamsLoading = false;
      if (String(selectedOccurrenceId) === String(occurrence.id)
          && occurrencePage.modal && !occurrencePage.modal.hidden) {
        renderOccurrenceDetails(occurrence);
      }
    }
  }
}

// Cria a OS já vinculada à ocorrência e à equipe selecionada no backend.
async function createOccurrenceOrder(teamId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
  const team = occurrenceData.teams.find(item => String(item.id) === String(teamId) && item.available);
  if (!occurrence || occurrence.order || !team || occurrenceOrderInProgress) return;
  if (!occurrence.databaseId) {
    showOccurrenceToast("Não foi possível identificar esta ocorrência no banco de dados.");
    return;
  }

  const submitButton = occurrencePage.modalContent.querySelector(
    "#createOccurrenceOrderForm button[type='submit']"
  );
  occurrenceOrderInProgress = true;
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Criando ordem...";
  }

  try {
    // A rota grava a OS, reserva a equipe e atualiza o status da ocorrência em uma única transação.
    const response = await fetch(
      `/api/ordens-servico/ocorrencias/${encodeURIComponent(occurrence.databaseId)}`,
      {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipeId: team.id })
      }
    );
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("O servidor retornou uma resposta inválida ao criar a ordem.");
    }
    if (!response.ok) {
      throw new Error(responseData.erro || `O servidor respondeu com status ${response.status}.`);
    }

    // Confere se o backend persistiu exatamente os vínculos escolhidos antes de mostrar sucesso.
    const savedOrder = responseData.ordem;
    if (!savedOrder || String(savedOrder.ocorrenciaId || "").toLowerCase()
        !== occurrence.databaseId.toLowerCase()
        || String(savedOrder.equipeId || "").toLowerCase() !== team.id.toLowerCase()
        || savedOrder.status !== "Em andamento") {
      throw new Error("O servidor não confirmou os vínculos da ordem de serviço.");
    }

    // Reflete na tela os dados confirmados pelo backend.
    occurrence.order = {
      id: savedOrder.codigo || savedOrder.id,
      status: savedOrder.status,
      teamId: savedOrder.equipeId,
      teamName: team.name
    };
    occurrence.status = "Em Atendimento";
    occurrenceData.teams = occurrenceData.teams.filter(item => item.id !== team.id);

    renderOccurrencesTable();
    if (String(selectedOccurrenceId) === String(occurrence.id)) renderOccurrenceDetails(occurrence);
    showOccurrenceToast(`Ordem ${occurrence.order.id} criada e destinada à ${team.name}.`);
  } catch (erro) {
    console.error("Erro ao criar ordem para a ocorrência:", erro);
    showOccurrenceToast(`Não foi possível criar a ordem. ${erro.message}`);
    if (String(selectedOccurrenceId) === String(occurrence.id)) {
      await carregarEquipesDisponiveisDaOcorrencia(occurrence);
    }
  } finally {
    occurrenceOrderInProgress = false;
    if (submitButton && submitButton.isConnected) {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="bi bi-clipboard-plus" aria-hidden="true"></i>Criar ordem';
    }
  }
}

// Extrai o bairro do endereço caso não tenha vindo separado no documento do banco
function extrairBairro(endereco) {
  if (endereco && endereco.includes("-")) {
    const partes = endereco.split("-");
    return partes[partes.length - 1].trim();
  }
  return "Centro";
}

// Busca as ocorrências e as ordens reais do back-end (Javalin + MongoDB).
async function carregarDadosDoBackend() {
  let ordensPorOcorrencia = new Map();
  try {
    // Busca as OS reais para relacionar cada ocorrência à equipe nela registrada.
    const respOrdens = await fetch("/api/ordens-servico");
    if (!respOrdens.ok) throw new Error(`Erro ao buscar ordens de serviço (HTTP ${respOrdens.status})`);
    const dadosOrdens = await respOrdens.json();
    if (!Array.isArray(dadosOrdens.ordens)) {
      throw new Error("Resposta inesperada da API de ordens de serviço");
    }

    ordensPorOcorrencia = new Map(
      dadosOrdens.ordens
        .filter(ordem => ordem.ocorrenciaId)
        .map(ordem => [String(ordem.ocorrenciaId).toLowerCase(), ordem])
    );
  } catch (erro) {
    console.error("Erro ao carregar ordens de serviço vinculadas:", erro);
  }

  try {
    // 2. Busca todas as ocorrências no back-end da Pessoa 3 (GET /api/ocorrencias)
    const respOcorrencias = await fetch("/api/ocorrencias");
    if (!respOcorrencias.ok) throw new Error("Erro ao buscar ocorrências");

    const dadosBanco = await respOcorrencias.json();

    // Converte os documentos do MongoDB para o formato usado pela tabela profissional
    occurrenceData.occurrences = dadosBanco.map(doc => {
      const dataIso = (doc.criadoEm || doc.dataHora || new Date().toISOString()).split("T")[0];
      const ordem = ordensPorOcorrencia.get(String(doc._id || "").toLowerCase());

      return {
        id: doc.id || doc._id,
        databaseId: String(doc._id || ""),
        codigoIdentificador: doc.id || doc.codigoIdentificador || doc._id,
        protocolo: doc.protocolo || doc.id || doc._id,
        municipalityId: doc.municipioId || "campinas",
        type: doc.tipoProblema || "Ocorrência arbórea",
        date: dataIso,
        tree: doc.especieArvore || "Árvore urbana",
        treeId: doc.arvoreId || "Não vinculada",
        neighborhood: doc.bairro || extrairBairro(doc.localizacao),
        address: doc.localizacao || "Endereço não informado",
        risk: doc.urgencia || "Média",
        reporter: doc.nomeContato || (doc.cidadaoId === "cid_anonimo" ? "Portal Público (Anônimo)" : `Cidadão (${doc.cidadaoId || "Portal"})`),
        description: doc.descricao || "Sem descrição detalhada.",
        status: doc.status || "Recebida",
        order: ordem
          ? {
              id: ordem.codigo || ordem.id,
              status: ordem.status,
              teamId: ordem.equipeId || null,
              teamName: ordem.equipeNome || null
            }
          : null
      };
    });

    renderOccurrencesTable();
  } catch (erro) {
    console.error("Erro ao carregar ocorrências do servidor:", erro);
    renderOccurrencesTable();
  }
}

// Configura os eventos de busca, ordenação e cliques nos botões do modal
function setupOccurrencePageEvents() {
  occurrencePage.search?.addEventListener("input", renderOccurrencesTable);
  occurrencePage.sort?.addEventListener("change", renderOccurrencesTable);

  occurrencePage.tableBody?.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-occurrence]");
    if (trigger) openOccurrenceDetails(trigger.dataset.openOccurrence);
  });

  // Permite tentar novamente se a consulta inicial de equipes falhar ou retornar lista vazia.
  occurrencePage.modalContent?.addEventListener("click", event => {
    if (!event.target.closest("[data-reload-occurrence-teams]")) return;
    const occurrence = occurrenceData.occurrences.find(
      item => String(item.id) === String(selectedOccurrenceId)
    );
    if (occurrence && !occurrence.order) carregarEquipesDisponiveisDaOcorrencia(occurrence);
  });

  occurrencePage.modalContent?.addEventListener("submit", event => {
    if (event.target.id !== "createOccurrenceOrderForm") return;
    event.preventDefault();
    const teamId = new FormData(event.target).get("teamId");
    if (!teamId) return;
    createOccurrenceOrder(String(teamId));
  });

  document.getElementById("closeOccurrenceModal")?.addEventListener("click", closeOccurrenceDetails);
  occurrencePage.modal?.addEventListener("click", event => {
    if (event.target === occurrencePage.modal) closeOccurrenceDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && occurrencePage.modal && !occurrencePage.modal.hidden) {
      closeOccurrenceDetails();
    }
  });
}

// Inicializa os eventos e carrega os dados reais do banco assim que a página abre
function initializeOccurrencePage() {
  setupOccurrencePageEvents();
  carregarDadosDoBackend();
}

initializeOccurrencePage();