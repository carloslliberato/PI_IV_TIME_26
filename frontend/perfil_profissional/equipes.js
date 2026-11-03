// Registros de demonstração para visualizar as equipes do município sem depender do backend.
// FUTURO API/BD: carregar município, equipes, gestores e funcionários por GET /api/municipios/{id}/equipes.
// Campos da equipe: id, nome, região, status, gestor e funcionários com id, nome, função, disponibilidade e contato.
const teamsDemoData = {
  municipality: { id: "campinas-demo", name: "Campinas - SP" },
  teams: [
    {
      id: "EQ-001", name: "Equipe Norte", region: "Taquaral e região Norte", status: "Indisponível", manager: "Mariana Costa",
      employees: [
        { id: "FUN-001", name: "Rafael Almeida", role: "Engenheiro florestal", available: false, contact: "(19) 98821-3401" },
        { id: "FUN-002", name: "Camila Souza", role: "Podadora", available: false, contact: "(19) 98821-3402" },
        { id: "FUN-003", name: "Lucas Ferreira", role: "Auxiliar de arborização", available: false, contact: "(19) 98821-3403" }
      ]
    },
    {
      id: "EQ-002", name: "Equipe Central", region: "Centro e Cambuí", status: "Disponível", manager: "André Martins",
      employees: [
        { id: "FUN-004", name: "Paula Ribeiro", role: "Técnica ambiental", available: true, contact: "(19) 98821-3410" },
        { id: "FUN-005", name: "Diego Santos", role: "Podador", available: true, contact: "(19) 98821-3411" }
      ]
    },
    {
      id: "EQ-003", name: "Equipe Sul", region: "Ponte Preta e região Sul", status: "Indisponível", manager: "Juliana Nogueira",
      employees: [
        { id: "FUN-006", name: "Bruno Lima", role: "Engenheiro agrônomo", available: false, contact: "(19) 98821-3420" },
        { id: "FUN-007", name: "Aline Carvalho", role: "Técnica de campo", available: false, contact: "(19) 98821-3421" },
        { id: "FUN-008", name: "Pedro Oliveira", role: "Auxiliar de arborização", available: false, contact: "(19) 98821-3422" },
        { id: "FUN-009", name: "Fernanda Melo", role: "Podadora", available: false, contact: "(19) 98821-3423" }
      ]
    },
    {
      id: "EQ-004", name: "Equipe de poda", region: "Atendimento municipal", status: "Disponível", manager: "Roberto Dias",
      employees: [
        { id: "FUN-010", name: "Sofia Mendes", role: "Supervisora de poda", available: true, contact: "(19) 98821-3430" },
        { id: "FUN-011", name: "Gabriel Rocha", role: "Podador", available: true, contact: "(19) 98821-3431" }
      ]
    }
  ],
  // Apenas ordens abertas sem equipe podem ser escolhidas no fluxo de direcionamento.
  // FUTURO API/BD: consultar GET /api/municipios/{id}/ordens-servico?status=aberta&semEquipe=true.
  serviceOrders: [
    { id: "OS-2026-0390", municipalityId: "campinas-demo", occurrenceType: "Galho quebrado", neighborhood: "Jardim Chapadão", status: "Aguardando equipe", teamId: null, description: "Remover galho quebrado e desobstruir a passagem de pedestres." },
    { id: "OS-2026-0388", municipalityId: "campinas-demo", occurrenceType: "Árvore inclinada", neighborhood: "Centro", status: "Pendente", teamId: null, description: "Avaliar estabilidade do tronco e sinalizar a área durante a vistoria." },
    { id: "OS-2026-0386", municipalityId: "campinas-demo", occurrenceType: "Poda preventiva", neighborhood: "Taquaral", status: "Em andamento", teamId: "EQ-001", description: "Executar poda preventiva de galhos próximos à rede." },
    { id: "OS-2026-0370", municipalityId: "campinas-demo", occurrenceType: "Raiz danificando calçada", neighborhood: "Cambuí", status: "Concluída", teamId: "EQ-003", description: "Reparar o trecho de calçada sem comprometer as raízes." }
  ]
};

