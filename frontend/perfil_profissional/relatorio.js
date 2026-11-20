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
        description: "Histórico de ordens de serviço por ano de criação."
      },
      month: {
        label: "Mês",
        title: "Ordens de serviço por mês",
        description: "Ordens de serviço por mês no ano informado pelo relatório."
      },
      semester: {
        label: "Semestre",
        title: "Ordens de serviço por semestre",
        description: "Ordens de serviço por semestre no ano informado pelo relatório."
      },
      status: {
        label: "Status",
        title: "Ordens de serviço por status",
        description: "Situação atual das ordens de serviço de todo o histórico municipal."
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
  municipality: document.getElementById("reportsMunicipality"),
  card: document.getElementById("reportCard"),
  visualization: document.getElementById("reportVisualization"),
  feedback: document.getElementById("reportFeedback"),
  dateWarning: document.getElementById("reportDateWarning"),
  retry: document.getElementById("reportRetry"),
  retryButton: document.getElementById("retryOrderReport"),
  sourceNote: document.getElementById("reportSourceNote")
};
let activeReportSubject = "trees";
let activeReportGrouping = "neighborhood";
let demoReportMunicipality = "Campinas - SP";
const orderReportState = { status: "idle", report: null, error: "" };

// Valida o contrato antes de apresentar ou exportar qualquer contagem de OS.
function validateOrderReportResponse(payload) {
  const requireValid = condition => {
    if (!condition) throw new Error("O servidor retornou um relatório de ordens de serviço inválido. Tente novamente.");
  };
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const isCount = value => Number.isSafeInteger(value) && value >= 0;
  requireValid(isObject(payload) && isObject(payload.relatorio));
  const report = payload.relatorio;
  requireValid(typeof report.municipioId === "string" && /^[a-f0-9]{24}$/i.test(report.municipioId));
  requireValid(Number.isInteger(report.anoSelecionado) && report.anoSelecionado >= 1 && report.anoSelecionado <= 9999);
  requireValid(report.fusoHorario === "America/Sao_Paulo");
  ["totalOrdens", "totalNoAno", "ordensSemDataValida"].forEach(key => requireValid(isCount(report[key])));

  const readGroups = key => {
    requireValid(Array.isArray(report[key]));
    const names = new Set();
    return report[key].map(row => {
      requireValid(isObject(row) && typeof row.grupo === "string" && row.grupo.length > 0 && isCount(row.quantidade));
      requireValid(!names.has(row.grupo));
      names.add(row.grupo);
      return { group: row.grupo, count: row.quantidade };
    });
  };
  const groups = {
    year: readGroups("porAno"),
    month: readGroups("porMes"),
    semester: readGroups("porSemestre"),
    status: readGroups("porStatus")
  };
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const semesters = ["1º semestre", "2º semestre"];
  requireValid(groups.month.length === 12 && groups.month.every((row, index) => row.group === months[index]));
  requireValid(groups.semester.length === 2 && groups.semester.every((row, index) => row.group === semesters[index]));
  const standardStatuses = ["Aberta", "Em andamento", "Concluída", "Cancelada"];
  requireValid(standardStatuses.every((status, index) => groups.status[index]?.group === status));
  // Os anos históricos podem ficar fora da faixa aceita para o filtro de ano.
  requireValid(groups.year.every((row, index) => /^-?\d+$/.test(row.group) &&
    Number.isSafeInteger(Number(row.group)) &&
    (index === 0 || Number(groups.year[index - 1].group) < Number(row.group))));
  const sum = rows => rows.reduce((total, row) => total + row.count, 0);
  requireValid(sum(groups.status) === report.totalOrdens);
  requireValid(sum(groups.year) + report.ordensSemDataValida === report.totalOrdens);
  requireValid(sum(groups.month) === report.totalNoAno && sum(groups.semester) === report.totalNoAno);
  requireValid(report.totalNoAno <= report.totalOrdens - report.ordensSemDataValida);
  requireValid(groups.semester[0].count === sum(groups.month.slice(0, 6)) &&
    groups.semester[1].count === sum(groups.month.slice(6)));
  const selectedYear = groups.year.find(row => Number(row.group) === report.anoSelecionado);
  requireValid((selectedYear?.count || 0) === report.totalNoAno);
  return { ...report, groups };
}

