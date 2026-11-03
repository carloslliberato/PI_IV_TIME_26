// Os registros abaixo simulam a resposta que futuramente virá do backend municipal.
// FUTURO API/BD: substituir este conjunto por GET /api/municipios/{id}/ocorrencias,
// incluindo árvore, endereço, risco, status, ordem de serviço e equipe vinculada.
const occurrenceDemoData = {
  municipality: { id: "campinas-demo", name: "Campinas - SP" },
  occurrences: [
    {
      id: "OC-2026-0241", municipalityId: "campinas-demo", type: "Galho próximo à rede elétrica", date: "2026-10-17",
      tree: "Ipê-amarelo", treeId: "10234", neighborhood: "Taquaral", address: "R. Dr. Alberto Sarmento, 123",
      risk: "Alto", reporter: "Central de atendimento", description: "Morador relata galhos tocando os cabos durante períodos de vento. Solicita avaliação e poda preventiva.",
      status: "Em atendimento", order: { id: "OS-2026-0381", status: "Em andamento", teamId: "TEAM-01" }
    },
    {
      id: "OC-2026-0240", municipalityId: "campinas-demo", type: "Árvore inclinada", date: "2026-10-14",
      tree: "Sibipiruna", treeId: "11802", neighborhood: "Centro", address: "R. Barão de Jaguara, 880",
      risk: "Crítico", reporter: "Vistoria de campo", description: "Foi observada inclinação recente do tronco em direção à calçada, com cavidade visível na base. É necessária avaliação técnica prioritária.",
      status: "Aguardando atendimento", order: null
    },
    {
      id: "OC-2026-0238", municipalityId: "campinas-demo", type: "Galho quebrado", date: "2026-10-11",
      tree: "Jatobá", treeId: "10418", neighborhood: "Jardim Chapadão", address: "Av. Imperatriz Leopoldina, 300",
      risk: "Médio", reporter: "Aplicativo municipal", description: "Galho de médio porte quebrou após chuva e permanece apoiado em outros ramos. A passagem de pedestres está parcialmente obstruída.",
      status: "Aguardando atendimento", order: null
    },
    {
      id: "OC-2026-0231", municipalityId: "campinas-demo", type: "Raiz danificando calçada", date: "2026-09-30",
      tree: "Pau-brasil", treeId: "11076", neighborhood: "Centro", address: "Praça Carlos Gomes, s/n",
      risk: "Baixo", reporter: "Equipe de zeladoria", description: "Raízes superficiais levantaram uma placa da calçada. Sem dano aparente ao tronco; recomenda-se vistoria e orientação de manejo.",
      status: "Concluída", order: { id: "OS-2026-0312", status: "Concluída", teamId: "TEAM-03" }
    },
    {
      id: "OC-2026-0226", municipalityId: "campinas-demo", type: "Árvore com sinais de praga", date: "2026-09-22",
      tree: "Quaresmeira", treeId: "12031", neighborhood: "Cambuí", address: "Av. Júlio de Mesquita, 410",
      risk: "Médio", reporter: "Morador", description: "Folhas com manchas e queda acima do habitual. A pessoa solicitante enviou relato para avaliação fitossanitária.",
      status: "Aguardando atendimento", order: null
    }
  ],
  // A disponibilidade é atualizada em memória ao atribuir uma equipe a uma nova ordem.
  teams: [
    { id: "TEAM-01", name: "Equipe Norte", available: false },
    { id: "TEAM-02", name: "Equipe Central", available: true },
    { id: "TEAM-03", name: "Equipe Sul", available: true },
    { id: "TEAM-04", name: "Equipe de poda", available: true }
  ]
};

// Mantém as referências da página e o identificador do registro aberto no modal.
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

// Escapa os valores dinâmicos antes de inseri-los em templates HTML.
function escapeOccurrenceText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Converte texto para busca sem diferença entre maiúsculas e acentos.
function normalizeOccurrenceText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

// Traduz os níveis de risco para classes de estilo e posições de criticidade.
function occurrenceRiskClass(risk) {
  const normalized = normalizeOccurrenceText(risk);
  if (normalized.includes("crit")) return "critical";
  if (normalized.includes("alto")) return "high";
  if (normalized.includes("medio")) return "medium";
  return "low";
}

