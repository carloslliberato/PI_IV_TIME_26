// Mantém as equipes retornadas pela API; ordens ainda pertencem ao fluxo demonstrativo.
const teamsData = {
  municipality: { id: "campinas-demo", name: "Campinas - SP" },
  teams: [],
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
  search: document.getElementById("teamsSearch"),
  statusFilter: document.getElementById("teamsStatusFilter"),
  tableBody: document.getElementById("teamsTableBody"),
  resultCount: document.getElementById("teamsResultCount"),
  emptyState: document.getElementById("teamsEmpty"),
  createModal: document.getElementById("createTeamModal"),
  createForm: document.getElementById("createTeamForm"),
  createFeedback: document.getElementById("createTeamFeedback"),
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
let teamRequestInProgress = false;
let teamsSearchTimer = null;
let teamsLoadRequest = 0;
const teamDeletionsInProgress = new Set();

// Escapa os dados da API antes de inseri-los como HTML.
function escapeTeamText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Valida o formato de e-mail também nas telas que usam validação personalizada.
function isValidTeamEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Desenha somente os registros que o backend retornou para os filtros atuais.
function renderTeamsTable() {
  const teams = teamsData.teams;
  teamsPage.tableBody.innerHTML = teams.map(team => `
    <tr>
      <td><button class="team-name-link" type="button" data-open-team="${escapeTeamText(team.id)}">${escapeTeamText(team.name)}</button></td>
      <td>${escapeTeamText(team.region)}</td>
      <td><span class="team-status-badge ${team.status === "Disponível" ? "available" : "unavailable"}">${escapeTeamText(team.status)}</span></td>
      <td>${escapeTeamText(team.manager)}</td>
      <td>${team.employees.length}</td>
      <td><button class="team-delete-button" type="button" data-delete-team="${escapeTeamText(team.id)}" aria-label="Excluir equipe ${escapeTeamText(team.name)}" title="Excluir equipe"><i class="bi bi-trash3" aria-hidden="true"></i></button></td>
    </tr>
  `).join("");

  teamsPage.resultCount.textContent = `${teams.length} ${teams.length === 1 ? "equipe encontrada" : "equipes encontradas"}`;
  teamsPage.emptyState.hidden = teams.length > 0;
  if (teams.length === 0) {
    document.getElementById("teamsEmptyTitle").textContent = "Nenhuma equipe encontrada";
    const filtrosAtivos = teamsPage.search.value.trim() || teamsPage.statusFilter.value;
    document.getElementById("teamsEmptyMessage").textContent = filtrosAtivos
      ? "Nenhuma equipe corresponde aos filtros informados."
      : "Ainda não há equipes cadastradas para esta conta.";
  }
}

// Consulta a API autenticada enviando texto e status para pesquisa no MongoDB.
async function loadTeams() {
  const requestId = ++teamsLoadRequest;
  const busca = teamsPage.search.value.trim();
  const status = teamsPage.statusFilter.value;
  const parametros = new URLSearchParams();
  if (busca) parametros.set("busca", busca);
  if (status) parametros.set("status", status);
  const queryString = parametros.toString();

  teamsPage.resultCount.textContent = "Carregando equipes...";
  try {
    const response = await fetch(`/api/equipes${queryString ? `?${queryString}` : ""}`, {
      method: "GET",
      credentials: "same-origin"
    });
    const responseText = await response.text();
    if (requestId !== teamsLoadRequest) return;

    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      const resposta = responseText.trim();
      const dica = response.status === 404
        ? "Confirme se o backend foi reiniciado e se a rota GET /api/equipes está ativa."
        : "A resposta do backend não está em formato JSON.";
      throw new Error(`${dica} Resposta recebida: ${resposta.slice(0, 180)}`);
    }

    if (!response.ok) {
      throw new Error(responseData.erro || `O servidor respondeu com status ${response.status}.`);
    }
    if (!Array.isArray(responseData.equipes)) {
      throw new Error("A resposta do servidor não contém uma lista de equipes.");
    }

    // Adapta o formato da API aos campos consumidos pela tabela e pelos detalhes.
    teamsData.teams = responseData.equipes.map(equipe => ({
      id: String(equipe.id),
      name: equipe.nome,
      region: equipe.regiaoAtuacao,
      status: equipe.status,
      manager: equipe.gestor,
      employees: (equipe.colaboradores || []).map(colaborador => ({
        id: String(colaborador.id),
        name: colaborador.nomeCompleto,
        role: colaborador.funcao,
        available: colaborador.disponivel,
        email: colaborador.email
          || (isValidTeamEmail(colaborador.contato) ? colaborador.contato : "")
      }))
    }));
    renderTeamsTable();
  } catch (error) {
    if (requestId !== teamsLoadRequest) return;

    // Informa o erro de leitura sem exibir os registros de demonstração como se fossem reais.
    console.error("Erro ao carregar equipes:", error);
    teamsPage.tableBody.innerHTML = "";
    teamsPage.resultCount.textContent = "Não foi possível carregar as equipes.";
    teamsPage.emptyState.hidden = false;
    document.getElementById("teamsEmptyTitle").textContent = "Erro ao carregar equipes";
    document.getElementById("teamsEmptyMessage").textContent = error.message;
  }
}