// Consulta o ano padrão definido pela API; o município vem da conta autenticada.
async function loadOrderReport() {
  if (orderReportState.status === "loading") {
    if (activeReportSubject === "orders") renderSelectedReport();
    return;
  }
  orderReportState.status = "loading";
  orderReportState.report = null;
  orderReportState.error = "";
  if (activeReportSubject === "orders") renderSelectedReport();
  try {
    const response = await fetch("/api/relatorios/ordens-servico", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Não foi possível ler a resposta do relatório. Tente novamente.");
    }
    if (!response.ok) {
      const message = typeof payload?.erro === "string" && payload.erro.trim()
        ? payload.erro : "Não foi possível consultar o relatório de ordens de serviço. Tente novamente.";
      throw new Error(message);
    }
    orderReportState.report = validateOrderReportResponse(payload);
    orderReportState.status = "ready";
  } catch (error) {
    orderReportState.status = "error";
    orderReportState.error = error instanceof TypeError
      ? "Não foi possível conectar ao relatório de ordens de serviço. Tente novamente."
      : error?.message || "Não foi possível consultar o relatório de ordens de serviço. Tente novamente.";
  }
  // Uma resposta pendente nunca troca o conteúdo de outro assunto selecionado.
  if (activeReportSubject === "orders") renderSelectedReport();
}

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

// Marca visualmente e para tecnologias assistivas o assunto do relatório selecionado.
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

// Adapta os textos dos períodos ao ano efetivamente devolvido pelo servidor.
function getSelectedReportDefinition() {
  const definition = { ...reportCatalog[activeReportSubject].groups[activeReportGrouping] };
  if (activeReportSubject === "orders" && orderReportState.status === "ready") {
    const year = orderReportState.report.anoSelecionado;
    if (activeReportGrouping === "month") {
      definition.title = `Ordens de serviço por mês (${year})`;
      definition.description = `Ordens criadas em cada mês de ${year}, no horário de São Paulo.`;
    } else if (activeReportGrouping === "semester") {
      definition.title = `Ordens de serviço por semestre (${year})`;
      definition.description = `Ordens criadas em cada semestre de ${year}, no horário de São Paulo.`;
    }
  }
  return definition;
}

// As OS usam exclusivamente a resposta validada; os demais assuntos mantêm a demonstração.
function getSelectedReportValues() {
  if (activeReportSubject === "orders") {
    return orderReportState.status === "ready"
      ? orderReportState.report.groups[activeReportGrouping] : [];
  }
  const selectedGroup = reportCatalog[activeReportSubject].groups[activeReportGrouping];
  if (isTeamPeriodReport() && reportElements.teamSelect.value) {
    return selectedGroup.teamValues[reportElements.teamSelect.value] || [];
  }
  return selectedGroup.values;
}

