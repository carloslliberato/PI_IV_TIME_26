// feito por Sophia
// Painel profissional de gestão de ocorrências integrado com o back-end Java (Javalin + MongoDB).

// Guarda na memória os dados reais vindos do banco de dados
const occurrenceData = {
  municipality: { id: "campinas", name: "Campinas - SP" },
  occurrences: [],
  teams: [
    { id: "TEAM-01", name: "Equipe Norte", available: true },
    { id: "TEAM-02", name: "Equipe Central", available: true },
    { id: "TEAM-03", name: "Equipe Sul", available: true },
    { id: "TEAM-04", name: "Equipe de poda", available: true }
  ]
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
    const assignedTeam = occurrence.order
      ? (occurrence.order.teamName || occurrenceData.teams.find(team => team.id === occurrence.order.teamId)?.name || "Equipe designada")
      : "—";

    return `
      <tr>
        <td><button class="occurrence-id-link" type="button" data-open-occurrence="${escapeOccurrenceText(occurrence.id)}">${escapeOccurrenceText(occurrence.protocolo)}</button></td>
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
  const freeTeams = occurrenceData.teams.filter(team => team.available);
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

// Abre o modal de detalhes quando o funcionário clica no protocolo da ocorrência
function openOccurrenceDetails(occurrenceId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(occurrenceId));
  if (!occurrence) return;
  selectedOccurrenceId = occurrence.id;
  renderOccurrenceDetails(occurrence);
  occurrencePage.modal.hidden = false;
  document.body.classList.add("occurrence-modal-open");
  document.getElementById("closeOccurrenceModal")?.focus();
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

// Envia para o back-end a criação de vínculo da Ordem de Serviço e muda o status para "Em Atendimento"
async function createOccurrenceOrder(teamId) {
  const occurrence = occurrenceData.occurrences.find(item => String(item.id) === String(selectedOccurrenceId));
  const team = occurrenceData.teams.find(item => String(item.id) === String(teamId) && item.available);
  if (!occurrence || occurrence.order || !team) return;

  const nextOrderNumber = String(occurrenceData.occurrences.length + 381).padStart(4, "0");
  const orderId = `OS-2026-${nextOrderNumber}`;

  try {
    // Atualiza o status da ocorrência no back-end Java via PATCH /api/ocorrencias/{id}/status
    const response = await fetch(`/api/ocorrencias/${encodeURIComponent(occurrence.id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "Em Atendimento",
        observacaoInterna: `Ordem ${orderId} atribuída à equipe ${team.name} (${team.id})`
      })
    });

    if (!response.ok) throw new Error("Falha ao atualizar status no servidor");

    // Atualiza os dados na tela imediatamente
    occurrence.order = { id: orderId, status: "Em andamento", teamId: team.id, teamName: team.name };
    occurrence.status = "Em Atendimento";
    team.available = false;

    renderOccurrencesTable();
    renderOccurrenceDetails(occurrence);
    showOccurrenceToast(`Ordem ${occurrence.order.id} criada e destinada à ${team.name}.`);
  } catch (erro) {
    console.error("Erro ao criar ordem para a ocorrência:", erro);
    showOccurrenceToast("Erro ao salvar a ordem no servidor.");
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

// Busca as ocorrências reais e as equipes disponíveis no back-end (Javalin + MongoDB)
async function carregarDadosDoBackend() {
  try {
    // 1. Tenta carregar as equipes cadastradas na API da Pessoa 4 (/api/equipes)
    const respEquipes = await fetch("/api/equipes");
    if (respEquipes.ok) {
      const equipesBanco = await respEquipes.json();
      if (Array.isArray(equipesBanco) && equipesBanco.length > 0) {
        occurrenceData.teams = equipesBanco.map(eq => ({
          id: eq.id || eq._id,
          name: eq.nome || eq.nomeEquipe || "Equipe Operacional",
          available: eq.disponivel !== false && eq.status !== "Inativa"
        }));
      }
    }
  } catch (e) {
    // Se a rota de equipes não responder, mantém as equipes padrão em memória
  }

  try {
    // 2. Busca todas as ocorrências no back-end da Pessoa 3 (GET /api/ocorrencias)
    const respOcorrencias = await fetch("/api/ocorrencias");
    if (!respOcorrencias.ok) throw new Error("Erro ao buscar ocorrências");

    const dadosBanco = await respOcorrencias.json();

    // Converte os documentos do MongoDB para o formato usado pela tabela profissional
    occurrenceData.occurrences = dadosBanco.map(doc => {
      const dataIso = (doc.criadoEm || doc.dataHora || new Date().toISOString()).split("T")[0];
      const jaEmAtendimento = doc.status === "Em Atendimento" || doc.status === "Concluída";

      return {
        id: doc.id || doc._id,
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
        order: jaEmAtendimento
          ? {
              id: `OS-${String(doc.protocolo || doc.id).slice(-4)}`,
              status: doc.status === "Concluída" ? "Concluída" : "Em andamento",
              teamId: "TEAM-01",
              teamName: doc.observacaoInterna || "Equipe designada"
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