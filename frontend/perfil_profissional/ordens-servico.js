// Guarda as ordens recebidas e o estado da tela.
const serviceOrdersState ={
  orders: [],
  loading: true,
  error: "",
  detailsRequest: 0,
  previousFocus: null,
  currentOrderId: null,
  details: new Map(),
  orderRevisions: new Map(),
  operations: new Map(),
  completionDrafts: new Map(),
  completionForms: new Set(),
  teamForms: new Set(),
  teamOptions: new Map(),
  teamDrafts: new Map(),
  feedback: new Map()
};

// Guarda os elementos da página usados por filtros, tabela e modal.
const serviceOrdersPage ={
  search: document.getElementById("serviceOrdersSearch"),
  sort: document.getElementById("serviceOrdersSort"),
  statusFilter: document.getElementById("serviceOrdersStatusFilter"),
  tableBody: document.getElementById("serviceOrdersTableBody"),
  resultCount: document.getElementById("serviceOrdersResultCount"),
  emptyState: document.getElementById("serviceOrdersEmpty"),
  modal: document.getElementById("serviceOrderModal"),
  modalContent: document.getElementById("serviceOrderModalContent"),
  createModal: document.getElementById("createServiceOrderModal"),
  createForm: document.getElementById("createServiceOrderForm"),
  createFeedback: document.getElementById("createServiceOrderFeedback"),
  createMunicipality: document.getElementById("createServiceOrderMunicipality")
};

// Consulta as OS do município do funcionário autenticado.
async function buscarOrdensDeServico(){
  const resposta = await fetch("/api/ordens-servico",{credentials: "same-origin"});

  const dados = await resposta.json();

  if (!resposta.ok){
    const erro = new Error(dados.erro || "Não foi possível consultar as ordens de serviço.");

    erro.status = resposta.status;
    throw erro;
  }

  if (!dados || !Array.isArray(dados.ordens)){
    throw new Error("A API retornou uma lista de ordens inválida.");
  }

  return dados.ordens;
}

// Consulta uma OS pelo identificador.
async function buscarOrdemDeServico(id){
  const resposta = await fetch(`/api/ordens-servico/${encodeURIComponent(id)}`, {
    credentials: "same-origin", cache: "no-store"
  });
  const dados = await readServiceOrderResponse(resposta, "Não foi possível consultar a ordem de serviço.");
  return validateServiceOrderResponse(dados, id);
}

// Uma resposta ilegível após uma alteração exige consulta antes de novo envio.
async function readServiceOrderResponse(response, fallback){
  let data;
  try {
    data = await response.json();
  } catch {
    const error = new Error("Não foi possível confirmar a resposta.");
    error.status = response.status;
    error.invalidResponse = true;
    throw error;
  }
  if (!response.ok){
    const error = new Error(typeof data?.erro === "string" ? data.erro : fallback);
    error.status = response.status;
    throw error;
  }
  return data;
}

function validateServiceOrderResponse(data, id){
  const order = data?.ordem;
  if (!order || typeof order !== "object" || Array.isArray(order)
      || order.id !== id || typeof order.status !== "string"){
    const error = new Error("Não foi possível confirmar os dados da ordem.");
    error.invalidResponse = true;
    throw error;
  }
  return order;
}

// O relatório precisa identificar esta OS e o mesmo registro de conclusão.
function getServiceOrderCompletion(order){
  const report = order.intervencaoConclusao;
  return report && typeof report === "object" && !Array.isArray(report)
    && typeof report.id === "string" && report.id
    && report.ordemServicoId === order.id
    && order.intervencaoConclusaoId === report.id ? report : null;
}

// Solicita o cancelamento e usa a ordem atualizada devolvida pelo servidor.
async function cancelarOrdemDeServico(id){
  const resposta = await fetch("/api/ordens-servico/" + encodeURIComponent(id) + "/status",
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelada" })
    }
  );

  const dados = await readServiceOrderResponse(resposta, "Não foi possível cancelar a ordem de serviço.");
  const order = validateServiceOrderResponse(dados, id);
  if (order.status !== "Cancelada"){
    const error = new Error("Não foi possível confirmar o cancelamento.");
    error.invalidResponse = true;
    throw error;
  }
  return order;
}