// Renderiza os totais, as barras proporcionais e a tabela do agrupamento ativo.
function renderSelectedReport() {
  const subject = reportCatalog[activeReportSubject];
  const selectedGroup = getSelectedReportDefinition();
  const isOrders = activeReportSubject === "orders";
  const ready = !isOrders || orderReportState.status === "ready";
  const loading = isOrders && orderReportState.status === "loading";
  reportElements.teamFilter.hidden = !isTeamPeriodReport();
  reportElements.card.setAttribute("aria-busy", String(loading));
  reportElements.exportButton.disabled = !ready;
  reportElements.exportButton.setAttribute("aria-disabled", String(!ready));
  reportElements.exportButton.title = ready ? "Exportar o agrupamento exibido" : "Aguarde uma consulta concluída para exportar";
  reportElements.visualization.hidden = !ready;
  reportElements.feedback.hidden = true;
  reportElements.feedback.textContent = "";
  reportElements.feedback.setAttribute("role", "status");
  reportElements.feedback.setAttribute("aria-live", "polite");
  reportElements.dateWarning.hidden = true;
  reportElements.dateWarning.textContent = "";
  reportElements.retry.hidden = true;
  reportElements.title.textContent = selectedGroup.title;
  reportElements.description.textContent = selectedGroup.description;
  reportElements.totalLabel.textContent = selectedGroup.totalLabel || subject.label.toLocaleLowerCase();
  reportElements.groupColumn.textContent = selectedGroup.label;
  reportElements.municipality.textContent = isOrders ? "Município da sua conta" : demoReportMunicipality;
  reportElements.sourceNote.textContent = isOrders
    ? (ready ? "Dados reais das ordens de serviço do município da sua conta. Datas no horário de São Paulo."
      : loading ? "Consultando dados reais das ordens de serviço do município da sua conta."
        : "Os dados reais das ordens de serviço não estão disponíveis nesta consulta.")
    : "Dados de demonstração: os números desta visualização são fictícios.";

  if (!ready) {
    const failed = orderReportState.status === "error";
    reportElements.total.textContent = "—";
    reportElements.chart.innerHTML = "";
    reportElements.table.innerHTML = "";
    reportElements.feedback.textContent = failed ? orderReportState.error : "Carregando relatório de ordens de serviço...";
    reportElements.feedback.hidden = false;
    reportElements.feedback.setAttribute("role", failed ? "alert" : "status");
    reportElements.feedback.setAttribute("aria-live", failed ? "assertive" : "polite");
    reportElements.retry.hidden = !failed;
    return;
  }

  const values = getSelectedReportValues();
  const total = values.reduce((sum, row) => sum + row.count, 0);
  const maximum = values.reduce((max, row) => Math.max(max, row.count), 1);
  reportElements.total.textContent = total.toLocaleString("pt-BR");
  reportElements.visualization.hidden = values.length === 0;
  if (isOrders && activeReportGrouping !== "status" && orderReportState.report.ordensSemDataValida > 0) {
    const missingDates = orderReportState.report.ordensSemDataValida.toLocaleString("pt-BR");
    reportElements.dateWarning.textContent = `OS sem data de criação válida no histórico: ${missingDates}. Esses registros entram no total histórico e nos status, mas ficam fora das séries temporais.`;
    reportElements.dateWarning.hidden = false;
  }
  if (total === 0) {
    let message = "Nenhum registro para o filtro selecionado.";
    if (isOrders) {
      const report = orderReportState.report;
      message = report.totalOrdens === 0
        ? "Não há ordens de serviço cadastradas no município da sua conta."
        : activeReportGrouping === "year"
          ? "Não há ordens de serviço com data de criação válida para o agrupamento por ano."
          : `Não há ordens de serviço com data de criação válida em ${report.anoSelecionado}.`;
    }
    reportElements.feedback.textContent = message;
    reportElements.feedback.hidden = false;
  }

  // Cria as barras usando percentual relativo ao maior grupo, com rótulo acessível.
  reportElements.chart.setAttribute("aria-label", selectedGroup.title);
  reportElements.chart.innerHTML = values.map(row => {
    const barWidth = (row.count / maximum) * 100;
    return `<div class="report-bar-row">
      <span class="report-bar-label" title="${escapeReportText(row.group)}">${escapeReportText(row.group)}</span>
      <span class="report-bar-track" aria-hidden="true"><span class="report-bar-fill" style="display:block;width:${barWidth.toFixed(2)}%;min-width:0"></span></span>
      <strong class="report-bar-value">${row.count.toLocaleString("pt-BR")}</strong>
    </div>`;
  }).join("");

  // Repete valores em tabela e percentual do total para consulta detalhada.
  reportElements.table.innerHTML = values.map(row => {
    const percentage = total ? ((row.count / total) * 100).toFixed(1) : "0,0";
    return `<tr><td>${escapeReportText(row.group)}</td><td>${row.count.toLocaleString("pt-BR")}</td><td>${percentage.replace(".", ",")}%</td></tr>`;
  }).join("");
}

