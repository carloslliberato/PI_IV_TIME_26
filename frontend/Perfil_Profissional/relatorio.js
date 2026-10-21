// Mantém descrições e agrupamentos disponíveis para cada assunto do painel.
// Lista de equipes de demonstração; na integração, será carregada pelo município da sessão.
// API/BD: cada equipe precisa fornecer id e nome para preencher o filtro.
const reportTeamOptions = [
  { id: "EQ-001", name: "Equipe Norte" },
  { id: "EQ-002", name: "Equipe Central" },
  { id: "EQ-003", name: "Equipe Sul" },
  { id: "EQ-004", name: "Equipe de poda" }
];

// Contagens fictícias de ordens atribuídas às equipes, agrupadas por período.
// API/BD: para cada período, retornar total geral e contagem por equipe_id.
const teamOrderPeriodData = {
  month: {
    all: [{ group: "Janeiro", count: 4 }, { group: "Fevereiro", count: 3 }, { group: "Março", count: 4 }, { group: "Abril", count: 2 }, { group: "Maio", count: 3 }, { group: "Junho", count: 2 }, { group: "Julho", count: 4 }, { group: "Agosto", count: 3 }, { group: "Setembro", count: 2 }, { group: "Outubro", count: 2 }, { group: "Novembro", count: 1 }, { group: "Dezembro", count: 2 }],
    byTeam: {
      "EQ-001": [{ group: "Janeiro", count: 1 }, { group: "Fevereiro", count: 1 }, { group: "Março", count: 1 }, { group: "Abril", count: 1 }, { group: "Maio", count: 1 }, { group: "Junho", count: 1 }, { group: "Julho", count: 1 }, { group: "Agosto", count: 1 }, { group: "Setembro", count: 1 }, { group: "Outubro", count: 0 }, { group: "Novembro", count: 0 }, { group: "Dezembro", count: 0 }],
      "EQ-002": [{ group: "Janeiro", count: 1 }, { group: "Fevereiro", count: 1 }, { group: "Março", count: 1 }, { group: "Abril", count: 0 }, { group: "Maio", count: 1 }, { group: "Junho", count: 0 }, { group: "Julho", count: 1 }, { group: "Agosto", count: 1 }, { group: "Setembro", count: 0 }, { group: "Outubro", count: 1 }, { group: "Novembro", count: 0 }, { group: "Dezembro", count: 1 }],
      "EQ-003": [{ group: "Janeiro", count: 1 }, { group: "Fevereiro", count: 1 }, { group: "Março", count: 1 }, { group: "Abril", count: 0 }, { group: "Maio", count: 1 }, { group: "Junho", count: 1 }, { group: "Julho", count: 1 }, { group: "Agosto", count: 0 }, { group: "Setembro", count: 1 }, { group: "Outubro", count: 0 }, { group: "Novembro", count: 0 }, { group: "Dezembro", count: 0 }],
      "EQ-004": [{ group: "Janeiro", count: 1 }, { group: "Fevereiro", count: 0 }, { group: "Março", count: 1 }, { group: "Abril", count: 1 }, { group: "Maio", count: 0 }, { group: "Junho", count: 0 }, { group: "Julho", count: 1 }, { group: "Agosto", count: 1 }, { group: "Setembro", count: 0 }, { group: "Outubro", count: 1 }, { group: "Novembro", count: 1 }, { group: "Dezembro", count: 1 }]
    }
  },
  semester: {
    all: [{ group: "1º semestre", count: 18 }, { group: "2º semestre", count: 14 }],
    byTeam: {
      "EQ-001": [{ group: "1º semestre", count: 6 }, { group: "2º semestre", count: 3 }],
      "EQ-002": [{ group: "1º semestre", count: 4 }, { group: "2º semestre", count: 4 }],
      "EQ-003": [{ group: "1º semestre", count: 5 }, { group: "2º semestre", count: 2 }],
      "EQ-004": [{ group: "1º semestre", count: 3 }, { group: "2º semestre", count: 5 }]
    }
  },
  year: {
    all: [{ group: "2023", count: 48 }, { group: "2024", count: 76 }, { group: "2025", count: 91 }, { group: "2026", count: 32 }],
    byTeam: {
      "EQ-001": [{ group: "2023", count: 12 }, { group: "2024", count: 18 }, { group: "2025", count: 25 }, { group: "2026", count: 9 }],
      "EQ-002": [{ group: "2023", count: 15 }, { group: "2024", count: 24 }, { group: "2025", count: 28 }, { group: "2026", count: 8 }],
      "EQ-003": [{ group: "2023", count: 10 }, { group: "2024", count: 16 }, { group: "2025", count: 21 }, { group: "2026", count: 7 }],
      "EQ-004": [{ group: "2023", count: 11 }, { group: "2024", count: 18 }, { group: "2025", count: 17 }, { group: "2026", count: 8 }]
    }
  }
};