// Envia uma vez o relatório de execução; eventuais falhas são verificadas por consulta.
async function concluirOrdemDeServico(id, data){
  const response = await fetch(`/api/ordens-servico/${encodeURIComponent(id)}/conclusao`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const body = await readServiceOrderResponse(response, "Não foi possível concluir a ordem de serviço.");
  const order = validateServiceOrderResponse(body, id);
  if (order.status !== "Concluída" || !getServiceOrderCompletion(order)){
    const error = new Error("Não foi possível confirmar a conclusão.");
    error.invalidResponse = true;
    throw error;
  }
  return order;
}

// Escapa texto antes de inserir conteúdo dinâmico na tabela ou na janela de detalhes.
function escapeServiceOrderText(value){
  return String(value ?? "—").replace(/[&<>"']/g, character =>
    ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[character]);
}

// Normaliza os termos para permitir buscas sem diferença entre caixa e acentos.
function normalizeServiceOrderText(value){
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

// Formata as datas para apresentação na tela.
function formatServiceOrderDate(isoDate){
  if (!isoDate) return "—";

  // Preserva as datas sem horário da demonstração durante a integração.
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)){
    const [ano, mes, dia] = isoDate.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const data = new Date(isoDate);

  if (Number.isNaN(data.getTime())) return "—";

  return data.toLocaleString("pt-BR");
}

// Devolve a classe visual correspondente ao status da ordem.
function serviceOrderStatusClass(status){
  if (status === "Aberta") return "pending";
  if (status === "Em andamento") return "in-progress";
  if (status === "Concluída") return "completed";
  if (status === "Cancelada") return "cancelled";

  return "";
}

// Filtra a lista recebida da API e ordena pela data de criação.
function getVisibleServiceOrders(){
  const query = normalizeServiceOrderText(serviceOrdersPage.search.value.trim());
  const selectedStatus = serviceOrdersPage.statusFilter.value;

  const records = serviceOrdersState.orders.filter(order =>{
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;

    const searchFields = [
      order.codigo,
      order.id,
      order.titulo,
      order.descricao,
      order.arvoreId,
      order.ocorrenciaId,
      order.equipeId
    ];

    // Verifica se algum dos campos corresponde ao texto pesquisado.
    const matchesSearch = !query || searchFields.some(value => normalizeServiceOrderText(value).includes(query));
    return matchesStatus && matchesSearch;
  });

  return records.sort((left, right) =>{
    const leftTime = Date.parse(left.dataCriacao);
    const rightTime = Date.parse(right.dataCriacao);

    if (Number.isNaN(leftTime)) return Number.isNaN(rightTime) ? 0 : 1;
    if (Number.isNaN(rightTime)) return -1;

    return serviceOrdersPage.sort.value === "oldest" ? leftTime - rightTime : rightTime - leftTime;
  });
}

// Apresenta carregamento, erro ou os registros encontrados.
function renderServiceOrdersTable(){
  serviceOrdersPage.emptyState.hidden = true;

  if (serviceOrdersState.loading || serviceOrdersState.error) {
    serviceOrdersPage.tableBody.innerHTML = "";
    serviceOrdersPage.resultCount.textContent = serviceOrdersState.loading ? "Carregando ordens..." : serviceOrdersState.error;
    return;
  }

  const records = getVisibleServiceOrders();

  serviceOrdersPage.tableBody.innerHTML = records.map(order => `
    <tr>
      <td>
        <button
          class="service-order-id-link"
          type="button"
          data-open-service-order="${escapeServiceOrderText(order.id)}">
          ${escapeServiceOrderText(order.codigo || order.id)}
        </button>
      </td>
      <td>${escapeServiceOrderText(order.titulo)}</td>
      <td>${escapeServiceOrderText(order.equipeId ?? "Não atribuída")}</td>
      <td><span class="service-order-status ${serviceOrderStatusClass(order.status)}">${escapeServiceOrderText(order.status)}</span></td>
    </tr>
  `).join("");

  serviceOrdersPage.resultCount.textContent =
    `${records.length} ${records.length === 1 ? "ordem encontrada" : "ordens encontradas"}`;

  serviceOrdersPage.emptyState.querySelector("span").textContent =
    serviceOrdersState.orders.length === 0
      ? "Não há ordens de serviço cadastradas para o seu município."
      : "Ajuste a busca ou o filtro de status.";

  serviceOrdersPage.emptyState.hidden = records.length > 0;
}

// Escolhe uma mensagem apropriada para a falha da consulta.
function getServiceOrdersErrorMessage(error, fallback){
  if (error.status === 401){
    return "Faça login novamente para consultar as ordens de serviço.";
  }

  if (error.status === 403){
    return error.message || "Você não tem permissão para consultar ordens de serviço.";
  }

  if (error.status === 404){
    return "OS não encontrada nesse município.";
  }

  return fallback;
}

// Verifica o estado da OS antes de mostrar ou executar uma alteração.
function canChangeServiceOrder(order){
  return order && (order.status === "Aberta" || order.status === "Em andamento");
}

function isCurrentServiceOrder(orderId){
  return !serviceOrdersPage.modal.hidden && serviceOrdersState.currentOrderId === orderId;
}

// Mantém o rascunho separado para cada OS, inclusive quando a janela é fechada.
function getServiceOrderCompletionDraft(orderId){
  if (!serviceOrdersState.completionDrafts.has(orderId)){
    const now = new Date();
    const part = value => String(value).padStart(2, "0");
    const localDate = `${now.getFullYear()}-${part(now.getMonth() + 1)}-${part(now.getDate())}`
      + `T${part(now.getHours())}:${part(now.getMinutes())}`;
    serviceOrdersState.completionDrafts.set(orderId, {
      tipo: "", descricao: "", dataExecucao: localDate, fotos: ""
    });
  }
  return serviceOrdersState.completionDrafts.get(orderId);
}

function saveServiceOrderCompletionDraft(form){
  const orderId = form.dataset.completeServiceOrder;
  const draft = {};
  for (const name of ["tipo", "descricao", "dataExecucao", "fotos"]){
    draft[name] = form.elements.namedItem(name).value;
  }
  serviceOrdersState.completionDrafts.set(orderId, draft);
  return draft;
}

// Aceita somente links de fotos que o usuário escolhe abrir, sem carregar imagens.
function normalizeServiceOrderPhotoLink(value){
  if (typeof value !== "string" || value.trim().length > 2048) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname
        || url.username || url.password || url.href.length > 2048) return null;
    return url.href;
  } catch {
    return null;
  }
}

