// Dados temporarios para representar os chamados criados pelo cidadao autenticado.
// Integracao futura com o banco: consultar GET /api/cidadaos/me/chamados usando o token da sessao.
// O servidor deve identificar o cidadao pelo token e retornar somente os chamados dele.
const chamadosDemonstracao = [
  {
    id: 2401,
    municipio: "Campinas - SP",
    bairro: "Cambuí",
    endereco: "Rua Maria Monteiro, 640, Cambuí, Campinas - SP",
    tipo: "Galho quebrado",
    status: "Em andamento",
    prioridade: "Alta",
    fotoDescricao: "Galho quebrado próximo à calçada",
    recebeNotificacao: true
  },
  {
    id: 2402,
    municipio: "Campinas - SP",
    bairro: "Taquaral",
    endereco: "Avenida Júlio Prestes, 1250, Taquaral, Campinas - SP",
    tipo: "Árvore em risco",
    status: "Aberta",
    prioridade: "Média",
    fotoDescricao: "Árvore inclinada em área pública",
    recebeNotificacao: false
  },
  {
    id: 2403,
    municipio: "Hortolândia - SP",
    bairro: "Jardim Amanda",
    endereco: "Rua das Paineiras, 82, Jardim Amanda, Hortolândia - SP",
    tipo: "Necessidade de poda",
    status: "Concluída",
    prioridade: "Baixa",
    fotoDescricao: "Copa de árvore próxima à iluminação",
    recebeNotificacao: true
  }
];

// Dados ficticios usados para demonstrar o preenchimento automatico do contato.
// Na integracao real, carregar nome, e-mail e telefone do perfil autenticado na API.
const contatoCidadaoDemonstracao = {
  nome: "Mariana Oliveira",
  email: "mariana.oliveira@exemplo.com",
  telefone: "(19) 99999-1234"
};

