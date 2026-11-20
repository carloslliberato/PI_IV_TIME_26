// feito por Sophia
// Painel profissional de gestão de ocorrências integrado com o back-end Java (Javalin + MongoDB).

// Guarda na memória os dados reais vindos do banco de dados
const occurrenceData = {
  occurrences: []
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
let editingOccurrenceRiskId = null;
let savingOccurrenceRiskId = null;
let occurrenceTeamsState = { occurrenceId: null, teams: [], loading: false, error: "", submitting: false };
const occurrenceRiskOptions = ["Baixa", "Média", "Alta", "Crítica"];

async function readOccurrenceResponse(response, fallback) {
  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error(fallback);
  }
  if (!response.ok) throw new Error(body?.erro || fallback);
  return body;
}

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
    const searchableValues = [item.neighborhood, item.tree, item.treeId, item.type, item.codigo, item.protocolo, item.id];
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

function getOccurrenceAssignedTeamName(order) {
  return order.teamName || "";
}

// Desenha todas as linhas da tabela de ocorrências na tela do funcionário
function renderOccurrencesTable() {
  if (!occurrencePage.tableBody) return;
  const records = getVisibleOccurrences();

  occurrencePage.tableBody.innerHTML = records.map(occurrence => {
    const assignedTeam = occurrence.order
      ? getOccurrenceAssignedTeamName(occurrence.order)
      : "—";

    return `
      <tr>
        <td><button class="occurrence-id-link" type="button" data-open-occurrence="${escapeOccurrenceText(occurrence.id)}">${escapeOccurrenceText(occurrence.codigo || occurrence.protocolo)}</button></td>
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
  const actionMarkup = occurrence.order
    ? `
      <section class="occurrence-order-summary">
        <h3><i class="bi bi-clipboard-check" aria-hidden="true"></i> Ordem de serviço ${escapeOccurrenceText(occurrence.order.id)}</h3>
        <div class="occurrence-detail-grid">
          <div><span>Status da ordem</span><strong>${escapeOccurrenceText(occurrence.order.status)}</strong></div>
          <div><span>Equipe designada</span><strong>${escapeOccurrenceText(getOccurrenceAssignedTeamName(occurrence.order))}</strong></div>
        </div>
        <p>O status da ocorrência está como <strong>${escapeOccurrenceText(occurrence.status)}</strong>.</p>
      </section>
    `
    : isPendingOccurrence(occurrence)
      ? renderCreateOrderForm(occurrence)
      : `<section class="occurrence-order-create"><h3>Ordem de serviço</h3><p>Esta ocorrência não está pendente e não pode receber uma nova ordem.</p></section>`;

  occurrencePage.modalContent.innerHTML = `
    <header class="occurrence-detail-heading">
      <span class="occurrence-detail-icon ${occurrenceRiskClass(occurrence.risk)}"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
      <div><span class="occurrence-detail-eyebrow">${escapeOccurrenceText(occurrence.protocolo)} · ${formatOccurrenceDate(occurrence.date)}</span><h2 id="occurrenceModalTitle">${escapeOccurrenceText(occurrence.type)}</h2></div>
    </header>
    <div class="occurrence-detail-grid occurrence-detail-meta">
      <div><span>Árvore</span><strong>${escapeOccurrenceText(occurrence.tree)} · ID ${escapeOccurrenceText(occurrence.treeId)}</strong></div>
      <div><span>Nível de risco</span><strong>${renderOccurrenceRiskField(occurrence)}</strong></div>
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

function renderOccurrenceRiskField(occurrence) {
  const occurrenceId = String(occurrence.id);
  if (editingOccurrenceRiskId === occurrenceId) {
    const disabled = savingOccurrenceRiskId === occurrenceId;
    return `<select class="occurrence-risk-select" data-occurrence-risk-select aria-label="Nível de risco" ${disabled ? "disabled" : ""}>
      ${occurrenceRiskOptions.map(option => `<option value="${option}" ${occurrence.risk === option ? "selected" : ""}>${option}</option>`).join("")}
    </select>`;
  }
  return `<button class="occurrence-risk-badge occurrence-risk-edit-button ${occurrenceRiskClass(occurrence.risk)}" type="button" data-edit-occurrence-risk aria-label="Alterar nível de risco: ${escapeOccurrenceText(occurrence.risk)}">${escapeOccurrenceText(occurrence.risk)}</button>`;
}

// Monta o formulário dentro do modal para escolher uma equipe livre e gerar a Ordem de Serviço
function isPendingOccurrence(occurrence) {
  return ["recebida", "em análise", "pendente"].includes(normalizeOccurrenceText(occurrence.status));
}

function renderCreateOrderForm(occurrence) {
  const teamsState = occurrenceTeamsState;
  if (teamsState.occurrenceId !== String(occurrence.id) || teamsState.loading) {
    return '<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p>Carregando equipes disponíveis...</p></section>';
  }
  if (teamsState.error) {
    return `<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p class="occurrence-no-team">${escapeOccurrenceText(teamsState.error)}</p><button class="occurrence-primary-button" type="button" data-reload-occurrence-teams>Atualizar equipes</button></section>`;
  }
  if (!teamsState.teams.length) {
    return '<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p class="occurrence-no-team"><i class="bi bi-exclamation-circle" aria-hidden="true"></i> Não há equipes livres no momento.</p></section>';
  }
  return `
    <form class="occurrence-order-create" id="createOccurrenceOrderForm">
      <div><h3>Criar ordem de serviço</h3><p>Selecione uma equipe livre para encaminhar esta ocorrência.</p></div>
      <label for="availableTeamSelect">Equipe livre</label>
      <div class="occurrence-order-form-row">
        <select id="availableTeamSelect" name="teamId" required ${teamsState.submitting ? "disabled" : ""}>
          <option value="">Selecione uma equipe</option>
          ${teamsState.teams.map(team => `<option value="${escapeOccurrenceText(team.id)}">${escapeOccurrenceText(team.name)}</option>`).join("")}
        </select>
        <button class="occurrence-primary-button" type="submit" ${teamsState.submitting ? "disabled" : ""}><i class="bi bi-clipboard-plus" aria-hidden="true"></i>${teamsState.submitting ? "Criando..." : "Criar ordem"}</button>
      </div>
    </form>
  `;
}

// Abre o modal de detalhes quando o funcionário clica no protocolo da ocorrência
function openOccurrenceDetails(occurrenceId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(occurrenceId));
  if (!occurrence) return;
  selectedOccurrenceId = occurrence.id;
  occurrenceTeamsState = { occurrenceId: String(occurrence.id), teams: [], loading: false, error: "", submitting: false };
  renderOccurrenceDetails(occurrence);
  occurrencePage.modal.hidden = false;
  document.body.classList.add("occurrence-modal-open");
  document.getElementById("closeOccurrenceModal")?.focus();
  if (!occurrence.order && isPendingOccurrence(occurrence)) carregarEquipesDisponiveis(occurrence);
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
  occurrencePage.toast.classList.remove("is-error");
  occurrencePage.toast.hidden = false;
  window.clearTimeout(occurrenceToastTimer);
  occurrenceToastTimer = window.setTimeout(() => { occurrencePage.toast.hidden = true; }, 3600);
}

function showOccurrenceErrorToast(message) {
  showOccurrenceToast(message);
  occurrencePage.toast?.classList.add("is-error");
}

async function salvarNivelRiscoOcorrencia(occurrence, risk) {
  if (!occurrenceRiskOptions.includes(risk) || savingOccurrenceRiskId) return;
  const occurrenceId = String(occurrence.id);
  savingOccurrenceRiskId = occurrenceId;
  renderOccurrenceDetails(occurrence);
  try {
    const response = await fetch(`/api/ocorrencias/${encodeURIComponent(occurrenceId)}/prioridade`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urgencia: risk })
    });
    await readOccurrenceResponse(response, "Não foi possível atualizar o nível de risco.");
    occurrence.risk = risk;
    renderOccurrencesTable();
    showOccurrenceToast("Nível de risco atualizado.");
  } catch (error) {
    console.error("Erro ao atualizar o nível de risco da ocorrência:", error);
    showOccurrenceErrorToast(error.message || "Não foi possível atualizar o nível de risco.");
  } finally {
    savingOccurrenceRiskId = null;
    editingOccurrenceRiskId = null;
    if (String(selectedOccurrenceId) === occurrenceId && !occurrencePage.modal.hidden) {
      renderOccurrenceDetails(occurrence);
    }
  }
}