function validateServiceOrderCompletionDraft(draft){
  const tipo = draft.tipo.trim();
  const descricao = draft.descricao.trim();
  if (!tipo || tipo.length > 80){
    throw new Error("Informe o tipo de serviço com até 80 caracteres.");
  }
  if (!descricao || descricao.length > 4000){
    throw new Error("Descreva o serviço realizado com até 4.000 caracteres.");
  }
  const executionDate = new Date(draft.dataExecucao);
  if (!draft.dataExecucao || Number.isNaN(executionDate.getTime())){
    throw new Error("Informe a data e o horário da execução.");
  }
  if (executionDate.getTime() > Date.now()){
    throw new Error("A execução não pode estar no futuro.");
  }
  const lines = draft.fotos.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 10){
    throw new Error("Informe no máximo 10 links de fotos, um por linha.");
  }
  const fotos = lines.map(normalizeServiceOrderPhotoLink);
  if (fotos.some(link => !link)){
    throw new Error("Use links http ou https, sem usuário ou senha e com até 2.048 caracteres.");
  }
  return { tipo, descricao, dataExecucao: executionDate.toISOString(), fotos };
}

function renderServiceOrderCompletionForm(order, blocked){
  const draft = getServiceOrderCompletionDraft(order.id);
  return `
    <section class="service-order-completion-editor" aria-labelledby="serviceOrderCompletionTitle">
      <h3 id="serviceOrderCompletionTitle">Registrar conclusão do serviço</h3>
      <p>Descreva o que foi realizado. Após concluir, a ordem e este registro ficarão disponíveis para consulta.</p>
      <form class="service-order-completion-form" data-complete-service-order="${escapeServiceOrderText(order.id)}">
        <fieldset ${blocked ? "disabled" : ""}>
          <legend class="visually-hidden">Dados da execução</legend>
          <label for="serviceOrderCompletionType">Tipo de serviço
            <input id="serviceOrderCompletionType" name="tipo" list="serviceOrderCompletionTypes"
              maxlength="80" required value="${escapeServiceOrderText(draft.tipo)}"
              placeholder="Ex.: Poda ou inspeção">
          </label>
          <datalist id="serviceOrderCompletionTypes"><option value="Poda"><option value="Inspeção"><option value="Outro"></datalist>
          <label for="serviceOrderCompletionDate">Data e horário da execução
            <input id="serviceOrderCompletionDate" name="dataExecucao" type="datetime-local"
              required value="${escapeServiceOrderText(draft.dataExecucao)}" aria-describedby="serviceOrderExecutionHint">
            <small id="serviceOrderExecutionHint">Use o horário do seu dispositivo.</small>
          </label>
          <label class="service-order-create-wide" for="serviceOrderCompletionDescription">Serviço realizado
            <textarea id="serviceOrderCompletionDescription" name="descricao" rows="5"
              maxlength="4000" required placeholder="Descreva a execução e o resultado do serviço">${escapeServiceOrderText(draft.descricao)}</textarea>
          </label>
          <label class="service-order-create-wide" for="serviceOrderCompletionPhotos">Links de fotos <span>(opcional)</span>
            <textarea id="serviceOrderCompletionPhotos" name="fotos" rows="3" maxlength="20510"
              placeholder="https://exemplo.com/foto.jpg" aria-describedby="serviceOrderPhotosHint">${escapeServiceOrderText(draft.fotos)}</textarea>
            <small id="serviceOrderPhotosHint">Até 10 links http ou https, um por linha. As fotos devem estar publicadas em outro local.</small>
          </label>
          <div class="service-order-create-actions">
            <button class="service-order-cancel-button" type="button" data-close-completion-form="${escapeServiceOrderText(order.id)}">Voltar aos detalhes</button>
            <button class="service-orders-create-button" type="submit"><i class="bi bi-check2-circle" aria-hidden="true"></i>Concluir serviço</button>
          </div>
        </fieldset>
      </form>
    </section>`;
}

function renderServiceOrderCompletionReport(order){
  if (order.status !== "Concluída") return "";
  const report = getServiceOrderCompletion(order);
  if (!report){
    return `<p class="service-order-not-completed">Esta ordem está concluída. Não há relatório de execução disponível para consulta.</p>`;
  }
  const photos = (Array.isArray(report.fotos) ? report.fotos : [])
    .map(normalizeServiceOrderPhotoLink).filter(Boolean);
  return `
    <section class="service-order-completion" aria-labelledby="serviceOrderReportTitle">
      <h3 id="serviceOrderReportTitle"><i class="bi bi-check2-circle" aria-hidden="true"></i>Registro de conclusão</h3>
      <dl class="service-order-report-metadata">
        <div><dt>Tipo de serviço</dt><dd>${escapeServiceOrderText(report.tipo)}</dd></div>
        <div><dt>Executado em</dt><dd>${escapeServiceOrderText(formatServiceOrderDate(report.dataExecucao))}</dd></div>
        <div><dt>Registrado em</dt><dd>${escapeServiceOrderText(formatServiceOrderDate(report.dataCriacao))}</dd></div>
        <div><dt>ID do responsável</dt><dd>${escapeServiceOrderText(report.usuarioId)}</dd></div>
      </dl>
      <h4>Serviço realizado</h4>
      <p class="service-order-preserve-lines">${escapeServiceOrderText(report.descricao)}</p>
      ${photos.length ? `<h4>Fotos</h4><ul class="service-order-photo-links">${photos.map((url, index) => `
        <li><a href="${escapeServiceOrderText(url)}" target="_blank" rel="noopener noreferrer">Ver foto ${index + 1}<span class="visually-hidden"> (abre em outra aba)</span></a></li>
      `).join("")}</ul>` : "<p>Nenhum link de foto informado.</p>"}
      <span>Registro finalizado, disponível somente para consulta.</span>
    </section>`;
}