// Aguarda uma pausa curta na digitação antes de consultar novamente o banco.
function agendarBuscaDeEquipes() {
  window.clearTimeout(teamsSearchTimer);
  teamsSearchTimer = window.setTimeout(() => loadTeams(), 300);
}

// Abre o cadastro, que será vinculado ao município da conta autenticada.
function openCreateTeamModal() {
  teamsPage.createFeedback.textContent = "";
  teamsPage.createFeedback.classList.remove("is-error");
  teamsPage.createForm.reset();
  teamsPage.createModal.hidden = false;
  document.body.classList.add("teams-modal-open");
  teamsPage.createForm.elements.name.focus();
}

// Fecha o cadastro e devolve o foco ao botão que abriu o modal.
function closeCreateTeamModal() {
  teamsPage.createModal.hidden = true;
  document.body.classList.remove("teams-modal-open");
  document.getElementById("openCreateTeamModal").focus();
}

// Envia os campos do formulário; o backend obtém os IDs pela sessão autenticada.
async function submitTeamCreation(form) {
  if (teamRequestInProgress) return;

  // Lê os campos e remove espaços extras antes de enviar a requisição.
  const formData = new FormData(form);
  const teamPayload = {
    nome: String(formData.get("name") || "").trim(),
    regiaoAtuacao: String(formData.get("region") || "").trim(),
    gestor: String(formData.get("manager") || "").trim()
  };
  const feedback = teamsPage.createFeedback;
  const saveButton = form.querySelector("button[type='submit']");

  // Verifica campos após trim para não aceitar valores compostos apenas por espaços.
  if (!teamPayload.nome || !teamPayload.regiaoAtuacao || !teamPayload.gestor) {
    feedback.textContent = "Preencha o nome, a região de atuação e o e-mail do gestor.";
    feedback.classList.add("is-error");
    return;
  }
  if (!isValidTeamEmail(teamPayload.gestor)) {
    feedback.textContent = "Informe um e-mail válido para o gestor da equipe.";
    feedback.classList.add("is-error");
    return;
  }

  // Bloqueia envios repetidos e informa que a solicitação está sendo processada.
  teamRequestInProgress = true;
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i>Salvando...';
  feedback.textContent = "Enviando os dados da equipe para o servidor...";
  feedback.classList.remove("is-error");

  try {
    // Envia o cadastro; a sessão HTTP acompanha a requisição para identificar o funcionário.
    const response = await fetch("/api/equipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(teamPayload)
    });
    // Lê a resposta uma única vez para apresentar erros enviados pela API.
    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }
    if (!response.ok) {
      throw new Error(responseData.erro || `O servidor respondeu com status ${response.status}.`);
    }

    // Usa o ID e os dados confirmados pelo backend para atualizar a tabela.
    const savedTeam = responseData.equipe || responseData;
    if (!savedTeam.id) throw new Error("A resposta do servidor não contém o ID da equipe criada.");

    // Limpa os filtros para mostrar a nova equipe consultada do banco.
    teamsPage.search.value = "";
    teamsPage.statusFilter.value = "";
    closeCreateTeamModal();
    await loadTeams();
    showTeamsToast("Equipe criada com sucesso.");
  } catch (error) {
    // Mantém o modal aberto e apresenta o motivo para permitir corrigir ou tentar novamente.
    const erroDeValidacao = error.message === "Já existe uma equipe cadastrada com esse nome."
      || error.message === "Informe um e-mail válido para o gestor da equipe.";
    feedback.textContent = erroDeValidacao
      ? error.message
      : `Não foi possível criar a equipe. ${error.message} Verifique a conexão com o servidor e tente novamente.`;
    feedback.classList.add("is-error");
  } finally {
    // Libera o botão mesmo quando a chamada falha.
    teamRequestInProgress = false;
    if (saveButton.isConnected) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i>Salvar equipe';
    }
  }
}