// Ordena os registros por criticidade, mantendo a data recente como desempate.
function sortOccurrences(records) {
  const criticality = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...records];
  if (occurrencePage.sort.value === "critical") {
    return sorted.sort((left, right) => {
      const riskDifference = criticality[occurrenceRiskClass(right.risk)] - criticality[occurrenceRiskClass(left.risk)];
      return riskDifference || right.date.localeCompare(left.date);
    });
  }
  return sorted.sort((left, right) => right.date.localeCompare(left.date));
}

// Busca exclusivamente nos registros do município associado à tela.
// FUTURO API/BD: passar municipalityId e termo de busca como parâmetros do endpoint.
function getVisibleOccurrences() {
  const municipalityId = occurrenceDemoData.municipality.id;
  const query = normalizeOccurrenceText(occurrencePage.search.value.trim());
  const municipalRecords = occurrenceDemoData.occurrences.filter(item => item.municipalityId === municipalityId);
  const filtered = municipalRecords.filter(item => {
    const searchableValues = [item.neighborhood, item.tree, item.treeId];
    return !query || searchableValues.some(value => normalizeOccurrenceText(value).includes(query));
  });
  return sortOccurrences(filtered);
}

// Formata as datas ISO dos dados locais para a apresentação brasileira na tabela e no modal.
function formatOccurrenceDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Retorna o texto e o estilo da célula de ordem de serviço para cada ocorrência.
function renderOccurrenceOrderCell(occurrence) {
  if (!occurrence.order) {
    return '<span class="occurrence-order-missing"><i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i><span>Sem ordem</span></span>';
  }
  return `<span class="occurrence-order-created"><i class="bi bi-check-circle-fill" aria-hidden="true"></i>${escapeOccurrenceText(occurrence.order.id)}</span>`;
}

// Desenha a tabela com os filtros atuais e atualiza a contagem de resultados.
function renderOccurrencesTable() {
  const records = getVisibleOccurrences();
  occurrencePage.tableBody.innerHTML = records.map(occurrence => {
    const assignedTeam = occurrence.order
      ? occurrenceDemoData.teams.find(team => team.id === occurrence.order.teamId)?.name || "Equipe pendente"
      : "—";
    return `
      <tr>
        <td><button class="occurrence-id-link" type="button" data-open-occurrence="${escapeOccurrenceText(occurrence.id)}">${escapeOccurrenceText(occurrence.id)}</button></td>
        <td>${escapeOccurrenceText(occurrence.type)}</td>
        <td>${escapeOccurrenceText(occurrence.neighborhood)}</td>
        <td><span class="occurrence-risk-badge ${occurrenceRiskClass(occurrence.risk)}">${escapeOccurrenceText(occurrence.risk)}</span></td>
        <td>${renderOccurrenceOrderCell(occurrence)}</td>
        <td>${escapeOccurrenceText(assignedTeam)}</td>
        <td>${formatOccurrenceDate(occurrence.date)}</td>
      </tr>
    `;
  }).join("");

  occurrencePage.count.textContent = `${records.length} ${records.length === 1 ? "ocorrência encontrada" : "ocorrências encontradas"}`;
  occurrencePage.emptyState.hidden = records.length > 0;
}