// Consulta apenas as equipes autorizadas e a disponibilidade calculada para esta OS.
async function buscarEquipesDaOrdem(orderId){
  const response = await fetch(`/api/ordens-servico/${encodeURIComponent(orderId)}/equipes`, {
    credentials: "same-origin", cache: "no-store"
  });
  const body = await readServiceOrderResponse(response, "Não foi possível consultar as equipes.");
  if (!Array.isArray(body?.equipes) || body.equipes.some(team => !team
      || typeof team.id !== "string" || !/^[a-f0-9]{24}$/i.test(team.id)
      || typeof team.nome !== "string" || typeof team.disponivel !== "boolean"
      || typeof team.atual !== "boolean")){
    throw new Error("Não foi possível confirmar a lista de equipes.");
  }
  return body.equipes;
}

async function atribuirEquipeDaOrdem(orderId, equipeId){
  const response = await fetch(`/api/ordens-servico/${encodeURIComponent(orderId)}/equipe`, {
    method: "PATCH", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ equipeId })
  });
  const body = await readServiceOrderResponse(response, "Não foi possível atribuir a equipe.");
  const order = validateServiceOrderResponse(body, orderId);
  if (order.status !== "Em andamento" || order.equipeId !== equipeId){
    const error = new Error("Não foi possível confirmar a equipe da ordem.");
    error.invalidResponse = true;
    throw error;
  }
  return order;
}

function renderServiceOrderTeamForm(order, blocked){
  const state = serviceOrdersState.teamOptions.get(order.id);
  const teams = state?.items || [];
  const disabled = blocked || !state || state.loading || Boolean(state.error);
  const selected = serviceOrdersState.teamDrafts.get(order.id) || "";
  return `<section class="service-order-team-editor" aria-labelledby="serviceOrderTeamTitle">
    <h3 id="serviceOrderTeamTitle">${order.equipeId ? "Trocar equipe" : "Atribuir equipe"}</h3>
    <p>Selecione uma equipe disponível do município para executar esta ordem.</p>
    ${state?.loading ? '<p role="status">Consultando equipes...</p>' : ""}
    ${state?.error ? `<p class="service-order-team-error" role="status">${escapeServiceOrderText(state.error)}</p>` : ""}
    ${state && !state.loading && !state.error && !teams.length ? `
      <p>Nenhuma equipe cadastrada para este município. <a href="/equipes">Abra a página Equipes</a> para cadastrar e depois atualize a lista.</p>` : ""}
    <form data-assign-service-order="${escapeServiceOrderText(order.id)}">
      <label for="serviceOrderTeamSelect">Equipe
        <select id="serviceOrderTeamSelect" name="equipeId" required ${disabled || !teams.length ? "disabled" : ""}>
          <option value="">Selecione uma equipe</option>
          ${teams.map(team => `<option value="${escapeServiceOrderText(team.id)}" ${selected === team.id ? "selected" : ""}
            ${!team.disponivel && !team.atual ? "disabled" : ""}>${escapeServiceOrderText(team.nome)}${team.regiaoAtuacao ? " — " + escapeServiceOrderText(team.regiaoAtuacao) : ""}${team.atual ? " (Atual)" : !team.disponivel ? " (Ocupada)" : ""}</option>`).join("")}
        </select>
      </label>
      <div class="service-order-create-actions">
        <button class="service-order-cancel-button" type="button" data-close-team-form="${escapeServiceOrderText(order.id)}" ${blocked ? "disabled" : ""}>Voltar aos detalhes</button>
        <button class="service-order-cancel-button" type="button" data-refresh-order-teams="${escapeServiceOrderText(order.id)}" ${blocked || state?.loading ? "disabled" : ""}>Atualizar equipes</button>
        <button class="service-orders-create-button" type="submit" ${disabled || !teams.some(team => team.disponivel || team.atual) ? "disabled" : ""}>Salvar equipe</button>
      </div>
    </form>
  </section>`;
}

async function loadServiceOrderTeams(orderId){
  if (!isCurrentServiceOrder(orderId) || serviceOrdersState.operations.has(orderId)) return;
  const state = { items: [], loading: true, error: "" };
  const revision = serviceOrdersState.orderRevisions.get(orderId) || 0;
  serviceOrdersState.teamOptions.set(orderId, state);
  renderCurrentServiceOrder(orderId);
  try {
    const teams = await buscarEquipesDaOrdem(orderId);
    if (serviceOrdersState.teamOptions.get(orderId) !== state
        || revision !== (serviceOrdersState.orderRevisions.get(orderId) || 0)) return;
    state.items = teams;
    const previous = serviceOrdersState.teamDrafts.get(orderId);
    if (!teams.some(team => team.id === previous && (team.disponivel || team.atual))){
      serviceOrdersState.teamDrafts.set(orderId, teams.find(team => team.atual)?.id || "");
    }
  } catch (error){
    if (serviceOrdersState.teamOptions.get(orderId) !== state) return;
    state.error = getServiceOrdersErrorMessage(error, "Não foi possível carregar as equipes. Atualize a lista para tentar novamente.");
  } finally {
    if (serviceOrdersState.teamOptions.get(orderId) === state){
      state.loading = false;
      renderCurrentServiceOrder(orderId);
      if (isCurrentServiceOrder(orderId) && serviceOrdersState.teamForms.has(orderId)
          && !serviceOrdersState.operations.has(orderId)) document.getElementById("serviceOrderTeamSelect")?.focus();
    }
  }
}

