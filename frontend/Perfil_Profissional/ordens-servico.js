// Este conjunto local simula as ordens retornadas para o município do profissional.
// FUTURO API/BD: substituir pelos resultados de GET /api/municipios/{id}/ordens-servico,
// carregando IDs, tipo e descrição da ocorrência, árvore, endereço, datas, equipe, status e relatório final.
const serviceOrdersDemoData = {
  municipality: { id: "campinas-demo", name: "Campinas - SP" },
  orders: [
    {
      id: "OS-2026-0386", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0240", occurrenceType: "Árvore inclinada",
      tree: "Sibipiruna", treeId: "11802", neighborhood: "Centro", address: "R. Barão de Jaguara, 880",
      createdAt: "2026-10-18", status: "Em andamento", risk: "Crítico", team: "Equipe Central",
      description: "Avaliar estabilidade do tronco inclinado, inspecionar a cavidade na base e definir as medidas de proteção para a calçada.",
      startedAt: "2026-10-19", completedAt: null, completionComment: ""
    },
    {
      id: "OS-2026-0381", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0241", occurrenceType: "Galho próximo à rede elétrica",
      tree: "Ipê-amarelo", treeId: "10234", neighborhood: "Taquaral", address: "R. Dr. Alberto Sarmento, 123",
      createdAt: "2026-10-16", status: "Em andamento", risk: "Alto", team: "Equipe Norte",
      description: "Executar poda preventiva dos galhos em contato com a rede elétrica e registrar as condições da copa após o serviço.",
      startedAt: "2026-10-17", completedAt: null, completionComment: ""
    },
    {
      id: "OS-2026-0312", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0231", occurrenceType: "Raiz danificando calçada",
      tree: "Pau-brasil", treeId: "11076", neighborhood: "Centro", address: "Praça Carlos Gomes, s/n",
      createdAt: "2026-10-01", status: "Concluída", risk: "Baixo", team: "Equipe Sul",
      description: "Inspecionar o trecho da calçada elevado pelas raízes e executar o reparo autorizado sem comprometer a estabilidade da árvore.",
      startedAt: "2026-10-03", completedAt: "2026-10-04", completionComment: "Calçada nivelada com solução permeável. Raízes preservadas e área sinalizada para acompanhamento."
    },
    {
      id: "OS-2026-0294", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0218", occurrenceType: "Galho quebrado",
      tree: "Jatobá", treeId: "10418", neighborhood: "Jardim Chapadão", address: "Av. Imperatriz Leopoldina, 300",
      createdAt: "2026-09-24", status: "Concluída", risk: "Médio", team: "Equipe de poda",
      description: "Remover galho quebrado que obstrui parcialmente a passagem de pedestres e verificar os demais ramos da copa.",
      startedAt: "2026-09-25", completedAt: "2026-09-25", completionComment: "Galho removido e fragmentos recolhidos. Inspeção visual não identificou outros ramos com risco imediato."
    },
    {
      id: "OS-2026-0270", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0203", occurrenceType: "Árvore com sinais de praga",
      tree: "Quaresmeira", treeId: "12031", neighborhood: "Cambuí", address: "Av. Júlio de Mesquita, 410",
      createdAt: "2026-09-12", status: "Pendente", risk: "Médio", team: "Aguardando equipe",
      description: "Realizar avaliação fitossanitária das folhas e indicar manejo adequado para os sinais de praga relatados.",
      startedAt: null, completedAt: null, completionComment: ""
    },
    {
      id: "OS-2026-0248", municipalityId: "campinas-demo", occurrenceId: "OC-2026-0184", occurrenceType: "Vistoria de segurança",
      tree: "Flamboyant", treeId: "10876", neighborhood: "Vila Nogueira", address: "R. Maria Monteiro, 789",
      createdAt: "2026-08-30", status: "Aguardando equipe", risk: "Alto", team: "Aguardando equipe",
      description: "Realizar vistoria para avaliar a estabilidade dos ramos e a proximidade com a área de circulação.",
      startedAt: null, completedAt: null, completionComment: ""
    }
  ]
};

