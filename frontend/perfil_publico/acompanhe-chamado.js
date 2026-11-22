// Autor: Gabrielle Mota, Sophia Fernandes

// Página de acompanhamento de chamados do cidadão integrada com o back-end Java (Javalin + MongoDB).

// Guarda na memória os chamados carregados do banco de dados
let listaChamados = [];

// Guarda os dados de contato do cidadão logado (ou valores padrão caso não esteja logado)
let contatoCidadao = {
  id: null,
  nome: "Cidadão",
  email: "Não informado",
  telefone: "Não informado"
};

// Inicializa a tabela, o modal de detalhes e o controle de notificações da página
function initializeTicketTracking() {
  // Pega os elementos do HTML pelos IDs originais da tela
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

  // Define a cor da etiqueta (badge) de acordo com o status do chamado
  function statusClass(status) {
    if (status === "Aberta" || status === "Recebida") return "ticket-status-aberta";
    if (status === "Concluída") return "ticket-status-concluida";
    return "ticket-status-andamento";
  }

  // Define a cor da etiqueta (badge) de acordo com a prioridade/urgência
  function priorityClass(priority) {
    if (priority === "Alta" || priority === "Crítica") return "ticket-priority-alta";
    if (priority === "Média") return "ticket-priority-media";
    return "ticket-priority-baixa";
  }

  // Formata o nome do município (ex: "campinas" vira "Campinas - SP")
  function formatarMunicipio(mun) {
    if (!mun) return "Campinas - SP";
    const nomesPorId = {
      "6ae666a7680e8a4330a1ab66": "Campinas - SP",
      "6ae7854cb9962492d01e6af6": "Hortolândia - SP",
      "6ae7856ab9962492d01e6af7": "Sumaré - SP"
    };
    if (nomesPorId[mun]) return nomesPorId[mun];
    if (mun.includes("-")) return mun;
    return mun.charAt(0).toUpperCase() + mun.slice(1) + " - SP";
  }

  // Extrai o bairro do endereço caso o registro antigo não tenha o campo bairro separado
  function extrairBairro(endereco) {
    if (endereco && endereco.includes("-")) {
      const partes = endereco.split("-");
      return partes[partes.length - 1].trim();
    }
    return "Centro";
  }

  // Desenha as linhas da tabela com os chamados vindos do banco de dados
  function renderTickets() {
    tableBody.replaceChildren();

    listaChamados.forEach(ticket => {
      const row = document.createElement("tr");

      // Coluna do ID/Protocolo com link clicável que abre o modal de detalhes
      const idCell = document.createElement("td");
      const idLink = document.createElement("a");
      idLink.className = "ticket-id-link";
      idLink.href = "#ticketDetailsModal";
      idLink.dataset.bsToggle = "modal";
      idLink.dataset.bsTarget = "#ticketDetailsModal";
      idLink.dataset.ticketId = String(ticket.id);
      idLink.setAttribute("aria-label", `Ver detalhes do chamado ${ticket.protocolo}`);
      idLink.textContent = ticket.protocolo;
      idCell.appendChild(idLink);
      row.appendChild(idCell);

      // Colunas de Município, Bairro e Tipo do problema
      [ticket.municipio, ticket.bairro, ticket.tipo].forEach(value => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      // Coluna de Status com etiqueta colorida
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `ticket-badge ${statusClass(ticket.status)}`;
      statusBadge.textContent = ticket.status;
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // Coluna de Prioridade com etiqueta colorida
      const priorityCell = document.createElement("td");
      const priorityBadge = document.createElement("span");
      priorityBadge.className = `ticket-badge ${priorityClass(ticket.prioridade)}`;
      priorityBadge.textContent = ticket.prioridade;
      priorityCell.appendChild(priorityBadge);
      row.appendChild(priorityCell);

      tableBody.appendChild(row);
    });

    // Mostra a tabela se houver chamados ou exibe a mensagem de lista vazia
    const hasTickets = listaChamados.length > 0;
    tableWrap.classList.toggle("d-none", !hasTickets);
    emptyState.classList.toggle("d-none", hasTickets);
    ticketCount.textContent = `${listaChamados.length} ${listaChamados.length === 1 ? "chamado" : "chamados"}`;
  }

  // Busca os dados da sessão do cidadão logado e depois carrega os chamados dele na API
  async function carregarChamadosDoBackend() {
    try {
      // 1. Tenta identificar o cidadão logado na sessão
      const respSessao = await fetch("/api/contas/sessao");
      if (respSessao.ok) {
        const sessao = await respSessao.json();
        if (sessao) {
          contatoCidadao.id = sessao.id || sessao._id || null;
          contatoCidadao.nome = sessao.nome || contatoCidadao.nome;
          contatoCidadao.email = sessao.email || contatoCidadao.email;
          contatoCidadao.telefone = sessao.telefone || contatoCidadao.telefone;
        }
      }
    } catch (e) {
      // Se não houver sessão ativa, segue com consulta padrão
    }

    try {
      // 2. Busca os chamados do cidadão (ou todos os chamados públicos caso esteja sem login)
      const url = contatoCidadao.id
        ? `/api/ocorrencias/minhas?cidadaoId=${encodeURIComponent(contatoCidadao.id)}`
        : `/api/ocorrencias`;

      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error("Falha ao buscar chamados");

      const dadosBanco = await resposta.json();

      // Converte os documentos vindos do MongoDB para o formato que a tela e o modal usam
      listaChamados = dadosBanco.map(doc => ({
        id: doc.id || doc._id,
        protocolo: doc.protocolo || doc.id || doc._id,
        municipio: formatarMunicipio(doc.municipioId),
        bairro: doc.bairro || extrairBairro(doc.localizacao),
        endereco: doc.localizacao || "-",
        tipo: doc.tipoProblema || "-",
        status: doc.status || "Recebida",
        prioridade: doc.prioridade || doc.urgencia || "Média",
        fotoDescricao: doc.descricao || "Sem descrição informada",
        imagem: doc.imagem || null,
        recebeNotificacao: Boolean(doc.receberNotificacoes),
        nomeContato: doc.nomeContato || contatoCidadao.nome,
        emailContato: doc.emailContato || contatoCidadao.email,
        telefoneContato: doc.telefoneContato || contatoCidadao.telefone
      }));

      renderTickets();
    } catch (erro) {
      console.error("Erro ao carregar chamados do servidor:", erro);
      listaChamados = [];
      renderTickets();
    }
  }

  // Variáveis que controlam qual chamado está aberto no modal e se houve alteração não salva
  let selectedTicket = null;
  let savedNotificationPreference = false;
  let isSavingPreference = false;

  // Verifica se o usuário mudou a chavinha de notificação e ainda não clicou em Salvar
  function hasUnsavedPreference() {
    return selectedTicket !== null && notificationToggle.checked !== savedNotificationPreference;
  }

  // Mostra o botão "Salvar" apenas quando houver alteração pendente no modal
  function updateSaveButton() {
    const hasChanges = hasUnsavedPreference();
    saveButton.classList.toggle("d-none", !hasChanges);
    saveButton.disabled = !hasChanges || isSavingPreference;
  }

  // Quando o usuário clica no protocolo/ID, preenche o modal com os detalhes daquele chamado
  modalElement.addEventListener("show.bs.modal", event => {
    const trigger = event.relatedTarget;
    const ticketId = String(trigger?.dataset.ticketId);
    selectedTicket = listaChamados.find(ticket => String(ticket.id) === ticketId) || null;
    if (!selectedTicket) return;

    document.getElementById("ticketModalTitle").textContent = `Chamado #${selectedTicket.protocolo}`;
    document.getElementById("detailId").textContent = selectedTicket.protocolo;
    document.getElementById("detailMunicipality").textContent = selectedTicket.municipio;
    document.getElementById("detailAddress").textContent = selectedTicket.endereco;
    document.getElementById("detailType").textContent = selectedTicket.tipo;
    document.getElementById("detailStatus").textContent = selectedTicket.status;
    document.getElementById("detailPriority").textContent = selectedTicket.prioridade;

    const photoPlaceholder = document.querySelector(".ticket-photo-placeholder");
    if (photoPlaceholder) {
      photoPlaceholder.setAttribute("aria-label", selectedTicket.fotoDescricao);
    }

    // Marca ou desmarca o botão de notificação conforme o que está salvo no banco
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

  // Impede fechar o modal sem salvar caso o usuário tenha mudado a chavinha de notificação
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

  // Exibe no modal o nome, e-mail e telefone que receberão as notificações do chamado
  function updateNotificationContact() {
    const enabled = notificationToggle.checked;
    contactDetails.classList.toggle("d-none", !enabled);
    if (!enabled || !selectedTicket) return;

    document.getElementById("notificationContactName").textContent = selectedTicket.nomeContato || contatoCidadao.nome;
    document.getElementById("notificationContactEmail").textContent = selectedTicket.emailContato || contatoCidadao.email;
    document.getElementById("notificationContactPhone").textContent = selectedTicket.telefoneContato || contatoCidadao.telefone;
  }

  // Avisa o usuário que ele precisa clicar em Salvar quando muda a chavinha de notificação
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

    feedback.textContent = enabled
      ? "Preferência alterada. Salve para ativar as notificações."
      : "Preferência alterada. Salve para desativar as notificações.";
    feedback.classList.remove("d-none", "is-error");
  });

  // Envia a nova preferência de notificação para o back-end via PATCH /api/ocorrencias/{id}/notificacoes
  saveButton.addEventListener("click", async () => {
    if (!selectedTicket || !hasUnsavedPreference() || isSavingPreference) return;

    isSavingPreference = true;
    notificationToggle.disabled = true;
    saveButton.disabled = true;
    feedback.textContent = "Salvando sua preferência...";
    feedback.classList.remove("d-none", "is-error");

    try {
      const response = await fetch(`/api/ocorrencias/${encodeURIComponent(selectedTicket.id)}/notificacoes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receberNotificacoes: notificationToggle.checked,
          nomeContato: selectedTicket.nomeContato || contatoCidadao.nome,
          emailContato: selectedTicket.emailContato || contatoCidadao.email,
          telefoneContato: selectedTicket.telefoneContato || contatoCidadao.telefone
        })
      });

      if (!response.ok) throw new Error("Erro ao salvar no servidor");

      selectedTicket.recebeNotificacao = notificationToggle.checked;
      savedNotificationPreference = selectedTicket.recebeNotificacao;
      feedback.textContent = "Preferência de notificação salva com sucesso!";
    } catch (error) {
      feedback.textContent = "Não foi possível salvar. Tente novamente.";
      feedback.classList.add("is-error");
    } finally {
      isSavingPreference = false;
      notificationToggle.disabled = false;
      updateSaveButton();
    }
  });

  // Carrega os chamados reais assim que a página abre
  carregarChamadosDoBackend();
}

// Inicia a função quando o DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTicketTracking, { once: true });
} else {
  initializeTicketTracking();
}