function openServiceOrderTeamForm(orderId){
  if (!isCurrentServiceOrder(orderId) || !canChangeServiceOrder(serviceOrdersState.details.get(orderId))
      || serviceOrdersState.operations.has(orderId)) return;
  serviceOrdersState.completionForms.delete(orderId);
  serviceOrdersState.teamForms.add(orderId);
  serviceOrdersState.feedback.delete(orderId);
  loadServiceOrderTeams(orderId);
}

function closeServiceOrderTeamForm(orderId){
  if (!isCurrentServiceOrder(orderId) || serviceOrdersState.operations.has(orderId)) return;
  serviceOrdersState.teamForms.delete(orderId);
  renderCurrentServiceOrder(orderId);
  serviceOrdersPage.modalContent.querySelector("[data-open-team-form]")?.focus();
}

async function assignServiceOrderTeamFromDetails(form){
  const orderId = form.dataset.assignServiceOrder;
  const order = serviceOrdersState.details.get(orderId);
  if (!isCurrentServiceOrder(orderId) || !canChangeServiceOrder(order)
      || serviceOrdersState.operations.has(orderId)) return;
  const equipeId = form.elements.namedItem("equipeId").value;
  const options = serviceOrdersState.teamOptions.get(orderId);
  const team = options?.items.find(item => item.id === equipeId);
  if (options?.loading || options?.error || !team || (!team.disponivel && !team.atual)){
    showServiceOrderStatusFeedback(orderId, "Selecione uma equipe disponível. Atualize a lista se necessário.", true);
    return;
  }
  serviceOrdersState.teamDrafts.set(orderId, equipeId);
  await runServiceOrderOperation(orderId, "assign", () => atribuirEquipeDaOrdem(orderId, equipeId), { equipeId });
}

// Apresenta os dados persistidos e as ações permitidas para a situação atual.
function renderServiceOrderDetails(order){
  const operation = serviceOrdersState.operations.get(order.id);
  const blocked = Boolean(operation);
  const editable = canChangeServiceOrder(order);
  const formOpen = editable && serviceOrdersState.completionForms.has(order.id);
  const teamFormOpen = editable && serviceOrdersState.teamForms.has(order.id);
  const feedback = serviceOrdersState.feedback.get(order.id);
  const message = operation?.message || feedback?.message || "";
  const fields = [
    ["Título da OS", order.titulo],
    ["Prioridade", order.prioridade],
    ["ID da equipe", order.equipeId ?? "Não atribuída"],
    ["ID da árvore", order.arvoreId],
    ["ID da ocorrência", order.ocorrenciaId],
    ["ID do município", order.municipioId],
    ["Última atualização", formatServiceOrderDate(order.dataAtualizacao)],
    ["Conclusão", formatServiceOrderDate(order.dataConclusao)]
  ];

  serviceOrdersPage.modalContent.innerHTML = `
    <header class="service-order-detail-heading">
      <span class="service-order-detail-icon"><i class="bi bi-clipboard2-check" aria-hidden="true"></i></span>
      <div>
        <span class="service-order-detail-eyebrow">Criada em ${escapeServiceOrderText(formatServiceOrderDate(order.dataCriacao))}</span>
        <h2 id="serviceOrderModalTitle">Ordem ${escapeServiceOrderText(order.codigo || order.id)}</h2>
      </div>
    </header>
    <div class="service-order-detail-grid">
      <div>
        <span>Status da ordem</span>
        <strong><span class="service-order-status ${serviceOrderStatusClass(order.status)}">${escapeServiceOrderText(order.status)}</span></strong>
      </div>
      ${fields.map(([label, value]) => `
        <div><span>${escapeServiceOrderText(label)}</span><strong>${escapeServiceOrderText(value)}</strong></div>
      `).join("")}
    </div>
    <section class="service-order-description">
      <h3>Descrição do serviço</h3>
      <p class="service-order-preserve-lines">${escapeServiceOrderText(order.descricao)}</p>
    </section>
    <section class="service-order-description">
      <h3>Observações</h3>
      <p class="service-order-preserve-lines">${escapeServiceOrderText(order.observacoes)}</p>
    </section>
    ${renderServiceOrderCompletionReport(order)}
    ${formOpen ? renderServiceOrderCompletionForm(order, blocked) : ""}
    ${teamFormOpen ? renderServiceOrderTeamForm(order, blocked) : ""}
    ${editable && !formOpen && !teamFormOpen ? `
      <div class="service-order-create-actions service-order-detail-actions">
        <button class="service-order-cancel-button" type="button"
          data-open-team-form="${escapeServiceOrderText(order.id)}" ${blocked ? "disabled" : ""}>
          ${order.equipeId ? "Trocar equipe" : "Atribuir equipe"}
        </button>
        <button class="service-order-cancel-button" type="button"
          data-cancel-service-order="${escapeServiceOrderText(order.id)}" ${blocked ? "disabled" : ""}>
          ${operation?.kind === "cancel" && operation.phase === "sending" ? "Cancelando..." : "Cancelar ordem de serviço"}
        </button>
        <button class="service-orders-create-button" type="button"
          data-open-completion-form="${escapeServiceOrderText(order.id)}" ${blocked ? "disabled" : ""}>
          <i class="bi bi-check2-circle" aria-hidden="true"></i>Concluir serviço
        </button>
      </div>` : ""}
    <p id="serviceOrderStatusFeedback" class="service-order-status-feedback${feedback?.error || operation?.phase === "unknown" ? " is-error" : ""}"
      role="status" aria-live="polite" tabindex="-1">${escapeServiceOrderText(message)}</p>
    ${operation?.phase === "unknown" ? `
      <button class="service-order-cancel-button" type="button" data-check-service-order="${escapeServiceOrderText(order.id)}">Consultar situação</button>
    ` : ""}
  `;
}