const reportCatalog = {
  trees: {
    label: "Árvores",
    groups: {
      neighborhood: {
        label: "Bairro",
        title: "Árvores por bairro",
        description: "Distribuição das árvores cadastradas por bairro.",
        // DADOS FICTÍCIOS. API/BD: agrupar árvores por bairro e retornar [{grupo, quantidade}].
        values: [{ group: "Centro", count: 286 }, { group: "Taquaral", count: 243 }, { group: "Cambuí", count: 218 }, { group: "Jardim Chapadão", count: 192 }, { group: "Barão Geraldo", count: 177 }, { group: "Outros bairros", count: 168 }]
      },
      species: {
        label: "Espécie",
        title: "Árvores por espécie",
        description: "Espécies mais presentes no cadastro municipal.",
        // DADOS FICTÍCIOS. API/BD: retornar nome popular da espécie e total de árvores por espécie.
        values: [{ group: "Ipê-amarelo", count: 248 }, { group: "Pau-brasil", count: 193 }, { group: "Sibipiruna", count: 176 }, { group: "Quaresmeira", count: 154 }, { group: "Jatobá", count: 132 }, { group: "Outras espécies", count: 381 }]
      },
      risk: {
        label: "Risco",
        title: "Árvores por nível de risco",
        description: "Quantidade de árvores em cada nível de risco cadastrado.",
        // DADOS FICTÍCIOS. API/BD: retornar nível de risco (baixo, médio, alto ou crítico) e contagem.
        values: [{ group: "Baixo", count: 1141 }, { group: "Médio", count: 116 }, { group: "Alto", count: 22 }, { group: "Crítico", count: 5 }]
      }
    }
  },
  occurrences: {
    label: "Ocorrências",
    groups: {
      status: {
        label: "Status",
        title: "Ocorrências por status",
        description: "Situação atual das ocorrências registradas no município.",
        // DADOS FICTÍCIOS. API/BD: retornar status atual e quantidade de ocorrências por status.
        values: [{ group: "Aguardando análise", count: 38 }, { group: "Em atendimento", count: 24 }, { group: "Concluída", count: 91 }, { group: "Parada", count: 7 }]
      },
      region: {
        label: "Região",
        title: "Ocorrências por região",
        description: "Distribuição das ocorrências pelas regiões de atendimento.",
        // DADOS FICTÍCIOS. API/BD: retornar região/bairro associado a cada ocorrência e sua contagem.
        values: [{ group: "Região Central", count: 46 }, { group: "Região Norte", count: 39 }, { group: "Região Sul", count: 31 }, { group: "Região Leste", count: 27 }, { group: "Região Oeste", count: 17 }]
      },
      risk: {
        label: "Risco",
        title: "Ocorrências por nível de risco",
        description: "Nível de risco informado nas ocorrências registradas.",
        // DADOS FICTÍCIOS. API/BD: retornar classificação de risco da ocorrência e quantidade por classificação.
        values: [{ group: "Baixo", count: 42 }, { group: "Médio", count: 59 }, { group: "Alto", count: 45 }, { group: "Crítico", count: 14 }]
      }
    }
  },
  orders: {
    label: "Ordens de serviço",
    groups: {
      year: {
        label: "Ano",
        title: "Ordens de serviço por ano",
        description: "Ordens de serviço registradas por ano.",
        // DADOS FICTÍCIOS. API/BD: retornar ano de abertura e total de ordens naquele ano.
        values: [{ group: "2023", count: 48 }, { group: "2024", count: 76 }, { group: "2025", count: 91 }, { group: "2026", count: 32 }]
      },
      month: {
        label: "Mês",
        title: "Ordens de serviço por mês",
        description: "Ordens de serviço abertas em cada mês do ano atual.",
        // DADOS FICTÍCIOS. API/BD: retornar mês e contagem; usar parâmetro ano para selecionar o período.
        values: [{ group: "Janeiro", count: 4 }, { group: "Fevereiro", count: 3 }, { group: "Março", count: 4 }, { group: "Abril", count: 2 }, { group: "Maio", count: 3 }, { group: "Junho", count: 2 }, { group: "Julho", count: 4 }, { group: "Agosto", count: 3 }, { group: "Setembro", count: 2 }, { group: "Outubro", count: 2 }, { group: "Novembro", count: 1 }, { group: "Dezembro", count: 2 }]
      },
      semester: {
        label: "Semestre",
        title: "Ordens de serviço por semestre",
        description: "Comparação entre os dois semestres do ano atual.",
        // DADOS FICTÍCIOS. API/BD: agrupar data de abertura em 1º ou 2º semestre e contar ordens.
        values: [{ group: "1º semestre", count: 18 }, { group: "2º semestre", count: 14 }]
      },
      region: {
        label: "Região",
        title: "Ordens de serviço por região",
        description: "Distribuição das ordens de serviço entre as regiões municipais.",
        // DADOS FICTÍCIOS. API/BD: retornar região da ordem (ou região da equipe designada) e contagem.
        values: [{ group: "Região Central", count: 61 }, { group: "Região Norte", count: 54 }, { group: "Região Sul", count: 49 }, { group: "Região Leste", count: 45 }, { group: "Região Oeste", count: 38 }]
      },
      team: {
        label: "Equipe",
        title: "Ordens de serviço por equipe",
        description: "Quantidade de ordens de serviço direcionadas a cada equipe.",
        // DADOS FICTÍCIOS. API/BD: retornar equipe responsável (id e nome) e total de ordens vinculadas.
        values: [{ group: "Equipe Norte", count: 64 }, { group: "Equipe Central", count: 75 }, { group: "Equipe Sul", count: 54 }, { group: "Equipe de poda", count: 54 }]
      }
    }
  },
  teams: {
    label: "Equipes",
    groups: {
      status: {
        label: "Status",
        title: "Equipes por status",
        description: "Quantidade de equipes disponíveis e indisponíveis no município.",
        // DADOS FICTÍCIOS. API/BD: retornar status da equipe e quantidade por status.
        values: [{ group: "Disponível", count: 6 }, { group: "Indisponível", count: 4 }]
      },
      region: {
        label: "Região de atuação",
        title: "Equipes por região de atuação",
        description: "Distribuição das equipes cadastradas pelas regiões de atendimento.",
        // DADOS FICTÍCIOS. API/BD: retornar região de atuação e quantidade de equipes por região.
        values: [{ group: "Região Central", count: 3 }, { group: "Região Norte", count: 2 }, { group: "Região Sul", count: 2 }, { group: "Região Leste", count: 2 }, { group: "Região Oeste", count: 1 }]
      },
      workload: {
        label: "Ordens por equipe",
        title: "Ordens de serviço por equipe",
        description: "Quantidade de ordens atribuídas a cada equipe cadastrada.",
        // DADOS FICTÍCIOS. API/BD: agrupar ordens por equipe designada e retornar id, nome e total de ordens.
        values: [{ group: "Equipe Norte", count: 68 }, { group: "Equipe Central", count: 75 }, { group: "Equipe Sul", count: 54 }, { group: "Equipe de poda", count: 50 }]
      },
      ordersMonth: {
        label: "Ordens por mês",
        title: "Ordens das equipes por mês",
        description: "Ordens direcionadas às equipes em cada mês do ano atual.",
        totalLabel: "ordens de serviço",
        // DADOS FICTÍCIOS. API/BD: contar ordens com equipe designada por mês de abertura e ano selecionado.
        values: teamOrderPeriodData.month.all,
        teamValues: teamOrderPeriodData.month.byTeam
      },
      ordersSemester: {
        label: "Ordens por semestre",
        title: "Ordens das equipes por semestre",
        description: "Ordens direcionadas às equipes em cada semestre do ano atual.",
        totalLabel: "ordens de serviço",
        // DADOS FICTÍCIOS. API/BD: contar ordens com equipe designada por semestre do ano selecionado.
        values: teamOrderPeriodData.semester.all,
        teamValues: teamOrderPeriodData.semester.byTeam
      },
      ordersYear: {
        label: "Ordens por ano",
        title: "Ordens das equipes por ano",
        description: "Ordens direcionadas às equipes em cada ano.",
        totalLabel: "ordens de serviço",
        // DADOS FICTÍCIOS. API/BD: contar ordens com equipe designada por ano de abertura.
        values: teamOrderPeriodData.year.all,
        teamValues: teamOrderPeriodData.year.byTeam
      }
    }
  }
};