// Encontra a equipe atualmente selecionada entre os dados carregados da API.
function getSelectedTeam() {
  return teamsData.teams.find(team => team.id === selectedTeamId) || null;
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
        <td>${isValidTeamEmail(employee.email) ? `<a class="team-email-link" href="mailto:${escapeTeamText(employee.email)}">${escapeTeamText(employee.email)}</a>` : escapeTeamText(employee.email || "—")}</td>
        <td><button class="team-delete-collaborator-button" type="button" data-remove-collaborator="${escapeTeamText(employee.id)}" aria-label="Excluir ${escapeTeamText(employee.name)}" title="${team.status === "Indisponível" ? "Não é possível excluir colaboradores de uma equipe indisponível." : "Excluir colaborador"}" ${team.status === "Indisponível" ? "disabled" : ""}><i class="bi bi-trash3" aria-hidden="true"></i></button></td>
      </tr>
    `).join("")
    : '<tr><td class="team-members-empty-cell" colspan="5">Ainda não há colaboradores cadastrados nessa equipe.</td></tr>';

  teamsPage.detailsContent.innerHTML = `
    <header class="team-detail-heading">
      <span class="team-detail-icon"><i class="bi bi-people-fill" aria-hidden="true"></i></span>
      <div><span class="team-detail-eyebrow">${escapeTeamText(team.id)} · ${escapeTeamText(team.region)}</span><h2 id="teamDetailsTitle">${escapeTeamText(team.name)}</h2></div>
    </header>
    <div class="team-detail-summary">
      <div><span>Status</span><strong><span class="team-status-badge ${team.status === "Disponível" ? "available" : "unavailable"}">${escapeTeamText(team.status)}</span></strong></div>
      <div><span>Gestor</span><strong>${escapeTeamText(team.manager)}</strong></div>
      <div><span>Região de atuação</span><strong>${escapeTeamText(team.region)}</strong></div>
      <div><span>Colaboradores</span><strong>${team.employees.length}</strong></div>
    </div>
    <section class="team-members-section">
      <div class="team-section-heading"><div><h3>Colaboradores da equipe</h3><p>Nome, função, disponibilidade e e-mail.</p></div><button class="team-primary-button" type="button" data-add-employee><i class="bi bi-person-plus" aria-hidden="true"></i>Cadastrar colaborador</button></div>
      <div class="team-members-table-wrap"><table class="team-members-table"><thead><tr><th>Nome</th><th>Cargo/função</th><th>Disponibilidade</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>${employeeRows}</tbody></table></div>
    </section>
    <section class="team-orders-action">
      <div><h3>Ordens de serviço</h3><p>Direcione uma ordem aberta e ainda sem equipe.</p></div>
      <button class="team-secondary-button" type="button" data-assign-order><i class="bi bi-arrow-left-right" aria-hidden="true"></i>Direcionar ordem de serviço</button>
    </section>
  `;
}

// Abre os detalhes da equipe escolhida e prepara sua lista de integrantes.
function openTeamDetails(teamId) {
  const team = teamsData.teams.find(item => item.id === teamId);
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

// Fecha o formulário de colaborador e devolve o foco ao botão que o abriu.
function closeEmployeeForm() {
  teamsPage.employeeModal.hidden = true;
  document.body.classList.remove("teams-employee-modal-open");
  const addButton = teamsPage.detailsContent.querySelector("[data-add-employee]");
  if (addButton) addButton.focus();
}

// Preenche o formulário do colaborador com os dados da equipe selecionada.
function openEmployeeForm() {
  const team = getSelectedTeam();
  if (!team) return;
  teamsPage.employeeContent.innerHTML = `
    <button class="teams-modal-close employee-form-close" type="button" data-close-employee aria-label="Fechar cadastro de colaborador"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
    <header class="employee-form-heading"><span class="employee-form-icon"><i class="bi bi-person-plus-fill" aria-hidden="true"></i></span><div><span>COLABORADOR DA EQUIPE</span><h2 id="employeeModalTitle">Cadastrar colaborador</h2><p>Preencha os dados para enviar o cadastro.</p></div></header>
    <form id="employeeRegistrationForm" novalidate>
      <label>Equipe<select name="teamName" readonly disabled><option>${escapeTeamText(team.name)}</option></select></label>
      <label>Região de atuação<input name="region" value="${escapeTeamText(team.region)}" readonly></label>
      <label>Nome completo<input name="fullName" autocomplete="name" required maxlength="120" placeholder="Nome e sobrenome"></label>
      <label>Função<input name="role" required maxlength="80" placeholder="Ex.: Podador"></label>
      <label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="colaborador@exemplo.com"></label>
      <p class="employee-form-feedback" id="employeeFormFeedback" role="status" aria-live="polite"></p>
      <button class="team-primary-button employee-save-button" type="submit"><i class="bi bi-check2-circle" aria-hidden="true"></i>Salvar colaborador</button>
    </form>
  `;
  teamsPage.employeeModal.hidden = false;
  document.body.classList.add("teams-employee-modal-open");
  teamsPage.employeeContent.querySelector("[name='fullName']").focus();
}

// Envia os dados ao backend e só fecha o formulário após confirmar a gravação.
async function submitEmployeeRegistration(form) {
  if (employeeRequestInProgress) return;
  const team = getSelectedTeam();
  const feedback = document.getElementById("employeeFormFeedback");
  const saveButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const employeePayload = {
    nomeCompleto: String(formData.get("fullName") || "").trim(),
    funcao: String(formData.get("role") || "").trim(),
    email: String(formData.get("email") || "").trim()
  };

  if (!team || !employeePayload.nomeCompleto || !employeePayload.funcao || !employeePayload.email) {
    feedback.textContent = "Preencha todos os campos para salvar o funcionário.";
    feedback.classList.add("is-error");
    return;
  }
  if (!isValidTeamEmail(employeePayload.email)) {
    feedback.textContent = "Informe um e-mail válido para o colaborador.";
    feedback.classList.add("is-error");
    return;
  }

  employeeRequestInProgress = true;
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i>Enviando...';
  feedback.textContent = "Enviando o cadastro para o servidor...";
  feedback.classList.remove("is-error");

  try {
    // Grava o colaborador como subdocumento da equipe selecionada.
    const response = await fetch(`/api/equipes/${encodeURIComponent(team.id)}/colaboradores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(employeePayload)
    });
    // Lê uma única vez a resposta para mostrar mensagens úteis do backend.
    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }
    if (!response.ok) {
      throw new Error(result.erro || `O servidor respondeu com status ${response.status}.`);
    }

    // Converte a resposta confirmada para o formato usado na interface.
    const savedEmployee = result.colaborador;
    if (!savedEmployee?.id) throw new Error("O servidor não retornou o ID do colaborador.");
    team.employees.push({
      id: String(savedEmployee.id),
      name: savedEmployee.nomeCompleto || employeePayload.nomeCompleto,
      role: savedEmployee.funcao || employeePayload.funcao,
      available: savedEmployee.disponivel ?? true,
      email: savedEmployee.email || employeePayload.email
    });

    employeeRequestInProgress = false;
    closeEmployeeForm();
    renderTeamDetails(team);
    renderTeamsTable();
    showTeamsToast("Funcionário cadastrado com sucesso.");
  } catch (error) {
    // Mantém o formulário aberto para correção/tentativa novamente quando o servidor falhar.
    const erroDeEmail = error.message === "Informe um e-mail válido para o colaborador."
      || error.message === "Já existe um colaborador cadastrado com este e-mail.";
    feedback.textContent = erroDeEmail
      ? error.message
      : `Não foi possível salvar. ${error.message} Verifique a conexão com o servidor e tente novamente.`;
    feedback.classList.add("is-error");
  } finally {
    employeeRequestInProgress = false;
    if (saveButton.isConnected) {
      saveButton.disabled = false;
      saveButton.innerHTML = '<i class="bi bi-check2-circle" aria-hidden="true"></i>Salvar colaborador';
    }
  }
}