function showServiceOrderStatusFeedback(orderId, message, error = false){
  serviceOrdersState.feedback.set(orderId, { message, error });
  if (!isCurrentServiceOrder(orderId)) return;
  const feedback = document.getElementById("serviceOrderStatusFeedback");
  if (feedback){
    feedback.textContent = message;
    feedback.classList.toggle("is-error", error);
  }
}

function rememberServiceOrder(order){
  serviceOrdersState.details.set(order.id, order);
  serviceOrdersState.orders = serviceOrdersState.orders.map(current => current.id === order.id ? order : current);
  if (!canChangeServiceOrder(order)){
    serviceOrdersState.completionForms.delete(order.id);
    serviceOrdersState.completionDrafts.delete(order.id);
    serviceOrdersState.teamForms.delete(order.id);
    serviceOrdersState.teamOptions.delete(order.id);
    serviceOrdersState.teamDrafts.delete(order.id);
  }
  renderServiceOrdersTable();
}

// Respostas de alteração invalidam consultas antigas da mesma OS.
function acceptServiceOrderActionResult(order, message){
  serviceOrdersState.orderRevisions.set(order.id, (serviceOrdersState.orderRevisions.get(order.id) || 0) + 1);
  serviceOrdersState.feedback.set(order.id, { message, error: false });
  rememberServiceOrder(order);
  if (isCurrentServiceOrder(order.id)){
    serviceOrdersState.detailsRequest += 1;
    renderServiceOrderDetails(order);
    document.getElementById("closeServiceOrderModal").focus();
  }
}

function renderCurrentServiceOrder(orderId){
  const order = serviceOrdersState.details.get(orderId);
  if (order && isCurrentServiceOrder(orderId)) renderServiceOrderDetails(order);
}

function completionRecoveryMessage(order, operation){
  if (order.status === "Concluída") return "A ordem de serviço está concluída.";
  if (order.status === "Cancelada") return "A ordem de serviço está cancelada.";
  if (operation.kind === "assign"){
    return order.equipeId === operation.equipeId
      ? "Equipe atribuída. A ordem está em andamento."
      : "A atribuição não foi confirmada. Atualize as equipes antes de tentar novamente.";
  }
  const action = operation.kind === "complete" ? "conclusão" : "cancelamento";
  return `A ${action} não foi confirmada. A ordem continua ${order.status.toLocaleLowerCase("pt-BR")}; você pode tentar novamente.`;
}

// Só consulta após uma resposta incerta. Nunca repete a alteração automaticamente.
async function recoverServiceOrderOperation(orderId, operation){
  if (!operation || serviceOrdersState.operations.get(orderId) !== operation) return;
  if (operation.checkPromise) return operation.checkPromise;
  operation.phase = "checking";
  operation.message = "Consultando a situação da ordem...";
  renderCurrentServiceOrder(orderId);

  operation.checkPromise = (async () => {
    try {
      const order = await buscarOrdemDeServico(orderId);
      if (serviceOrdersState.operations.get(orderId) !== operation) return;
      serviceOrdersState.operations.delete(orderId);
      if (operation.kind === "assign"){
        if (order.equipeId === operation.equipeId) serviceOrdersState.teamForms.delete(orderId);
        const options = serviceOrdersState.teamOptions.get(orderId);
        if (options) options.error = "Atualize a lista de equipes para continuar.";
      }
      acceptServiceOrderActionResult(order, completionRecoveryMessage(order, operation));
    } catch (error){
      if (serviceOrdersState.operations.get(orderId) !== operation) return;
      operation.phase = "unknown";
      operation.message = getServiceOrdersErrorMessage(error,
        "Não foi possível confirmar a situação. Consulte novamente antes de tentar alterar a ordem.");
      renderCurrentServiceOrder(orderId);
      if (isCurrentServiceOrder(orderId)) document.getElementById("serviceOrderStatusFeedback")?.focus();
    } finally {
      operation.checkPromise = null;
    }
  })();
  return operation.checkPromise;
}

