// Guarda as ordens recebidas e o estado da tela.
const serviceOrdersState = {
  orders: [],
  loading: true,
  error: "",
  detailsRequest: 0,
  previousFocus: null,
  currentOrderId: null,
  cancellations: new Set()
};

// Guarda os elementos da página usados por filtros, tabela e modal.
const serviceOrdersPage = {
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
async function buscarOrdemDeServico(id) {
  const resposta = await fetch(`/api/ordens-servico/${encodeURIComponent(id)}`,{ credentials: "same-origin" });

  const dados = await resposta.json();

  if (!resposta.ok){
    const erro = new Error(dados.erro || "Não foi possível consultar a ordem de serviço.");

    erro.status = resposta.status;
    throw erro;
  }

  if (!dados || !dados.ordem || typeof dados.ordem !== "object" || Array.isArray(dados.ordem)){
    throw new Error("A API retornou uma ordem inválida.");
  }

  return dados.ordem;
}

// Solicita o cancelamento e usa a ordem atualizada devolvida pelo servidor.
async function cancelarOrdemDeServico(id) {
  const resposta = await fetch(
    "/api/ordens-servico/" + encodeURIComponent(id) + "/status",
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelada" })
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    const erro = new Error(dados?.erro || "Não foi possível cancelar a ordem de serviço.");
    erro.status = resposta.status;
    throw erro;
  }

  if (dados?.ordem?.id !== id || dados?.ordem?.status !== "Cancelada") {
    throw new Error("A API retornou uma confirmação de cancelamento inválida.");
  }

  return dados.ordem;
}

// Escapa texto antes de inserir conteúdo dinâmico na tabela ou na janela de detalhes.
function escapeServiceOrderText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Normaliza os termos para permitir buscas sem diferença entre caixa e acentos.
function normalizeServiceOrderText(value) {
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

  const records = serviceOrdersState.orders.filter(order => {
    const matchesStatus =
      selectedStatus === "all" || order.status === selectedStatus;

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
    const matchesSearch = !query || searchFields.some(
      value => normalizeServiceOrderText(value).includes(query)
    );

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

// Apresenta somente os campos retornados pela consulta da OS.
function renderServiceOrderDetails(order){
  const canCancel = order.status === "Aberta" || order.status === "Em andamento";
  const cancelling = serviceOrdersState.cancellations.has(order.id);

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
      <p>${escapeServiceOrderText(order.descricao)}</p>
    </section>
    <section class="service-order-description">
      <h3>Observações</h3>
      <p>${escapeServiceOrderText(order.observacoes)}</p>
    </section>
    ${canCancel ? `
      <div class="service-order-create-actions">
        <button
          class="service-order-cancel-button"
          type="button"
          data-cancel-service-order="${escapeServiceOrderText(order.id)}"
          ${cancelling ? "disabled" : ""}>
          ${cancelling ? "Cancelando..." : "Cancelar ordem de serviço"}
        </button>
      </div>
    ` : ""}
    <p
      id="serviceOrderStatusFeedback"
      class="service-order-create-intro"
      role="status"
      aria-live="polite">${cancelling ? "Cancelando a ordem de serviço..." : ""}</p>
  `;
}

// Exibe a mensagem somente se os detalhes desta OS ainda estiverem abertos.
function showServiceOrderStatusFeedback(orderId, message) {
  if (serviceOrdersPage.modal.hidden || serviceOrdersState.currentOrderId !== orderId) return;

  const feedback = document.getElementById("serviceOrderStatusFeedback");
  if (feedback) feedback.textContent = message;
}

// Confirma a ação, impede envios repetidos e atualiza a tela após o cancelamento.
async function cancelServiceOrderFromDetails(orderId, button) {
  if (serviceOrdersPage.modal.hidden
      || serviceOrdersState.currentOrderId !== orderId
      || serviceOrdersState.cancellations.has(orderId)) return;

  const title = document.getElementById("serviceOrderModalTitle").textContent;
  const confirmed = window.confirm(
    "Deseja cancelar " + title + "?\n\n"
    + "Após o cancelamento, a OS poderá ser consultada, mas não poderá ser alterada."
  );

  if (!confirmed) return;

  serviceOrdersState.cancellations.add(orderId);
  button.disabled = true;
  button.textContent = "Cancelando...";
  showServiceOrderStatusFeedback(orderId, "Cancelando a ordem de serviço...");

  try {
    const order = await cancelarOrdemDeServico(orderId);
    serviceOrdersState.cancellations.delete(orderId);

    // Atualiza o registro pelo ID interno e reaplica os filtros da lista.
    serviceOrdersState.orders = serviceOrdersState.orders.map(
      current => current.id === order.id ? order : current
    );
    renderServiceOrdersTable();

    if (!serviceOrdersPage.modal.hidden && serviceOrdersState.currentOrderId === orderId) {
      // Impede que uma consulta anterior substitua o resultado do cancelamento.
      serviceOrdersState.detailsRequest += 1;
      renderServiceOrderDetails(order);
      showServiceOrderStatusFeedback(orderId, "Ordem de serviço cancelada com sucesso.");
      document.getElementById("closeServiceOrderModal").focus();
    }
  } catch (error) {
    const fallback = error.status
      ? error.message
      : "Não foi possível confirmar o cancelamento. Atualize a página e consulte a OS.";

    showServiceOrderStatusFeedback(
      orderId,
      getServiceOrdersErrorMessage(error, fallback)
    );
  } finally {
    serviceOrdersState.cancellations.delete(orderId);

    if (!serviceOrdersPage.modal.hidden && serviceOrdersState.currentOrderId === orderId) {
      const currentButton = serviceOrdersPage.modalContent.querySelector("[data-cancel-service-order]");
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.textContent = "Cancelar ordem de serviço";
      }
    }
  }
}

// Abre o modal e consulta os dados atualizados da OS selecionada.
async function openServiceOrderDetails(orderId){
  const request = ++serviceOrdersState.detailsRequest;
  serviceOrdersState.currentOrderId = orderId;
  serviceOrdersState.previousFocus = document.activeElement;

  serviceOrdersPage.modalContent.innerHTML =
    '<h2 id="serviceOrderModalTitle">Detalhes da ordem</h2><p role="status">Carregando detalhes...</p>';

  serviceOrdersPage.modal.hidden = false;
  document.body.classList.add("service-order-modal-open");
  document.getElementById("closeServiceOrderModal").focus();

  try {
    const order = await buscarOrdemDeServico(orderId);

    if (request !== serviceOrdersState.detailsRequest || serviceOrdersPage.modal.hidden) return;

    renderServiceOrderDetails(order);
  } catch (error){
    if (request !== serviceOrdersState.detailsRequest || serviceOrdersPage.modal.hidden) return;

    const message = getServiceOrdersErrorMessage(error, "Não foi possível carregar os detalhes. Feche esta janela e tente novamente.");

    serviceOrdersPage.modalContent.innerHTML = `
      <h2 id="serviceOrderModalTitle">Detalhes da ordem</h2>
      <p role="alert">${escapeServiceOrderText(message)}</p>`;
  }
}

// Fecha o modal e impede que uma resposta atrasada atualize seus dados.
function closeServiceOrderDetails(){
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
    const trigger = event.target.closest("[data-cancel-service-order]");
    if (trigger) cancelServiceOrderFromDetails(trigger.dataset.cancelServiceOrder, trigger);
  });

  document.getElementById("closeServiceOrderModal").addEventListener("click", closeServiceOrderDetails);

  serviceOrdersPage.modal.addEventListener("click", event =>{
    if (event.target === serviceOrdersPage.modal) closeServiceOrderDetails();
  });

  document.addEventListener("keydown", event =>{
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