// Guarda os elementos estáticos que são atualizados durante a navegação pela tela.
const teamsPage = {
  municipality: document.getElementById("teamsMunicipality"),
  search: document.getElementById("teamsSearch"),
  tableBody: document.getElementById("teamsTableBody"),
  resultCount: document.getElementById("teamsResultCount"),
  emptyState: document.getElementById("teamsEmpty"),
  detailsModal: document.getElementById("teamDetailsModal"),
  detailsContent: document.getElementById("teamDetailsContent"),
  employeeModal: document.getElementById("employeeModal"),
  employeeContent: document.getElementById("employeeModalContent"),
  ordersModal: document.getElementById("teamOrdersModal"),
  ordersContent: document.getElementById("teamOrdersModalContent"),
  toast: document.getElementById("teamsToast")
};
let selectedTeamId = null;
let teamsToastTimer = null;
let employeeRequestInProgress = false;

// Escapa os dados da demonstração antes de inseri-los como HTML.
function escapeTeamText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Normaliza os termos de pesquisa para ignorar caixa e acentos.
function normalizeTeamText(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

// Busca as equipes do município atual que correspondem ao texto digitado.
// FUTURO API/BD: aplicar o município e o termo no backend e paginar se houver muitos resultados.
function getVisibleTeams() {
  const municipalityId = teamsDemoData.municipality.id;
  const query = normalizeTeamText(teamsPage.search.value.trim());
  return teamsDemoData.teams.filter(team => {
    const matchesMunicipality = team.municipalityId === undefined || team.municipalityId === municipalityId;
    const searchable = [team.id, team.name, team.region, team.status, team.manager];
    return matchesMunicipality && (!query || searchable.some(value => normalizeTeamText(value).includes(query)));
  });
}

// Desenha o resumo das equipes e disponibiliza o ID para abrir os detalhes.
function renderTeamsTable() {
  const teams = getVisibleTeams();
  teamsPage.tableBody.innerHTML = teams.map(team => `
    <tr>
      <td><button class="team-id-link" type="button" data-open-team="${escapeTeamText(team.id)}">${escapeTeamText(team.id)}</button></td>
      <td><strong>${escapeTeamText(team.name)}</strong></td>
      <td>${escapeTeamText(team.region)}</td>
      <td><span class="team-status-badge ${team.status === "Disponível" ? "available" : "unavailable"}">${escapeTeamText(team.status)}</span></td>
      <td>${escapeTeamText(team.manager)}</td>
      <td>${team.employees.length}</td>
    </tr>
  `).join("");

  teamsPage.resultCount.textContent = `${teams.length} ${teams.length === 1 ? "equipe encontrada" : "equipes encontradas"}`;
  teamsPage.emptyState.hidden = teams.length > 0;
}

// Encontra a equipe atualmente selecionada na lista fictícia local.
function getSelectedTeam() {
  return teamsDemoData.teams.find(team => team.id === selectedTeamId) || null;
}

// Retorna uma etiqueta de disponibilidade para integrantes.
function renderEmployeeAvailability(employee) {
  const label = employee.available ? "Disponível" : "Indisponível";
  const className = employee.available ? "available" : "unavailable";
  return `<span class="team-status-badge ${className}">${label}</span>`;
}

// Desenha dados da equipe, lista de funcionários e ações de gerenciamento.
function renderTeamDetails(team) {
  const employeeRows = team.employees.length
    ? team.employees.map(employee => `
      <tr>
        <td><strong>${escapeTeamText(employee.name)}</strong></td>
        <td>${escapeTeamText(employee.role)}</td>
        <td>${renderEmployeeAvailability(employee)}</td>
        <td><a class="team-contact-link" href="tel:${escapeTeamText(employee.contact.replace(/[^\d+]/g, ""))}">${escapeTeamText(employee.contact)}</a></td>
      </tr>
    `).join("")
    : '<tr><td class="team-members-empty-cell" colspan="4">Ainda não há funcionários cadastrados nesta equipe.</td></tr>';

  teamsPage.detailsContent.innerHTML = `
    <header class="team-detail-heading">
      <span class="team-detail-icon"><i class="bi bi-people-fill" aria-hidden="true"></i></span>
      <div><span class="team-detail-eyebrow">${escapeTeamText(team.id)} · ${escapeTeamText(team.region)}</span><h2 id="teamDetailsTitle">${escapeTeamText(team.name)}</h2></div>
    </header>
    <div class="team-detail-summary">
      <div><span>Status</span><strong><span class="team-status-badge ${team.status === "Disponível" ? "available" : "unavailable"}">${escapeTeamText(team.status)}</span></strong></div>
      <div><span>Gestor</span><strong>${escapeTeamText(team.manager)}</strong></div>
      <div><span>Região de atuação</span><strong>${escapeTeamText(team.region)}</strong></div>
      <div><span>Integrantes</span><strong>${team.employees.length}</strong></div>
    </div>
    <section class="team-members-section">
      <div class="team-section-heading"><div><h3>Funcionários da equipe</h3><p>Nome, função, disponibilidade e contato.</p></div><button class="team-primary-button" type="button" data-add-employee><i class="bi bi-person-plus" aria-hidden="true"></i>Cadastrar funcionário</button></div>
      <div class="team-members-table-wrap"><table class="team-members-table"><thead><tr><th>Nome</th><th>Cargo/função</th><th>Disponibilidade</th><th>Contato</th></tr></thead><tbody>${employeeRows}</tbody></table></div>
    </section>
    <section class="team-orders-action">
      <div><h3>Ordens de serviço</h3><p>Direcione uma ordem aberta e ainda sem equipe.</p></div>
      <button class="team-secondary-button" type="button" data-assign-order><i class="bi bi-arrow-left-right" aria-hidden="true"></i>Direcionar ordem de serviço</button>
    </section>
  `;
}

// Abre os detalhes da equipe escolhida e prepara sua lista de integrantes.
function openTeamDetails(teamId) {
  const team = teamsDemoData.teams.find(item => item.id === teamId);
  if (!team) return;
  selectedTeamId = team.id;
  renderTeamDetails(team);
  teamsPage.detailsModal.hidden = false;
  document.body.classList.add("teams-modal-open");
  document.getElementById("closeTeamDetails").focus();
}

// Fecha o modal de equipe quando nenhum modal obrigatório está aberto por cima dele.
function closeTeamDetails() {
  if (!teamsPage.employeeModal.hidden || !teamsPage.ordersModal.hidden) return;
  teamsPage.detailsModal.hidden = true;
  document.body.classList.remove("teams-modal-open");
}

// Preenche o cadastro com equipe/região e deixa editáveis os dados do funcionário.
function openEmployeeForm() {
  const team = getSelectedTeam();
  if (!team) return;
  teamsPage.employeeContent.innerHTML = `
    <header class="employee-form-heading"><span class="employee-form-icon"><i class="bi bi-person-plus-fill" aria-hidden="true"></i></span><div><span>INTEGRANTE DA EQUIPE</span><h2 id="employeeModalTitle">Cadastrar funcionário</h2><p>Preencha os dados para enviar o cadastro.</p></div></header>
    <form id="employeeRegistrationForm" novalidate>
      <label>Equipe<select name="teamName" readonly disabled><option>${escapeTeamText(team.name)}</option></select></label>
      <label>Região de atuação<input name="region" value="${escapeTeamText(team.region)}" readonly></label>
      <label>Nome completo<input name="fullName" autocomplete="name" required maxlength="120" placeholder="Nome e sobrenome"></label>
      <label>Função<input name="role" required maxlength="80" placeholder="Ex.: Podador"></label>
      <label>Contato<input name="contact" type="tel" autocomplete="tel" required maxlength="40" placeholder="Telefone ou e-mail"></label>
      <p class="employee-form-feedback" id="employeeFormFeedback" role="status" aria-live="polite"></p>
      <button class="team-primary-button employee-save-button" type="submit"><i class="bi bi-check2-circle" aria-hidden="true"></i>Salvar funcionário</button>
    </form>
  `;
  teamsPage.employeeModal.hidden = false;
  document.body.classList.add("teams-employee-modal-open");
  teamsPage.employeeContent.querySelector("[name='fullName']").focus();
}

// Envia os dados ao endpoint previsto; só fecha o modal depois de uma resposta de sucesso.
// FUTURO BACK-END: POST /api/equipes/{equipeId}/funcionarios, com nomeCompleto, funcao, contato e regiaoAtuacao.
// A API deverá validar permissões e campos, persistir o funcionário e retornar seu ID/disponibilidade.
async function submitEmployeeRegistration(form) {
  if (employeeRequestInProgress) return;
  const team = getSelectedTeam();
  const feedback = document.getElementById("employeeFormFeedback");
  const saveButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const employeePayload = {
    equipeId: team?.id,
    regiaoAtuacao: team?.region,
    nomeCompleto: String(formData.get("fullName") || "").trim(),
    funcao: String(formData.get("role") || "").trim(),
    contato: String(formData.get("contact") || "").trim()
  };

  if (!team || !employeePayload.nomeCompleto || !employeePayload.funcao || !employeePayload.contato) {
    feedback.textContent = "Preencha todos os campos para salvar o funcionário.";
    feedback.classList.add("is-error");
    return;
  }

  employeeRequestInProgress = true;
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i>Enviando...';
  feedback.textContent = "Enviando o cadastro para o servidor...";
  feedback.classList.remove("is-error");

  try {
    // A chamada usa o endpoint planejado; enquanto a API não existir, o modal permanece aberto e informa a falha.
    const response = await fetch(`/api/equipes/${encodeURIComponent(team.id)}/funcionarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(employeePayload)
    });
    if (!response.ok) throw new Error(`O servidor respondeu com status ${response.status}.`);

    // Usa os dados devolvidos pelo servidor e atualiza a visualização local da equipe.
    const result = await response.json().catch(() => ({}));
    const savedEmployee = result.funcionario || result;
    team.employees.push({
      id: savedEmployee.id || `FUN-${String(Date.now()).slice(-6)}`,
      name: savedEmployee.nomeCompleto || employeePayload.nomeCompleto,
      role: savedEmployee.funcao || employeePayload.funcao,
      available: savedEmployee.disponivel ?? true,
      contact: savedEmployee.contato || employeePayload.contato
    });

    employeeRequestInProgress = false;
    teamsPage.employeeModal.hidden = true;
    document.body.classList.remove("teams-employee-modal-open");
    renderTeamDetails(team);
    renderTeamsTable();
    showTeamsToast("Funcionário cadastrado com sucesso.");
  } catch (error) {
    // Mantém o formulário aberto para correção/tentativa novamente quando o servidor falhar.
    feedback.textContent = `Não foi possível salvar. ${error.message} Verifique a conexão com o servidor e tente novamente.`;
    feedback.classList.add("is-error");
  } finally {
    employeeRequestInProgress = false;
    if (saveButton.isConnected) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i>Salvar funcionário';
    }
  }
}

// Lista as ordens abertas do município que ainda aguardam equipe para a equipe atual.
function openTeamOrdersSelector() {
  const team = getSelectedTeam();
  if (!team) return;
  const openOrders = teamsDemoData.serviceOrders.filter(order =>
    order.municipalityId === teamsDemoData.municipality.id &&
    !order.teamId && ["Pendente", "Aguardando equipe"].includes(order.status)
  );

  const orderChoices = openOrders.length
    ? openOrders.map(order => `
      <label class="team-order-choice">
        <input type="radio" name="serviceOrderId" value="${escapeTeamText(order.id)}" required>
        <span class="team-order-choice-copy"><strong>${escapeTeamText(order.id)} · ${escapeTeamText(order.occurrenceType)}</strong><small>${escapeTeamText(order.neighborhood)} · ${escapeTeamText(order.status)}</small><span>${escapeTeamText(order.description)}</span></span>
      </label>
    `).join("")
    : '<div class="team-orders-empty"><i class="bi bi-check2-circle" aria-hidden="true"></i><strong>Não há ordens abertas aguardando equipe.</strong></div>';

  teamsPage.ordersContent.innerHTML = `
    <header class="team-orders-heading"><span class="team-detail-icon"><i class="bi bi-clipboard2-plus" aria-hidden="true"></i></span><div><span class="team-detail-eyebrow">${escapeTeamText(team.name)}</span><h2 id="teamOrdersTitle">Direcionar ordem de serviço</h2></div></header>
    <p class="team-orders-intro">Selecione uma ordem municipal pendente ou aguardando abertura de atendimento.</p>
    ${openOrders.length ? `<form id="assignTeamOrderForm"><div class="team-order-choices">${orderChoices}</div><button class="team-primary-button team-assign-order-button" type="submit"><i class="bi bi-arrow-left-right" aria-hidden="true"></i>Direcionar para esta equipe</button></form>` : orderChoices}
  `;
  teamsPage.ordersModal.hidden = false;
  teamsPage.ordersContent.querySelector("input[type='radio']")?.focus();
}

// Atualiza a ordem escolhida e marca a equipe como indisponível enquanto atende o serviço.
// FUTURO API/BD: PATCH /api/ordens-servico/{id}/equipe com equipeId; atualizar status e auditoria da atribuição.
function assignServiceOrder(orderId) {
  const team = getSelectedTeam();
  const order = teamsDemoData.serviceOrders.find(item => item.id === orderId);
  if (!team || !order || order.teamId || !["Pendente", "Aguardando equipe"].includes(order.status)) return;

  order.teamId = team.id;
  order.teamName = team.name;
  order.status = "Em andamento";
  team.status = "Indisponível";
  team.employees.forEach(employee => { employee.available = false; });
  teamsPage.ordersModal.hidden = true;
  renderTeamDetails(team);
  renderTeamsTable();
  showTeamsToast(`${order.id} direcionada para ${team.name}.`);
}

// Mostra uma confirmação breve depois de um cadastro ou direcionamento local.
function showTeamsToast(message) {
  teamsPage.toast.textContent = message;
  teamsPage.toast.hidden = false;
  window.clearTimeout(teamsToastTimer);
  teamsToastTimer = window.setTimeout(() => { teamsPage.toast.hidden = true; }, 3600);
}

// Conecta a tabela, os modais, a submissão do funcionário e o direcionamento de ordens.
function setupTeamsPageEvents() {
  teamsPage.search.addEventListener("input", renderTeamsTable);
  teamsPage.tableBody.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-team]");
    if (trigger) openTeamDetails(trigger.dataset.openTeam);
  });

  teamsPage.detailsContent.addEventListener("click", event => {
    if (event.target.closest("[data-add-employee]")) openEmployeeForm();
    if (event.target.closest("[data-assign-order]")) openTeamOrdersSelector();
  });
  teamsPage.employeeContent.addEventListener("submit", event => {
    if (event.target.id !== "employeeRegistrationForm") return;
    event.preventDefault();
    submitEmployeeRegistration(event.target);
  });
  teamsPage.ordersContent.addEventListener("submit", event => {
    if (event.target.id !== "assignTeamOrderForm") return;
    event.preventDefault();
    const orderId = new FormData(event.target).get("serviceOrderId");
    if (orderId) assignServiceOrder(String(orderId));
  });

  document.getElementById("closeTeamDetails").addEventListener("click", closeTeamDetails);
  document.getElementById("closeTeamOrders").addEventListener("click", () => { teamsPage.ordersModal.hidden = true; });
  teamsPage.detailsModal.addEventListener("click", event => {
    if (event.target === teamsPage.detailsModal) closeTeamDetails();
  });
  teamsPage.ordersModal.addEventListener("click", event => {
    if (event.target === teamsPage.ordersModal) teamsPage.ordersModal.hidden = true;
  });

  // A ficha de funcionário não pode ser dispensada sem salvar; a ordem modal tem Escape normal.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!teamsPage.employeeModal.hidden) { event.preventDefault(); return; }
    if (!teamsPage.ordersModal.hidden) { teamsPage.ordersModal.hidden = true; return; }
    if (!teamsPage.detailsModal.hidden) closeTeamDetails();
  });
}

// Prepara o município demonstrativo, instala os eventos e renderiza a tabela inicial.
// FUTURO API/BD: resolver o município pela sessão autenticada e carregar as equipes relacionadas ao setor.
function initializeTeamsPage() {
  teamsPage.municipality.textContent = teamsDemoData.municipality.name;
  setupTeamsPageEvents();
  renderTeamsTable();
}

initializeTeamsPage();