// Prepara a tabela, o modal Bootstrap e os controles de notificacao da pagina.
function initializeTicketTracking() {
  const tableBody = document.getElementById("ticketsTableBody");
  const ticketCount = document.getElementById("ticketCount");
  const tableWrap = document.getElementById("ticketsTableWrap");
  const emptyState = document.getElementById("ticketsEmptyState");
  const modalElement = document.getElementById("ticketDetailsModal");
  const notificationToggle = document.getElementById("ticketNotificationsToggle");
  const saveButton = document.getElementById("saveNotificationPreference");
  const contactDetails = document.getElementById("notificationContactDetails");
  const feedback = document.getElementById("notificationFeedback");

  if (!tableBody || !tableWrap || !emptyState || !modalElement || !notificationToggle || !saveButton) return;

  // Converte o status e a prioridade em classes visuais para as etiquetas da tabela.
  function statusClass(status) {
    if (status === "Aberta") return "ticket-status-aberta";
    if (status === "Concluída") return "ticket-status-concluida";
    return "ticket-status-andamento";
  }

  function priorityClass(priority) {
    if (priority === "Alta") return "ticket-priority-alta";
    if (priority === "Média") return "ticket-priority-media";
    return "ticket-priority-baixa";
  }

  // Monta linhas da tabela com textContent para tratar os dados como texto visivel.
  function renderTickets() {
    tableBody.replaceChildren();

    chamadosDemonstracao.forEach(ticket => {
      const row = document.createElement("tr");
      const idCell = document.createElement("td");
      const idLink = document.createElement("a");
      idLink.className = "ticket-id-link";
      idLink.href = "#ticketDetailsModal";
      idLink.dataset.bsToggle = "modal";
      idLink.dataset.bsTarget = "#ticketDetailsModal";
      idLink.dataset.ticketId = String(ticket.id);
      idLink.setAttribute("aria-label", `Ver detalhes do chamado ${ticket.id}`);
      idLink.textContent = ticket.id;
      idCell.appendChild(idLink);
      row.appendChild(idCell);

      [ticket.municipio, ticket.bairro, ticket.tipo].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `ticket-badge ${statusClass(ticket.status)}`;
      statusBadge.textContent = ticket.status;
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      const priorityCell = document.createElement("td");
      const priorityBadge = document.createElement("span");
      priorityBadge.className = `ticket-badge ${priorityClass(ticket.prioridade)}`;
      priorityBadge.textContent = ticket.prioridade;
      priorityCell.appendChild(priorityBadge);
      row.appendChild(priorityCell);

      tableBody.appendChild(row);
    });

    // Alterna entre a tabela e a mensagem pedida quando a consulta nao retornar chamados.
    const hasTickets = chamadosDemonstracao.length > 0;
    tableWrap.classList.toggle("d-none", !hasTickets);
    emptyState.classList.toggle("d-none", hasTickets);
    ticketCount.textContent = `${chamadosDemonstracao.length} ${chamadosDemonstracao.length === 1 ? "chamado" : "chamados"}`;
  }

  // Guarda o registro aberto, o valor persistido e se ha uma gravacao em andamento.
  let selectedTicket = null;
  let savedNotificationPreference = false;
  let isSavingPreference = false;

  // Compara o valor escolhido no modal com o valor salvo para decidir se ha alteracoes pendentes.
  function hasUnsavedPreference() {
    return selectedTicket !== null && notificationToggle.checked !== savedNotificationPreference;
  }

  // Mostra o botao Salvar somente quando a pessoa alterou a preferencia deste chamado.
  function updateSaveButton() {
    const hasChanges = hasUnsavedPreference();
    saveButton.classList.toggle("d-none", !hasChanges);
    saveButton.disabled = !hasChanges || isSavingPreference;
  }

  // Ao abrir o modal, localiza o registro pelo ID do link e preenche seus detalhes.
  modalElement.addEventListener("show.bs.modal", event => {
    const trigger = event.relatedTarget;
    const ticketId = Number(trigger?.dataset.ticketId);
    selectedTicket = chamadosDemonstracao.find(ticket => ticket.id === ticketId) || null;
    if (!selectedTicket) return;

    document.getElementById("ticketModalTitle").textContent = `Chamado #${selectedTicket.id}`;
    document.getElementById("detailId").textContent = selectedTicket.id;
    document.getElementById("detailMunicipality").textContent = selectedTicket.municipio;
    document.getElementById("detailAddress").textContent = selectedTicket.endereco;
    document.getElementById("detailType").textContent = selectedTicket.tipo;
    document.getElementById("detailStatus").textContent = selectedTicket.status;
    document.getElementById("detailPriority").textContent = selectedTicket.prioridade;
    document.querySelector(".ticket-photo-placeholder").setAttribute("aria-label", selectedTicket.fotoDescricao);

    // Reflete a preferencia ja salva para este chamado e mostra o contato correspondente.
    notificationToggle.checked = selectedTicket.recebeNotificacao;
    savedNotificationPreference = selectedTicket.recebeNotificacao;
    isSavingPreference = false;
    notificationToggle.disabled = false;
    updateNotificationContact();
    updateSaveButton();
    feedback.classList.add("d-none");
    feedback.classList.remove("is-error");
    feedback.textContent = "";
  });

  // Bloqueia X, tecla Esc e clique no fundo enquanto houver alteracoes ainda nao salvas.
  modalElement.addEventListener("hide.bs.modal", event => {
    if (isSavingPreference) {
      event.preventDefault();
      return;
    }
    if (hasUnsavedPreference()) {
      event.preventDefault();
      feedback.textContent = "Salve a alteração antes de fechar este chamado.";
      feedback.classList.remove("d-none");
      feedback.classList.add("is-error");
    }
  });

  // Demonstra o preenchimento do contato do perfil quando notificacoes estao ativadas.
  function updateNotificationContact() {
    const enabled = notificationToggle.checked;
    contactDetails.classList.toggle("d-none", !enabled);
    if (!enabled) return;
    document.getElementById("notificationContactName").textContent = contatoCidadaoDemonstracao.nome;
    document.getElementById("notificationContactEmail").textContent = contatoCidadaoDemonstracao.email;
    document.getElementById("notificationContactPhone").textContent = contatoCidadaoDemonstracao.telefone;
  }

  // Atualiza a preferencia que esta em edicao sem alterar ainda o valor salvo.
  notificationToggle.addEventListener("change", () => {
    if (!selectedTicket) return;
    const enabled = notificationToggle.checked;
    updateNotificationContact();
    updateSaveButton();

    if (!hasUnsavedPreference()) {
      feedback.classList.add("d-none");
      feedback.textContent = "";
      return;
    }

    if (enabled) {
      feedback.textContent = "Preferência alterada. Salve para ativar as notificações.";
    } else {
      feedback.textContent = "Preferência alterada. Salve para desativar as notificações.";
    }
    feedback.classList.remove("d-none", "is-error");
  });

  // Salva a preferencia alterada; enquanto nao terminar, o modal e o controle ficam bloqueados.
  saveButton.addEventListener("click", async () => {
    if (!selectedTicket || !hasUnsavedPreference() || isSavingPreference) return;

    isSavingPreference = true;
    notificationToggle.disabled = true;
    saveButton.disabled = true;
    feedback.textContent = "Salvando sua preferência...";
    feedback.classList.remove("d-none", "is-error");

    try {
      // FUTURO BACK-END: enviar a requisicao com token para /api/chamados/{id}/notificacoes.
      // Se marcado, usar POST e preencher nome, e-mail e telefone pelo perfil autenticado.
      // Se desmarcado, usar DELETE para remover a inscricao do banco para este chamado.
      // Modo demonstrativo: atualiza somente o registro temporario em memoria.
      selectedTicket.recebeNotificacao = notificationToggle.checked;
      savedNotificationPreference = selectedTicket.recebeNotificacao;
      feedback.textContent = "Preferência salva no modo demonstrativo.";
    } catch (error) {
      feedback.textContent = "Não foi possível salvar. Tente novamente.";
      feedback.classList.add("is-error");
    } finally {
      isSavingPreference = false;
      notificationToggle.disabled = false;
      updateSaveButton();
    }
  });

  // Ponto de integracao: carregar os chamados do usuario na API em vez desta lista ficticia.
  // A acao do controle de notificacao tambem deve enviar o token da sessao para associar a preferencia ao cidadao.
  renderTickets();
}

// O sidebar injeta este arquivo; inicializa apos o DOM estar pronto ou imediatamente se ja estiver.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTicketTracking, { once: true });
} else {
  initializeTicketTracking();
}