async function runServiceOrderOperation(orderId, kind, send, metadata = {}){
  if (serviceOrdersState.operations.has(orderId)) return;
  const operation = {
    ...metadata, kind, phase: "sending", checkPromise: null,
    message: kind === "assign" ? "Salvando a equipe..." : kind === "complete" ? "Concluindo o serviço..." : "Cancelando a ordem de serviço..."
  };
  serviceOrdersState.operations.set(orderId, operation);
  serviceOrdersState.feedback.delete(orderId);
  renderCurrentServiceOrder(orderId);
  if (isCurrentServiceOrder(orderId)) document.getElementById("closeServiceOrderModal").focus();

  try {
    const order = await send();
    if (serviceOrdersState.operations.get(orderId) !== operation) return;
    serviceOrdersState.operations.delete(orderId);
    if (kind === "assign"){
      serviceOrdersState.teamForms.delete(orderId);
      serviceOrdersState.teamOptions.delete(orderId);
      serviceOrdersState.teamDrafts.delete(orderId);
    }
    acceptServiceOrderActionResult(order, kind === "assign"
      ? "Equipe atribuída. A ordem está em andamento."
      : kind === "complete"
      ? "Serviço concluído. O registro de execução foi salvo."
      : "Ordem de serviço cancelada com sucesso.");
  } catch (error){
    if (serviceOrdersState.operations.get(orderId) !== operation) return;
    const rejected = !error.invalidResponse && [400, 401, 403, 404, 422].includes(error.status);
    if (rejected){
      serviceOrdersState.operations.delete(orderId);
      showServiceOrderStatusFeedback(orderId, getServiceOrdersErrorMessage(error, error.message), true);
      renderCurrentServiceOrder(orderId);
      if (isCurrentServiceOrder(orderId)) document.getElementById("serviceOrderStatusFeedback")?.focus();
    } else {
      await recoverServiceOrderOperation(orderId, operation);
    }
  }
}

// Confirma e mantém um único pedido de cancelamento ou conclusão por OS.
async function cancelServiceOrderFromDetails(orderId){
  const order = serviceOrdersState.details.get(orderId);
  if (!isCurrentServiceOrder(orderId) || !canChangeServiceOrder(order)
      || serviceOrdersState.operations.has(orderId)) return;
  const confirmed = window.confirm(
    `Deseja cancelar a ordem ${order.codigo || order.id}?\n\n`
    + "Após o cancelamento, a OS poderá ser consultada, mas não poderá ser alterada."
  );
  if (!confirmed) return;
  await runServiceOrderOperation(orderId, "cancel", () => cancelarOrdemDeServico(orderId));
}

function openServiceOrderCompletionForm(orderId){
  const order = serviceOrdersState.details.get(orderId);
  if (!isCurrentServiceOrder(orderId) || !canChangeServiceOrder(order)
      || serviceOrdersState.operations.has(orderId)) return;
  serviceOrdersState.teamForms.delete(orderId);
  serviceOrdersState.completionForms.add(orderId);
  serviceOrdersState.feedback.delete(orderId);
  renderServiceOrderDetails(order);
  document.getElementById("serviceOrderCompletionType").focus();
}

function closeServiceOrderCompletionForm(orderId){
  if (!isCurrentServiceOrder(orderId) || serviceOrdersState.operations.has(orderId)) return;
  serviceOrdersState.completionForms.delete(orderId);
  renderCurrentServiceOrder(orderId);
  serviceOrdersPage.modalContent.querySelector("[data-open-completion-form]")?.focus();
}

async function completeServiceOrderFromDetails(form){
  const orderId = form.dataset.completeServiceOrder;
  const order = serviceOrdersState.details.get(orderId);
  if (!isCurrentServiceOrder(orderId) || !canChangeServiceOrder(order)
      || serviceOrdersState.operations.has(orderId)) return;
  const draft = saveServiceOrderCompletionDraft(form);
  if (!form.reportValidity()) return;
  let data;
  try {
    data = validateServiceOrderCompletionDraft(draft);
  } catch (error){
    showServiceOrderStatusFeedback(orderId, error.message, true);
    document.getElementById("serviceOrderStatusFeedback")?.focus();
    return;
  }
  if (!window.confirm(`Concluir a ordem ${order.codigo || order.id}?\n\nConfira os dados: o registro de execução não poderá ser alterado após a conclusão.`)) return;
  await runServiceOrderOperation(orderId, "complete", () => concluirOrdemDeServico(orderId, data));
}

// Abre o modal e reconsulta a OS; respostas de janelas anteriores são ignoradas.
async function openServiceOrderDetails(orderId){
  const request = ++serviceOrdersState.detailsRequest;
  const revision = serviceOrdersState.orderRevisions.get(orderId) || 0;
  serviceOrdersState.currentOrderId = orderId;
  if (serviceOrdersPage.modal.hidden) serviceOrdersState.previousFocus = document.activeElement;
  serviceOrdersPage.modalContent.innerHTML =
    '<h2 id="serviceOrderModalTitle">Detalhes da ordem</h2><p role="status">Carregando detalhes...</p>';
  serviceOrdersPage.modal.hidden = false;
  document.body.classList.add("service-order-modal-open");
  document.getElementById("closeServiceOrderModal").focus();

  const operation = serviceOrdersState.operations.get(orderId);
  if (operation && operation.phase !== "sending"){
    renderCurrentServiceOrder(orderId);
    await recoverServiceOrderOperation(orderId, operation);
    return;
  }
  try {
    const order = await buscarOrdemDeServico(orderId);
    if (request !== serviceOrdersState.detailsRequest || !isCurrentServiceOrder(orderId)
        || revision !== (serviceOrdersState.orderRevisions.get(orderId) || 0)) return;
    rememberServiceOrder(order);
    renderServiceOrderDetails(order);
    if (serviceOrdersState.teamForms.has(orderId) && !serviceOrdersState.operations.has(orderId)) loadServiceOrderTeams(orderId);
  } catch (error){
    if (request !== serviceOrdersState.detailsRequest || !isCurrentServiceOrder(orderId)
        || revision !== (serviceOrdersState.orderRevisions.get(orderId) || 0)) return;
    const message = getServiceOrdersErrorMessage(error, "Não foi possível carregar os detalhes. Feche esta janela e tente novamente.");
    serviceOrdersPage.modalContent.innerHTML = `
      <h2 id="serviceOrderModalTitle">Detalhes da ordem</h2>
      <p role="alert">${escapeServiceOrderText(message)}</p>`;
  }
}

