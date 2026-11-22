// Autor: Gabrielle Mota, Sophia Fernandes

// Página de acompanhamento de chamados do cidadão integrada com o back-end Java (Javalin + MongoDB).

// Guarda na memória os chamados carregados do banco de dados
let listaChamados = [];


// Inicializa a tabela e o modal de detalhes da pÃ¡gina
function initializeTicketTracking() {
  // Pega os elementos do HTML pelos IDs originais da tela
  const tableBody = document.getElementById("ticketsTableBody");
  const ticketCount = document.getElementById("ticketCount");
  const tableWrap = document.getElementById("ticketsTableWrap");
  const emptyState = document.getElementById("ticketsEmptyState");
  const modalElement = document.getElementById("ticketDetailsModal");

  if (!tableBody || !tableWrap || !emptyState || !modalElement) return;

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
      const resposta = await fetch("/api/ocorrencias/minhas", {
        credentials: "same-origin",
        cache: "no-store"
      });
      if (resposta.status === 401) {
        throw new Error("Entre na sua conta para acompanhar os chamados que você abriu.");
      }
      if (!resposta.ok) throw new Error("Falha ao buscar seus chamados.");

      const dadosBanco = await resposta.json();
      if (!Array.isArray(dadosBanco)) throw new Error("Resposta inválida ao consultar seus chamados.");

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
        imagem: doc.imagem || null
      }));
      emptyState.querySelector("strong").textContent = "Você não possui chamados para acompanhar";
      renderTickets();
    } catch (erro) {
      console.error("Erro ao carregar os chamados da conta autenticada:", erro);
      listaChamados = [];
      emptyState.querySelector("strong").textContent = erro.message;
      renderTickets();
    }
  }
  let selectedTicket = null;

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
