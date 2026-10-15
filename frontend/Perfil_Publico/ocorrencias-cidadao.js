// Página de consulta de ocorrências do portal público Arboriza.
// Os dados abaixo são temporários e servem para demonstrar a tabela e os filtros.

// Substituir esta lista pela resposta da API conectada ao banco de dados.
// Ponto de integração: fazer GET /api/ocorrencias com município, tipo, status e prioridade
// como parâmetros de consulta. O back-end deve retornar as ocorrências permitidas ao cidadão,
// incluindo as que estão em andamento; os filtros podem ser aplicados no servidor ou no navegador.
const ocorrenciasDemonstracao = [
  { id: 1024, municipio: "Campinas", bairro: "Cambuí", tipo: "Galho quebrado", status: "Em andamento", prioridade: "Alta" },
  { id: 1025, municipio: "Hortolândia", bairro: "Jardim Amanda", tipo: "Árvore em risco", status: "Aberta", prioridade: "Alta" },
  { id: 1026, municipio: "Sumaré", bairro: "Centro", tipo: "Necessidade de poda", status: "Em andamento", prioridade: "Média" },
  { id: 1027, municipio: "Campinas", bairro: "Taquaral", tipo: "Manutenção preventiva", status: "Concluída", prioridade: "Baixa" },
  { id: 1028, municipio: "Hortolândia", bairro: "Remanso Campineiro", tipo: "Árvore caída", status: "Aberta", prioridade: "Alta" },
  { id: 1029, municipio: "Sumaré", bairro: "Matão", tipo: "Outros", status: "Em andamento", prioridade: "Baixa" },
  { id: 1030, municipio: "Campinas", bairro: "Barão Geraldo", tipo: "Árvore em risco", status: "Em andamento", prioridade: "Média" }
];

// Aguarda o carregamento do HTML inserido pelo sidebar antes de acessar os filtros e a tabela.
function initializeCitizenOccurrences() {
  const municipalityFilter = document.getElementById("filterMunicipality");
  const typeFilter = document.getElementById("filterType");
  const statusFilter = document.getElementById("filterStatus");
  const priorityFilter = document.getElementById("filterPriority");
  const tableBody = document.getElementById("occurrencesTableBody");
  const resultsCount = document.getElementById("resultsCount");
  const emptyState = document.getElementById("emptyState");

  if (!municipalityFilter || !typeFilter || !statusFilter || !priorityFilter || !tableBody) return;

  // Marca a opção de ocorrências no sidebar compartilhado como a página atual.
  const occurrencesNavLink = document.getElementById("navOccurrences");
  if (occurrencesNavLink) {
    occurrencesNavLink.href = "ocorrencias-cidadao.html";
    occurrencesNavLink.classList.add("active");
    occurrencesNavLink.setAttribute("aria-current", "page");
  }

  // Converte o status em uma classe CSS para exibir uma etiqueta com cor correspondente.
  function statusClass(status) {
    if (status === "Aberta") return "status-aberta";
    if (status === "Concluída") return "status-concluida";
    return "status-andamento";
  }

  // Converte a prioridade em uma classe CSS e mantém o texto da linha acessível.
  function priorityClass(priority) {
    if (priority === "Alta") return "priority-alta";
    if (priority === "Média") return "priority-media";
    return "priority-baixa";
  }

  // Aplica em conjunto todos os filtros selecionados e redesenha apenas as linhas correspondentes.
  function updateOccurrencesTable() {
    const filteredOccurrences = ocorrenciasDemonstracao.filter(occurrence => {
      return (!municipalityFilter.value || occurrence.municipio === municipalityFilter.value)
        && (!typeFilter.value || occurrence.tipo === typeFilter.value)
        && (!statusFilter.value || occurrence.status === statusFilter.value)
        && (!priorityFilter.value || occurrence.prioridade === priorityFilter.value);
    });

    // Prepara as células usando textContent para que valores recebidos da API sejam exibidos como texto.
    tableBody.replaceChildren();
    filteredOccurrences.forEach(occurrence => {
      const row = document.createElement("tr");
      const values = [
        { text: occurrence.id, className: "occurrence-id" },
        { text: occurrence.municipio },
        { text: occurrence.bairro },
        { text: occurrence.tipo },
        { text: occurrence.status, className: `occurrence-badge ${statusClass(occurrence.status)}` },
        { text: occurrence.prioridade, className: `occurrence-badge ${priorityClass(occurrence.prioridade)}` }
      ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");
        if (index === 4 || index === 5) {
          const badge = document.createElement("span");
          badge.className = value.className;
          badge.textContent = value.text;
          cell.appendChild(badge);
        } else {
          cell.textContent = value.text;
          if (value.className) cell.className = value.className;
        }
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });

    // Informa a quantidade de resultados ou orienta quando não há registros para os filtros atuais.
    resultsCount.textContent = `${filteredOccurrences.length} ${filteredOccurrences.length === 1 ? "ocorrência encontrada" : "ocorrências encontradas"}`;
    emptyState.classList.toggle("d-none", filteredOccurrences.length > 0);
  }

  // Atualiza a tabela sempre que qualquer um dos quatro selects mudar.
  [municipalityFilter, typeFilter, statusFilter, priorityFilter].forEach(filter => {
    filter.addEventListener("change", updateOccurrencesTable);
  });

  // Futuramente, substituir a renderização inicial pela chamada assíncrona à API/banco de dados.
  // Exemplo: fetch(`/api/ocorrencias?${new URLSearchParams(filters)}`), validar a resposta,
  // guardar os registros recebidos e então chamar updateOccurrencesTable().
  updateOccurrencesTable();
}

// O sidebar injeta este arquivo dinamicamente; trata tanto o DOM pronto quanto o carregamento inicial.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCitizenOccurrences, { once: true });
} else {
  initializeCitizenOccurrences();
}