// Fecha o modal sem perder o rascunho nem liberar alterações ainda não confirmadas.
function closeServiceOrderDetails(){
  const form = serviceOrdersPage.modalContent.querySelector("[data-complete-service-order]");
  if (form) saveServiceOrderCompletionDraft(form);
  serviceOrdersState.detailsRequest += 1;
  serviceOrdersState.currentOrderId = null;
  serviceOrdersPage.modal.hidden = true;
  serviceOrdersPage.modalContent.innerHTML = "";
  document.body.classList.remove("service-order-modal-open");
  if (serviceOrdersState.previousFocus?.isConnected){
    serviceOrdersState.previousFocus.focus();
  } else {
    serviceOrdersPage.search.focus();
  }
  serviceOrdersState.previousFocus = null;
}

// Mantém a navegação por teclado dentro do diálogo aberto.
function trapServiceOrderModalFocus(event){
  if (event.key !== "Tab" || serviceOrdersPage.modal.hidden) return;
  const controls = [...serviceOrdersPage.modal.querySelectorAll(
    'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]'
  )].filter(element => element.getClientRects().length > 0);
  if (!controls.length) return;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))){
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))){
    event.preventDefault();
    first.focus();
  }
}

// Liga os filtros e os controles de consulta dos detalhes.
function setupServiceOrdersEvents(){
  serviceOrdersPage.search.addEventListener("input", renderServiceOrdersTable);
  serviceOrdersPage.sort.addEventListener("change", renderServiceOrdersTable);
  serviceOrdersPage.statusFilter.addEventListener("change", renderServiceOrdersTable);

  serviceOrdersPage.tableBody.addEventListener("click", event =>{
    const trigger = event.target.closest("[data-open-service-order]");
    if (trigger) openServiceOrderDetails(trigger.dataset.openServiceOrder);
  });

  serviceOrdersPage.modalContent.addEventListener("click", event => {
    const trigger = event.target.closest("button");
    if (!trigger || trigger.disabled) return;
    if (trigger.dataset.cancelServiceOrder) cancelServiceOrderFromDetails(trigger.dataset.cancelServiceOrder);
    if (trigger.dataset.openCompletionForm) openServiceOrderCompletionForm(trigger.dataset.openCompletionForm);
    if (trigger.dataset.closeCompletionForm) closeServiceOrderCompletionForm(trigger.dataset.closeCompletionForm);
    if (trigger.dataset.openTeamForm) openServiceOrderTeamForm(trigger.dataset.openTeamForm);
    if (trigger.dataset.closeTeamForm) closeServiceOrderTeamForm(trigger.dataset.closeTeamForm);
    if (trigger.dataset.refreshOrderTeams) loadServiceOrderTeams(trigger.dataset.refreshOrderTeams);
    if (trigger.dataset.checkServiceOrder){
      const id = trigger.dataset.checkServiceOrder;
      recoverServiceOrderOperation(id, serviceOrdersState.operations.get(id));
    }
  });

  serviceOrdersPage.modalContent.addEventListener("input", event => {
    const form = event.target.closest("[data-complete-service-order]");
    if (form) saveServiceOrderCompletionDraft(form);
  });

  serviceOrdersPage.modalContent.addEventListener("change", event => {
    const form = event.target.closest("[data-assign-service-order]");
    if (form) serviceOrdersState.teamDrafts.set(form.dataset.assignServiceOrder, form.elements.namedItem("equipeId").value);
  });

  serviceOrdersPage.modalContent.addEventListener("submit", event => {
    const teamForm = event.target.closest("[data-assign-service-order]");
    if (teamForm){
      event.preventDefault();
      assignServiceOrderTeamFromDetails(teamForm);
      return;
    }
    const form = event.target.closest("[data-complete-service-order]");
    if (!form) return;
    event.preventDefault();
    completeServiceOrderFromDetails(form);
  });

  document.getElementById("closeServiceOrderModal").addEventListener("click", closeServiceOrderDetails);

  serviceOrdersPage.modal.addEventListener("click", event =>{
    if (event.target === serviceOrdersPage.modal) closeServiceOrderDetails();
  });

  document.addEventListener("keydown", event =>{
    trapServiceOrderModalFocus(event);
    if (event.key === "Escape" && !serviceOrdersPage.modal.hidden){
      closeServiceOrderDetails();
    }
  });

  // O cadastro permanece desativado até sua integração.
  serviceOrdersPage.createForm.addEventListener("submit", event =>{
    event.preventDefault();
  });
}

// Carrega as ordens do município identificado pela sessão.
async function initializeServiceOrdersPage(){
  setupServiceOrdersEvents();
  renderServiceOrdersTable();

  try {
    serviceOrdersState.orders = await buscarOrdensDeServico();
  } catch (error){
    serviceOrdersState.error = getServiceOrdersErrorMessage(
      error, "Não foi possível carregar as ordens. Atualize a página para tentar novamente.");
  } finally{
    serviceOrdersState.loading = false;
    renderServiceOrdersTable();
  }
}

initializeServiceOrdersPage();