// Monta a apresentação detalhada do registro e as ações disponíveis conforme seu estado.
function renderOccurrenceDetails(occurrence) {
  const team = occurrence.order
    ? occurrenceDemoData.teams.find(item => item.id === occurrence.order.teamId)
    : null;
  const actionMarkup = occurrence.order
    ? `
      <section class="occurrence-order-summary">
        <h3><i class="bi bi-clipboard-check" aria-hidden="true"></i> Ordem de serviço ${escapeOccurrenceText(occurrence.order.id)}</h3>
        <div class="occurrence-detail-grid">
          <div><span>Status da ordem</span><strong>${escapeOccurrenceText(occurrence.order.status)}</strong></div>
          <div><span>Equipe destinada</span><strong>${escapeOccurrenceText(team?.name || "Aguardando equipe")}</strong></div>
        </div>
        <p>O status da ocorrência está como <strong>${escapeOccurrenceText(occurrence.status)}</strong>.</p>
      </section>
    `
    : renderCreateOrderForm();

  occurrencePage.modalContent.innerHTML = `
    <header class="occurrence-detail-heading">
      <span class="occurrence-detail-icon ${occurrenceRiskClass(occurrence.risk)}"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i></span>
      <div><span class="occurrence-detail-eyebrow">${escapeOccurrenceText(occurrence.id)} · ${formatOccurrenceDate(occurrence.date)}</span><h2 id="occurrenceModalTitle">${escapeOccurrenceText(occurrence.type)}</h2></div>
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

// Apresenta um seletor de equipes livres antes de criar uma nova ordem de serviço.
function renderCreateOrderForm() {
  const freeTeams = occurrenceDemoData.teams.filter(team => team.available);
  if (!freeTeams.length) {
    return '<section class="occurrence-order-create"><h3>Criar ordem de serviço</h3><p class="occurrence-no-team"><i class="bi bi-exclamation-circle" aria-hidden="true"></i> Não há equipes livres no momento.</p></section>';
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

// Abre o modal para a ocorrência escolhida e prepara os detalhes com o estado mais recente.
function openOccurrenceDetails(occurrenceId) {
  const occurrence = occurrenceDemoData.occurrences.find(item => item.id === occurrenceId);
  if (!occurrence) return;
  selectedOccurrenceId = occurrence.id;
  renderOccurrenceDetails(occurrence);
  occurrencePage.modal.hidden = false;
  document.body.classList.add("occurrence-modal-open");
  document.getElementById("closeOccurrenceModal").focus();
}

// Fecha o modal e devolve a rolagem da página ao estado normal.
function closeOccurrenceDetails() {
  occurrencePage.modal.hidden = true;
  document.body.classList.remove("occurrence-modal-open");
}

// Mostra uma confirmação breve após uma ordem ser criada nesta demonstração local.
function showOccurrenceToast(message) {
  occurrencePage.toast.textContent = message;
  occurrencePage.toast.hidden = false;
  window.clearTimeout(occurrenceToastTimer);
  occurrenceToastTimer = window.setTimeout(() => { occurrencePage.toast.hidden = true; }, 3600);
}

// Cria a ordem de serviço em memória, reserva a equipe e muda os estados relacionados.
// FUTURO API/BD: enviar POST /api/ocorrencias/{id}/ordens com equipeId e atualizar a tabela via resposta.
function createOccurrenceOrder(teamId) {
  const occurrence = occurrenceDemoData.occurrences.find(item => item.id === selectedOccurrenceId);
  const team = occurrenceDemoData.teams.find(item => item.id === teamId && item.available);
  if (!occurrence || occurrence.order || !team) return;

  const nextOrderNumber = String(occurrenceDemoData.occurrences.length + 381).padStart(4, "0");
  occurrence.order = { id: `OS-2026-${nextOrderNumber}`, status: "Em andamento", teamId: team.id };
  occurrence.status = "Em atendimento";
  team.available = false;

  renderOccurrencesTable();
  renderOccurrenceDetails(occurrence);
  showOccurrenceToast(`Ordem ${occurrence.order.id} criada e destinada à ${team.name}.`);
}

// Conecta busca, ordenação, abertura de detalhes, formulário e ações de fechamento.
function setupOccurrencePageEvents() {
  occurrencePage.search.addEventListener("input", renderOccurrencesTable);
  occurrencePage.sort.addEventListener("change", renderOccurrencesTable);

  occurrencePage.tableBody.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-occurrence]");
    if (trigger) openOccurrenceDetails(trigger.dataset.openOccurrence);
  });

  occurrencePage.modalContent.addEventListener("submit", event => {
    if (event.target.id !== "createOccurrenceOrderForm") return;
    event.preventDefault();
    const teamId = new FormData(event.target).get("teamId");
    if (!teamId) return;
    createOccurrenceOrder(String(teamId));
  });

  document.getElementById("closeOccurrenceModal").addEventListener("click", closeOccurrenceDetails);
  occurrencePage.modal.addEventListener("click", event => {
    if (event.target === occurrencePage.modal) closeOccurrenceDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !occurrencePage.modal.hidden) closeOccurrenceDetails();
  });
}

// Inicializa município demonstrativo, filtros, tabela e eventos da página.
// FUTURO API/BD: obter município do perfil autenticado e carregar apenas suas ocorrências.
function initializeOccurrencePage() {
  document.getElementById("occurrencesMunicipality").textContent = occurrenceDemoData.municipality.name;
  setupOccurrencePageEvents();
  renderOccurrencesTable();
}

initializeOccurrencePage();