// Guarda os elementos da página usados por filtros, tabela e modal.
const serviceOrdersPage = {
  municipality: document.getElementById("serviceOrdersMunicipality"),
  search: document.getElementById("serviceOrdersSearch"),
  sort: document.getElementById("serviceOrdersSort"),
  statusFilter: document.getElementById("serviceOrdersStatusFilter"),
  tableBody: document.getElementById("serviceOrdersTableBody"),
  resultCount: document.getElementById("serviceOrdersResultCount"),
  emptyState: document.getElementById("serviceOrdersEmpty"),
  modal: document.getElementById("serviceOrderModal"),
  modalContent: document.getElementById("serviceOrderModalContent")
};

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

// Converte datas ISO dos dados locais para o formato usado na interface.
function formatServiceOrderDate(isoDate) {
  if (!isoDate) return "Não iniciada";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Devolve a classe visual correspondente ao status atual da ordem.
function serviceOrderStatusClass(status) {
  const normalized = normalizeServiceOrderText(status);
  if (normalized.includes("conclu")) return "completed";
  if (normalized.includes("andamento")) return "in-progress";
  return "pending";
}

// Filtra os dados pelo município, texto livre e status; depois aplica a ordem por data.
// FUTURO API/BD: enviar municipalityId, termo de busca, status e ordenação como parâmetros da consulta.
function getVisibleServiceOrders() {
  const municipalityId = serviceOrdersDemoData.municipality.id;
  const query = normalizeServiceOrderText(serviceOrdersPage.search.value.trim());
  const selectedStatus = serviceOrdersPage.statusFilter.value;
  const matchingOrders = serviceOrdersDemoData.orders.filter(order => {
    const matchesMunicipality = order.municipalityId === municipalityId;
    const matchesStatus = selectedStatus === "all" || order.status === selectedStatus;
    const searchFields = [order.id, order.occurrenceId, order.occurrenceType, order.team, order.status,
      order.tree, order.treeId, order.neighborhood, order.address, order.description];
    const matchesSearch = !query || searchFields.some(value => normalizeServiceOrderText(value).includes(query));
    return matchesMunicipality && matchesStatus && matchesSearch;
  });

  return matchingOrders.sort((left, right) => serviceOrdersPage.sort.value === "oldest"
    ? left.createdAt.localeCompare(right.createdAt)
    : right.createdAt.localeCompare(left.createdAt));
}

// Desenha as quatro colunas solicitadas e sincroniza a contagem/estado vazio.
function renderServiceOrdersTable() {
  const records = getVisibleServiceOrders();
  serviceOrdersPage.tableBody.innerHTML = records.map(order => `
    <tr>
      <td><button class="service-order-id-link" type="button" data-open-service-order="${escapeServiceOrderText(order.id)}">${escapeServiceOrderText(order.id)}</button></td>
      <td>${escapeServiceOrderText(order.occurrenceType)}</td>
      <td>${escapeServiceOrderText(order.team)}</td>
      <td><span class="service-order-status ${serviceOrderStatusClass(order.status)}">${escapeServiceOrderText(order.status)}</span></td>
    </tr>
  `).join("");

  serviceOrdersPage.resultCount.textContent = `${records.length} ${records.length === 1 ? "ordem encontrada" : "ordens encontradas"}`;
  serviceOrdersPage.emptyState.hidden = records.length > 0;
}

// Monta os detalhes da ordem e inclui o comentário da equipe somente para serviços concluídos.
function renderServiceOrderDetails(order) {
  const isCompleted = normalizeServiceOrderText(order.status).includes("conclu");
  const completionMarkup = isCompleted
    ? `<section class="service-order-completion"><h3><i class="bi bi-chat-square-text" aria-hidden="true"></i> Comentário da equipe ao finalizar</h3><p>${escapeServiceOrderText(order.completionComment || "A equipe não registrou um comentário de finalização.")}</p><span>Finalizada em ${formatServiceOrderDate(order.completedAt)}</span></section>`
    : '<section class="service-order-not-completed"><i class="bi bi-info-circle" aria-hidden="true"></i> O comentário de finalização estará disponível quando a equipe concluir a ordem.</section>';

  serviceOrdersPage.modalContent.innerHTML = `
    <header class="service-order-detail-heading">
      <span class="service-order-detail-icon"><i class="bi bi-clipboard2-check" aria-hidden="true"></i></span>
      <div><span class="service-order-detail-eyebrow">${escapeServiceOrderText(order.occurrenceId)} · Criada em ${formatServiceOrderDate(order.createdAt)}</span><h2 id="serviceOrderModalTitle">Ordem ${escapeServiceOrderText(order.id)}</h2></div>
    </header>
    <div class="service-order-detail-grid">
      <div><span>Status da ordem</span><strong><span class="service-order-status ${serviceOrderStatusClass(order.status)}">${escapeServiceOrderText(order.status)}</span></strong></div>
      <div><span>Tipo de ocorrência</span><strong>${escapeServiceOrderText(order.occurrenceType)}</strong></div>
      <div><span>Equipe designada</span><strong>${escapeServiceOrderText(order.team)}</strong></div>
      <div><span>Nível de risco</span><strong>${escapeServiceOrderText(order.risk)}</strong></div>
      <div><span>Árvore</span><strong>${escapeServiceOrderText(order.tree)} · ID ${escapeServiceOrderText(order.treeId)}</strong></div>
      <div><span>Bairro</span><strong>${escapeServiceOrderText(order.neighborhood)}</strong></div>
      <div class="service-order-detail-wide"><span>Endereço</span><strong>${escapeServiceOrderText(order.address)}</strong></div>
      <div><span>Início do serviço</span><strong>${formatServiceOrderDate(order.startedAt)}</strong></div>
      <div><span>Conclusão</span><strong>${formatServiceOrderDate(order.completedAt)}</strong></div>
    </div>
    <section class="service-order-description"><h3>Descrição do serviço</h3><p>${escapeServiceOrderText(order.description)}</p></section>
    ${completionMarkup}
  `;
}

// Abre os dados completos da ordem selecionada pelo identificador na tabela.
function openServiceOrderDetails(orderId) {
  const order = serviceOrdersDemoData.orders.find(item => item.id === orderId);
  if (!order) return;
  renderServiceOrderDetails(order);
  serviceOrdersPage.modal.hidden = false;
  document.body.classList.add("service-order-modal-open");
  document.getElementById("closeServiceOrderModal").focus();
}

// Fecha os detalhes e restaura a rolagem da página.
function closeServiceOrderDetails() {
  serviceOrdersPage.modal.hidden = true;
  document.body.classList.remove("service-order-modal-open");
}

// Liga busca, ordenação, filtro de status e abertura/fechamento dos detalhes.
function setupServiceOrdersEvents() {
  serviceOrdersPage.search.addEventListener("input", renderServiceOrdersTable);
  serviceOrdersPage.sort.addEventListener("change", renderServiceOrdersTable);
  serviceOrdersPage.statusFilter.addEventListener("change", renderServiceOrdersTable);

  serviceOrdersPage.tableBody.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-service-order]");
    if (trigger) openServiceOrderDetails(trigger.dataset.openServiceOrder);
  });

  document.getElementById("closeServiceOrderModal").addEventListener("click", closeServiceOrderDetails);
  serviceOrdersPage.modal.addEventListener("click", event => {
    if (event.target === serviceOrdersPage.modal) closeServiceOrderDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !serviceOrdersPage.modal.hidden) closeServiceOrderDetails();
  });
}

// Inicializa o município demonstrativo, instala os eventos e apresenta os registros recentes.
// FUTURO API/BD: buscar o município vinculado ao setor da sessão autenticada antes de carregar a lista.
function initializeServiceOrdersPage() {
  serviceOrdersPage.municipality.textContent = serviceOrdersDemoData.municipality.name;
  setupServiceOrdersEvents();
  renderServiceOrdersTable();
}

initializeServiceOrdersPage();