async function carregarEquipesDisponiveis(occurrence) {
  occurrenceTeamsState = { occurrenceId: String(occurrence.id), teams: [], loading: true, error: "", submitting: false };
  renderOccurrenceDetails(occurrence);
  try {
    const response = await fetch(`/api/ocorrencias/${encodeURIComponent(occurrence.id)}/equipes-disponiveis`, {
      credentials: "same-origin",
      cache: "no-store"
    });
    const body = await readOccurrenceResponse(response, "Não foi possível carregar as equipes disponíveis.");
    if (!Array.isArray(body?.equipes)) throw new Error("A resposta de equipes do servidor é inválida.");
    occurrenceTeamsState.teams = body.equipes
      .filter(team => team && team.disponivel === true && team.id && team.nome)
      .map(team => ({ id: String(team.id), name: String(team.nome) }));
  } catch (error) {
    occurrenceTeamsState.error = error.message || "Não foi possível carregar as equipes disponíveis.";
  } finally {
    occurrenceTeamsState.loading = false;
    if (String(selectedOccurrenceId) === String(occurrence.id) && !occurrencePage.modal.hidden) {
      renderOccurrenceDetails(occurrence);
    }
  }
}

// Cria a OS e reserva a equipe em uma única operação do backend.
async function createOccurrenceOrder(teamId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
  const team = occurrenceTeamsState.teams.find(item => String(item.id) === String(teamId));
  if (!occurrence || occurrence.order || !isPendingOccurrence(occurrence) || !team || occurrenceTeamsState.submitting) return;

  occurrenceTeamsState.submitting = true;
  renderOccurrenceDetails(occurrence);
  try {
    const response = await fetch(`/api/ocorrencias/${encodeURIComponent(occurrence.id)}/ordem-servico`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ equipeId: team.id })
    });
    const body = await readOccurrenceResponse(response, "Não foi possível criar a ordem de serviço.");
    const order = body?.ordem;
    if (response.status !== 201 || !order?.id || order.equipeId !== team.id) {
      throw new Error("O servidor não confirmou a criação da ordem com a equipe selecionada.");
    }
    occurrence.order = {
      id: order.codigo || order.id,
      status: order.status,
      teamId: team.id,
      teamName: team.name
    };
    occurrence.status = "Em Atendimento";
    occurrenceTeamsState.teams = occurrenceTeamsState.teams.filter(item => item.id !== team.id);

    renderOccurrencesTable();
    renderOccurrenceDetails(occurrence);
    showOccurrenceToast(`Ordem ${order.codigo || order.id} criada e destinada à ${team.name}.`);
  } catch (erro) {
    console.error("Erro ao criar ordem para a ocorrência:", erro);
    occurrenceTeamsState.error = erro.message || "Erro ao salvar a ordem no servidor.";
    showOccurrenceToast(occurrenceTeamsState.error);
    renderOccurrenceDetails(occurrence);
  } finally {
    occurrenceTeamsState.submitting = false;
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

// Busca as ocorrências e ordens reais no back-end (Javalin + MongoDB).
async function carregarDadosDoBackend() {
  try {
    const [ocorrenciasResponse, ordersResponse] = await Promise.all([
      fetch("/api/ocorrencias", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/ordens-servico", { credentials: "same-origin", cache: "no-store" })
    ]);
    const dadosBanco = await readOccurrenceResponse(ocorrenciasResponse, "Não foi possível buscar ocorrências.");
    const dadosOrdens = await readOccurrenceResponse(ordersResponse, "Não foi possível consultar as ordens de serviço.");
    if (!Array.isArray(dadosBanco) || !Array.isArray(dadosOrdens?.ordens)) {
      throw new Error("A resposta de ocorrências ou ordens de serviço é inválida.");
    }
    const ordersByOccurrence = new Map(dadosOrdens.ordens
      .filter(order => order?.ocorrenciaId)
      .map(order => [String(order.ocorrenciaId), order]));

    occurrenceData.occurrences = dadosBanco.map(doc => {
      const dataIso = (doc.criadoEm || doc.dataHora || new Date().toISOString()).split("T")[0];
      const databaseId = doc._id || doc.ocorrenciaId || doc.id;
      const order = ordersByOccurrence.get(String(databaseId));

      return {
        id: databaseId,
        codigo: doc.id || doc.codigo || doc.protocolo || doc._id,
        protocolo: doc.protocolo || doc.id || doc._id,
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
        order: order ? {
          id: order.codigo || order.id,
          status: order.status,
          teamId: order.equipeId,
          teamName: order.equipeNome || null
        } : null
      };
    });

    renderOccurrencesTable();
  } catch (erro) {
    console.error("Erro ao carregar ocorrências do servidor:", erro);
    if (occurrencePage.count) occurrencePage.count.textContent = erro.message || "Não foi possível carregar ocorrências.";
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

  occurrencePage.modalContent?.addEventListener("submit", event => {
    if (event.target.id !== "createOccurrenceOrderForm") return;
    event.preventDefault();
    const teamId = new FormData(event.target).get("teamId");
    if (!teamId) return;
    createOccurrenceOrder(String(teamId));
  });
  occurrencePage.modalContent?.addEventListener("click", event => {
    if (event.target.closest("[data-reload-occurrence-teams]")) {
      const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
      if (occurrence) carregarEquipesDisponiveis(occurrence);
      return;
    }
    if (!event.target.closest("[data-edit-occurrence-risk]")) return;
    const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
    if (!occurrence || savingOccurrenceRiskId) return;
    editingOccurrenceRiskId = String(occurrence.id);
    renderOccurrenceDetails(occurrence);
    occurrencePage.modalContent.querySelector("[data-occurrence-risk-select]")?.focus();
  });
  occurrencePage.modalContent?.addEventListener("change", event => {
    const select = event.target.closest("[data-occurrence-risk-select]");
    if (!select) return;
    const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
    if (occurrence) salvarNivelRiscoOcorrencia(occurrence, select.value);
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