// Pede confirmação antes de remover o colaborador do documento no MongoDB.
async function removeCollaborator(collaboratorId) {
  const team = getSelectedTeam();
  if (!team || team.status === "Indisponível") return;

  const collaborator = team.employees.find(item => item.id === collaboratorId);
  if (!collaborator) return;

  // Mantém a lista e o banco sem alterações se a pessoa cancelar.
  const confirmou = window.confirm(
    `Deseja realmente excluir ${collaborator.name} desta equipe?`);
  if (!confirmou) return;

  try {
    // Solicita ao backend excluir apenas o subdocumento selecionado.
    const response = await fetch(
      `/api/equipes/${encodeURIComponent(team.id)}/colaboradores/${encodeURIComponent(collaboratorId)}`,
      { method: "DELETE", credentials: "same-origin" }
    );
    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }
    if (!response.ok) {
      throw new Error(result.erro || `O servidor respondeu com status ${response.status}.`);
    }

    // Atualiza a lista local somente depois da confirmação do banco.
    team.employees = team.employees.filter(item => item.id !== collaboratorId);
    renderTeamDetails(team);
    renderTeamsTable();
    showTeamsToast("Colaborador excluído da equipe.");
  } catch (error) {
    // Informa falhas sem remover o colaborador da visualização local.
    showTeamsToast(`Não foi possível excluir o colaborador. ${error.message}`);
  }
}