// Guarda referências aos controles e áreas que serão atualizados pelo relatório ativo.
const reportElements = {
  subjectTabs: document.querySelectorAll("[data-report-subject]"),
  groupingTabs: document.getElementById("reportGroupingTabs"),
  teamFilter: document.getElementById("reportTeamFilter"),
  teamSelect: document.getElementById("reportTeamSelect"),
  title: document.getElementById("reportTitle"),
  description: document.getElementById("reportDescription"),
  total: document.getElementById("reportTotal"),
  totalLabel: document.getElementById("reportTotalLabel"),
  groupColumn: document.getElementById("reportGroupColumn"),
  chart: document.getElementById("reportChart"),
  table: document.getElementById("reportTableBody"),
  exportButton: document.getElementById("exportReport"),
  municipality: document.getElementById("reportsMunicipality")
};
let activeReportSubject = "trees";
let activeReportGrouping = "neighborhood";

// Converte textos inseridos na tabela e no gráfico em conteúdo HTML seguro.
function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Atualiza as opções de agrupamento conforme árvores, ocorrências ou ordens são escolhidas.
function updateGroupingOptions() {
  const subject = reportCatalog[activeReportSubject];
  activeReportGrouping = Object.keys(subject.groups)[0];
  reportElements.groupingTabs.innerHTML = Object.entries(subject.groups)
    .map(([key, group], index) => `<button class="report-tab${index === 0 ? " is-active" : ""}" type="button" role="tab" aria-selected="${index === 0}" data-report-grouping="${key}">${escapeReportText(group.label)}</button>`)
    .join("");
}