// Aspas protegem a estrutura do CSV; o apóstrofo mantém rótulos de fórmula como texto.
function formatReportCsvCell(value) {
  let text = String(value ?? "");
  if (typeof value === "string" && (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) {
    text = "'" + text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

// Exporta os mesmos grupos exibidos; nenhuma falha de consulta vira CSV de zeros.
function exportSelectedReport() {
  if (activeReportSubject === "orders" && orderReportState.status !== "ready") return;
  const selectedGroup = getSelectedReportDefinition();
  const values = getSelectedReportValues();
  const total = values.reduce((sum, row) => sum + row.count, 0);
  const csvRows = [[selectedGroup.label, "Quantidade", "Participação"]];

  // Usa os mesmos itens da visualização para que arquivo e tela permaneçam consistentes.
  values.forEach(row => {
    const share = total ? ((row.count / total) * 100).toFixed(1).replace(".", ",") : "0,0";
    csvRows.push([row.group, row.count, `${share}%`]);
  });

  const csv = "\uFEFF" + csvRows.map(row => row.map(formatReportCsvCell).join(";")).join("\r\n");
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  const teamSuffix = isTeamPeriodReport() && reportElements.teamSelect.value
    ? `-${reportElements.teamSelect.value}` : "";
  const yearSuffix = activeReportSubject === "orders" && ["month", "semester"].includes(activeReportGrouping)
    ? `-${orderReportState.report.anoSelecionado}` : "";
  downloadLink.download = `${activeReportSubject}-${activeReportGrouping}${yearSuffix}${teamSuffix}.csv`;
  downloadLink.click();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

// Mantém os dados de demonstração e consulta a API ao selecionar o assunto OS.
function initializeReportsPage() {
  // Esse nome é usado somente nos assuntos de demonstração.
  try {
    demoReportMunicipality = localStorage.getItem("municipio") || "Campinas - SP";
  } catch {
    // O bloqueio do armazenamento local não impede a consulta autenticada de OS.
  }
  // Preenche o filtro de equipe com IDs e nomes; futuramente estes virão do cadastro municipal.
  reportElements.teamSelect.insertAdjacentHTML("beforeend", reportTeamOptions
    .map(team => `<option value="${escapeReportText(team.id)}">${escapeReportText(team.name)}</option>`)
    .join(""));
  updateActiveSubjectTab();
  updateGroupingOptions();
  renderSelectedReport();

  // Muda agrupamentos disponíveis ao trocar de assunto e atualiza ao mudar o agrupamento.
  reportElements.subjectTabs.forEach(tab => tab.addEventListener("click", () => {
    if (!Object.prototype.hasOwnProperty.call(reportCatalog, tab.dataset.reportSubject)) return;
    activeReportSubject = tab.dataset.reportSubject;
    updateActiveSubjectTab();
    updateGroupingOptions();
    if (activeReportSubject === "orders") {
      loadOrderReport();
    } else {
      renderSelectedReport();
    }
  }));

  // Atualiza o sublinhado do agrupamento e renderiza os valores correspondentes.
  reportElements.groupingTabs.addEventListener("click", event => {
    const tab = event.target.closest("[data-report-grouping]");
    if (!tab || !Object.prototype.hasOwnProperty.call(reportCatalog[activeReportSubject].groups, tab.dataset.reportGrouping)) return;
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
  reportElements.retryButton.addEventListener("click", () => {
    if (activeReportSubject === "orders") loadOrderReport();
  });
}

// O sidebar só carrega este arquivo depois de validar login e setor.
initializeReportsPage();