// Exclui a equipe somente após confirmação e validação no servidor.
async function removeTeam(teamId) {
  const team = teamsData.teams.find(item => item.id === teamId);
  if (!team || teamDeletionsInProgress.has(teamId)) return;

  if (team.employees.length > 0 || team.status !== "Disponível") {
    showTeamsToast(
      "Não é possível excluir a equipe: ela possui colaboradores ou está indisponível."
    );
    return;
  }

  if (!window.confirm(`Deseja realmente excluir a equipe "${team.name}"?`)) return;

  const deleteButton = Array.from(
    teamsPage.tableBody.querySelectorAll("[data-delete-team]")
  ).find(button => button.dataset.deleteTeam === teamId);
  teamDeletionsInProgress.add(teamId);
  if (deleteButton) deleteButton.disabled = true;

  try {
    const response = await fetch(`/api/equipes/${encodeURIComponent(teamId)}`, {
      method: "DELETE",
      credentials: "same-origin"
    });
    const responseText = await response.text();
    let result;
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      if (response.status === 404) {
        throw new Error(
          "A rota de exclusão não está ativa. Pare e reinicie o backend para carregar a nova versão."
        );
      }
      throw new Error(`O servidor respondeu com status ${response.status} sem JSON válido.`);
    }

    if (response.status === 409) {
      showTeamsToast(result.erro || "Não é possível excluir esta equipe.");
      return;
    }
    if (!response.ok) {
      throw new Error(result.erro || `O servidor respondeu com status ${response.status}.`);
    }

    teamsData.teams = teamsData.teams.filter(item => item.id !== teamId);
    renderTeamsTable();
    showTeamsToast("Equipe excluída com sucesso.");
  } catch (error) {
    showTeamsToast(`Não foi possível excluir a equipe. ${error.message}`);
  } finally {
    teamDeletionsInProgress.delete(teamId);
    if (deleteButton && deleteButton.isConnected) deleteButton.disabled = false;
  }
}