// Marca visualmente e para tecnologias assistivas o assunto do relatÃ³rio selecionado.
function updateActiveSubjectTab() {
  reportElements.subjectTabs.forEach(tab => {
    const isActive = tab.dataset.reportSubject === activeReportSubject;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
}

// Exibe o filtro de equipe somente nos relatórios temporais dentro da aba Equipes.
function isTeamPeriodReport() {
  return activeReportSubject === "teams"
    && ["ordersMonth", "ordersSemester", "ordersYear"].includes(activeReportGrouping);
}

// Devolve todas as ordens ou somente as ordens da equipe selecionada.
function getSelectedReportValues() {
  const selectedGroup = reportCatalog[activeReportSubject].groups[activeReportGrouping];
  if (isTeamPeriodReport() && reportElements.teamSelect.value) {
    return selectedGroup.teamValues[reportElements.teamSelect.value] || [];
  }
  return selectedGroup.values;
}

// Renderiza os totais, as barras proporcionais e a tabela do agrupamento ativo.
function renderSelectedReport() {
  const subject = reportCatalog[activeReportSubject];
  const selectedGroup = subject.groups[activeReportGrouping];
  const showTeamFilter = isTeamPeriodReport();
  reportElements.teamFilter.hidden = !showTeamFilter;
  const values = getSelectedReportValues();
  const total = values.reduce((sum, row) => sum + row.count, 0);
  const maximum = Math.max(...values.map(row => row.count), 1);

  reportElements.title.textContent = selectedGroup.title;
  reportElements.description.textContent = selectedGroup.description;
  reportElements.total.textContent = total.toLocaleString("pt-BR");
  reportElements.totalLabel.textContent = selectedGroup.totalLabel || subject.label.toLocaleLowerCase();
  reportElements.groupColumn.textContent = selectedGroup.label;

  // Cria as barras usando percentual relativo ao maior grupo, com rótulo acessível.
  reportElements.chart.setAttribute("aria-label", selectedGroup.title);
  reportElements.chart.innerHTML = values.map(row => {
    const barWidth = (row.count / maximum) * 100;
    return `<div class="report-bar-row">
      <span class="report-bar-label" title="${escapeReportText(row.group)}">${escapeReportText(row.group)}</span>
      <span class="report-bar-track" aria-hidden="true"><span class="report-bar-fill" style="width:${barWidth.toFixed(2)}%"></span></span>
      <strong class="report-bar-value">${row.count.toLocaleString("pt-BR")}</strong>
    </div>`;
  }).join("");

  // Repete valores em tabela e percentual do total para consulta detalhada.
  reportElements.table.innerHTML = values.map(row => {
    const percentage = total ? ((row.count / total) * 100).toFixed(1) : "0,0";
    return `<tr><td>${escapeReportText(row.group)}</td><td>${row.count.toLocaleString("pt-BR")}</td><td>${percentage.replace(".", ",")}%</td></tr>`;
  }).join("");
}

// Exporta os dados do agrupamento visível como um arquivo CSV compatível com planilhas.
function exportSelectedReport() {
  const subject = reportCatalog[activeReportSubject];
  const selectedGroup = subject.groups[activeReportGrouping];
  const values = getSelectedReportValues();
  const total = values.reduce((sum, row) => sum + row.count, 0);
  const csvRows = [[selectedGroup.label, "Quantidade", "Participação"]];

  // Usa os mesmos itens da visualização para que arquivo e tela permaneçam consistentes.
  values.forEach(row => {
    const share = total ? ((row.count / total) * 100).toFixed(1).replace(".", ",") : "0,0";
    csvRows.push([row.group, row.count, `${share}%`]);
  });

  const csv = "\uFEFF" + csvRows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  const teamSuffix = reportElements.teamSelect.value ? `-${reportElements.teamSelect.value}` : "";
  downloadLink.download = `${activeReportSubject}-${activeReportGrouping}${teamSuffix}.csv`;
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
}

// Inicializa o município e eventos da tela; este texto virá do perfil autenticado via API.
function initializeReportsPage() {
  // DADOS FICTÍCIOS. API/BD: obter município e setor do usuário autenticado (ex.: GET /api/me).
  reportElements.municipality.textContent = localStorage.getItem("municipio") || "Campinas - SP";
  // Preenche o filtro de equipe com IDs e nomes; futuramente estes virão do cadastro municipal.
  reportElements.teamSelect.insertAdjacentHTML("beforeend", reportTeamOptions
    .map(team => `<option value="${escapeReportText(team.id)}">${escapeReportText(team.name)}</option>`)
    .join(""));
  updateActiveSubjectTab();
  updateGroupingOptions();
  renderSelectedReport();

  // Muda agrupamentos disponíveis ao trocar de assunto e atualiza ao mudar o agrupamento.
  reportElements.subjectTabs.forEach(tab => tab.addEventListener("click", () => {
    activeReportSubject = tab.dataset.reportSubject;
    updateActiveSubjectTab();
    updateGroupingOptions();
    renderSelectedReport();
  }));

  // Atualiza o sublinhado do agrupamento e renderiza os valores correspondentes.
  reportElements.groupingTabs.addEventListener("click", event => {
    const tab = event.target.closest("[data-report-grouping]");
    if (!tab) return;
    activeReportGrouping = tab.dataset.reportGrouping;
    reportElements.groupingTabs.querySelectorAll("[data-report-grouping]").forEach(groupTab => {
      const isActive = groupTab === tab;
      groupTab.classList.toggle("is-active", isActive);
      groupTab.setAttribute("aria-selected", String(isActive));
    });
    renderSelectedReport();
  });
  reportElements.teamSelect.addEventListener("change", renderSelectedReport);
  reportElements.exportButton.addEventListener("click", exportSelectedReport);

  // INTEGRAÇÃO FUTURA: substituir reportCatalog pelos resultados agrupados da API municipal.
  // Campos esperados por linha: grupo (bairro/espécie/risco/status/período/região) e quantidade.
  // Sugestão: GET /api/relatorios?assunto=trees&agrupamento=neighborhood&municipioId={idSetor}.
}

// O sidebar só carrega este arquivo depois de validar login e setor.
initializeReportsPage();