// Lista as ordens abertas do município que ainda aguardam equipe para a equipe atual.
function openTeamOrdersSelector() {
  const team = getSelectedTeam();
  if (!team) return;
  const openOrders = teamsData.serviceOrders.filter(order =>
    order.municipalityId === teamsData.municipality.id &&
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
  const order = teamsData.serviceOrders.find(item => item.id === orderId);
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

// Conecta a busca, criação da equipe, modais de detalhes e ações existentes.
function setupTeamsPageEvents() {
  // Consulta o backend com cada busca após a pausa da digitação.
  teamsPage.search.addEventListener("input", agendarBuscaDeEquipes);
  // Aplica o status escolhido imediatamente no filtro do backend.
  teamsPage.statusFilter.addEventListener("change", loadTeams);
  document.getElementById("openCreateTeamModal").addEventListener("click", openCreateTeamModal);
  document.getElementById("closeCreateTeamModal").addEventListener("click", closeCreateTeamModal);
  teamsPage.createModal.addEventListener("click", event => {
    if (event.target === teamsPage.createModal) closeCreateTeamModal();
  });
  teamsPage.createForm.addEventListener("submit", event => {
    event.preventDefault();
    submitTeamCreation(event.currentTarget);
  });
  teamsPage.tableBody.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-team]");
    if (trigger) openTeamDetails(trigger.dataset.openTeam);
    const deleteButton = event.target.closest("[data-delete-team]");
    if (deleteButton) removeTeam(deleteButton.dataset.deleteTeam);
  });

  teamsPage.detailsContent.addEventListener("click", event => {
    if (event.target.closest("[data-add-employee]")) openEmployeeForm();
    if (event.target.closest("[data-assign-order]")) openTeamOrdersSelector();
    const deleteButton = event.target.closest("[data-remove-collaborator]");
    if (deleteButton) removeCollaborator(deleteButton.dataset.removeCollaborator);
  });
  teamsPage.employeeContent.addEventListener("click", event => {
    if (event.target.closest("[data-close-employee]")) closeEmployeeForm();
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

  // Fecha o cadastro de colaborador com Escape sem fechar os detalhes por trás.
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!teamsPage.createModal.hidden) { closeCreateTeamModal(); return; }
    if (!teamsPage.employeeModal.hidden) { closeEmployeeForm(); return; }
    if (!teamsPage.ordersModal.hidden) { teamsPage.ordersModal.hidden = true; return; }
    if (!teamsPage.detailsModal.hidden) closeTeamDetails();
  });
}

// Instala os eventos da tela e busca as equipes associadas na API.
function initializeTeamsPage() {
  setupTeamsPageEvents();
  loadTeams();
}

initializeTeamsPage();
