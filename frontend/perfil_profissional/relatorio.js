// Autor: Gabrielle Mota

const reportCatalog = {
  trees: {
    label: "Árvores",
    groups: {
      neighborhood: {
        label: "Bairro",
        title: "Árvores por bairro",
        description: "Distribuição das árvores cadastradas por bairro."
      },
      species: {
        label: "Espécie",
        title: "Árvores por espécie",
        description: "Espécies mais presentes no cadastro municipal."
      },
      risk: {
        label: "Risco",
        title: "Árvores por nível de risco",
        description: "Quantidade de árvores em cada nível de risco cadastrado."
      }
    }
  },
  occurrences: {
    label: "Ocorrências",
    groups: {
      status: {
        label: "Status",
        title: "Ocorrências por status",
        description: "Situação atual das ocorrências registradas no município."
      },
      neighborhood: {
        label: "Bairro",
        title: "Ocorrências por bairro",
        description: "Distribuição das ocorrências pelos bairros cadastrados."
      },
      urgency: {
        label: "Prioridade",
        title: "Ocorrências por prioridade",
        description: "Quantidade de ocorrências por classificação de prioridade."
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
        description: "Quantidade de equipes disponíveis e indisponíveis no município."
      },
      region: {
        label: "Região de atuação",
        title: "Equipes por região de atuação",
        description: "Distribuição das equipes cadastradas pelas regiões de atendimento."
      },
      workload: {
        label: "Ordens por equipe",
        title: "Ordens de serviço por equipe",
        description: "Quantidade de ordens atribuídas a cada equipe cadastrada.",
        totalLabel: "ordens de serviço"
      },
      ordersMonth: {
        label: "Ordens por mês",
        title: "Ordens das equipes por mês",
        description: "Ordens direcionadas às equipes em cada mês do ano atual.",
        totalLabel: "ordens de serviço"
      },
      ordersSemester: {
        label: "Ordens por semestre",
        title: "Ordens das equipes por semestre",
        description: "Ordens direcionadas às equipes em cada semestre do ano atual.",
        totalLabel: "ordens de serviço"
      },
      ordersYear: {
        label: "Ordens por ano",
        title: "Ordens das equipes por ano",
        description: "Histórico de ordens direcionadas às equipes em cada ano.",
        totalLabel: "ordens de serviço"
      }
    }
  }
};

const reportElements = {
  subjectTabs: document.querySelectorAll("[data-report-subject]"),
  groupingTabs: document.getElementById("reportGroupingTabs"),
  teamFilter: document.getElementById("reportTeamFilter"),
  teamSelect: document.getElementById("reportTeamSelect"),
  countSortFilter: document.getElementById("reportCountSortFilter"),
  countSort: document.getElementById("reportCountSort"),
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

const reportStates = {
  orders: { status: "idle", report: null, error: "" },
  trees: { status: "idle", report: null, error: "" },
  occurrences: { status: "idle", report: null, error: "" },
  teams: { status: "idle", report: null, error: "" }
};

let activeReportSubject = "trees";
let activeReportGrouping = "neighborhood";

const reportMonths = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro"
];

const reportSemesters = ["1º semestre", "2º semestre"];

function isReportObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function isReportCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function sumReportValues(values) {
  return values.reduce((sum, row) => sum + row.count, 0);
}

function validateReportGroups(report, key, invalid, unique = true) {
  if (!Array.isArray(report[key])) invalid();

  const names = new Set();

  return report[key].map(row => {
    if (!isReportObject(row) ||
        typeof row.grupo !== "string" ||
        !row.grupo.trim() ||
        !isReportCount(row.quantidade)) {
      invalid();
    }

    if (unique && names.has(row.grupo)) {
      invalid();
    }

    names.add(row.grupo);

    return {
      group: row.grupo,
      count: row.quantidade
    };
  });
}

function validateTemporalGroups(groups, invalid) {
  if (groups.month.length !== 12 ||
      !groups.month.every((row, index) => row.group === reportMonths[index])) {
    invalid();
  }

  if (groups.semester.length !== 2 ||
      !groups.semester.every((row, index) => row.group === reportSemesters[index])) {
    invalid();
  }

  if (!groups.year.every((row, index) =>
      /^[0-9]{1,4}$/.test(row.group) &&
      Number(row.group) >= 1 &&
      (index === 0 ||
        Number(groups.year[index - 1].group) < Number(row.group)))) {
    invalid();
  }
}

function validateOrderReportResponse(payload) {
  const invalid = () => {
    throw new Error("O servidor retornou um relatório de ordens de serviço inválido. Tente novamente.");
  };

  if (!isReportObject(payload) || !isReportObject(payload.relatorio)) {
    invalid();
  }

  const report = payload.relatorio;

  if (typeof report.municipioId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(report.municipioId) ||
      typeof report.municipioNome !== "string" ||
      !report.municipioNome.trim() ||
      !Number.isInteger(report.anoSelecionado) ||
      report.anoSelecionado < 1 ||
      report.anoSelecionado > 9999 ||
      report.fusoHorario !== "America/Sao_Paulo" ||
      !isReportCount(report.totalOrdens) ||
      !isReportCount(report.totalNoAno) ||
      !isReportCount(report.ordensSemDataValida)) {
    invalid();
  }

  const groups = {
    year: validateReportGroups(report, "porAno", invalid),
    month: validateReportGroups(report, "porMes", invalid),
    semester: validateReportGroups(report, "porSemestre", invalid),
    status: validateReportGroups(report, "porStatus", invalid)
  };

  validateTemporalGroups(groups, invalid);

  const standardStatuses = [
    "Aberta", "Em andamento", "Concluída", "Cancelada"
  ];

  if (!standardStatuses.every((status, index) =>
      groups.status[index]?.group === status)) {
    invalid();
  }

  if (sumReportValues(groups.status) !== report.totalOrdens ||
      sumReportValues(groups.year) + report.ordensSemDataValida !== report.totalOrdens ||
      sumReportValues(groups.month) !== report.totalNoAno ||
      sumReportValues(groups.semester) !== report.totalNoAno) {
    invalid();
  }

  const selectedYear = groups.year.find(
    row => Number(row.group) === report.anoSelecionado
  );

  if ((selectedYear?.count || 0) !== report.totalNoAno) {
    invalid();
  }

  if (groups.semester[0].count !== sumReportValues(groups.month.slice(0, 6)) ||
      groups.semester[1].count !== sumReportValues(groups.month.slice(6))) {
    invalid();
  }

  return { ...report, groups };
}

function validateTreeReportResponse(payload) {
  const invalid = () => {
    throw new Error("O servidor retornou um relatório de árvores inválido. Tente novamente.");
  };

  if (!isReportObject(payload) || !isReportObject(payload.relatorio)) {
    invalid();
  }

  const report = payload.relatorio;

  if (typeof report.municipioId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(report.municipioId) ||
      typeof report.municipioNome !== "string" ||
      !report.municipioNome.trim() ||
      !isReportCount(report.totalArvores)) {
    invalid();
  }

  const groups = {
    neighborhood: validateReportGroups(report, "porBairro", invalid),
    species: validateReportGroups(report, "porEspecie", invalid),
    risk: validateReportGroups(report, "porRisco", invalid)
  };

  const normalizeTreeRisk = value => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const riskClassifications = ["Crítico", "Alto", "Moderado", "Baixo"];
  const riskCounts = new Map();
  const otherRisks = [];

  groups.risk.forEach(group => {
    const normalized = normalizeTreeRisk(group.group);
    const canonicalRisk = normalized === "medio" ? "Moderado" :
      riskClassifications.find(risk => normalizeTreeRisk(risk) === normalized);

    if (canonicalRisk) {
      const key = normalizeTreeRisk(canonicalRisk);
      riskCounts.set(key, (riskCounts.get(key) || 0) + group.count);
    } else {
      otherRisks.push(group);
    }
  });

  groups.risk = [
    ...riskClassifications.map(risk => ({
      group: risk,
      count: riskCounts.get(normalizeTreeRisk(risk)) || 0
    })),
    ...otherRisks
  ];

  for (const values of Object.values(groups)) {
    if (sumReportValues(values) !== report.totalArvores) {
      invalid();
    }
  }

  return { ...report, groups };
}

function validateOccurrenceReportResponse(payload) {
  const invalid = () => {
    throw new Error("O servidor retornou um relatório de ocorrências inválido. Tente novamente.");
  };

  if (!isReportObject(payload) || !isReportObject(payload.relatorio)) {
    invalid();
  }

  const report = payload.relatorio;

  if (typeof report.municipioId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(report.municipioId) ||
      typeof report.municipioNome !== "string" ||
      !report.municipioNome.trim() ||
      !isReportCount(report.totalOcorrencias)) {
    invalid();
  }

  const groups = {
    status: validateReportGroups(report, "porStatus", invalid),
    neighborhood: validateReportGroups(report, "porBairro", invalid),
    urgency: validateReportGroups(report, "porUrgencia", invalid)
  };

  const statusNormalizado = valor => String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
  const statusesOcorrencia = [
    "Recebida",
    "Em andamento",
    "Cancelada",
    "Concluída"
  ];
  const statusCount = new Map();
  const statusExtras = [];

  groups.status.forEach(grupo => {
    const normalized = statusNormalizado(grupo.group);
    const statusCanonico = normalized === "em atendimento"
      ? "Em andamento"
      : statusesOcorrencia.find(status =>
        statusNormalizado(status) === normalized
      );

    if (statusCanonico) {
      const key = statusNormalizado(statusCanonico);
      statusCount.set(key, (statusCount.get(key) || 0) + grupo.count);
    } else {
      statusExtras.push(grupo);
    }
  });

  groups.status = [
    ...statusesOcorrencia.map(status => ({
      group: status,
      count: statusCount.get(statusNormalizado(status)) || 0
    })),
    ...statusExtras
  ];

  for (const values of Object.values(groups)) {
    if (sumReportValues(values) !== report.totalOcorrencias) {
      invalid();
    }
  }

  return { ...report, groups };
}

function validateTeamReportResponse(payload) {
  const invalid = () => {
    throw new Error("O servidor retornou um relatório de equipes inválido. Tente novamente.");
  };

  if (!isReportObject(payload) || !isReportObject(payload.relatorio)) {
    invalid();
  }

  const report = payload.relatorio;

  if (typeof report.municipioId !== "string" ||
      !/^[a-f0-9]{24}$/i.test(report.municipioId) ||
      typeof report.municipioNome !== "string" ||
      !report.municipioNome.trim() ||
      !Number.isInteger(report.anoSelecionado) ||
      report.anoSelecionado < 1 ||
      report.anoSelecionado > 9999 ||
      report.fusoHorario !== "America/Sao_Paulo" ||
      !isReportCount(report.totalEquipes) ||
      !isReportCount(report.totalOrdensAtribuidas) ||
      !isReportCount(report.totalNoAno) ||
      !isReportCount(report.ordensSemDataValida) ||
      !Array.isArray(report.equipes)) {
    invalid();
  }

  const teamIds = new Set();

  const teams = report.equipes.map(team => {
    if (!isReportObject(team) ||
        typeof team.id !== "string" ||
        !/^[a-f0-9]{24}$/i.test(team.id) ||
        typeof team.nome !== "string" ||
        !team.nome.trim() ||
        typeof team.codigo !== "string" ||
        typeof team.regiao !== "string" ||
        !["Disponível", "Indisponível"].includes(team.status) ||
        teamIds.has(team.id)) {
      invalid();
    }

    teamIds.add(team.id);

    return team;
  });

  const groups = {
    status: validateReportGroups(report, "porStatus", invalid),
    region: validateReportGroups(report, "porRegiao", invalid),
    workload: validateReportGroups(report, "porEquipe", invalid, false),
    ordersMonth: validateReportGroups(report, "porMes", invalid),
    ordersSemester: validateReportGroups(report, "porSemestre", invalid),
    ordersYear: validateReportGroups(report, "porAno", invalid)
  };

  validateTemporalGroups({
    year: groups.ordersYear,
    month: groups.ordersMonth,
    semester: groups.ordersSemester
  }, invalid);

  if (teams.length !== report.totalEquipes ||
      sumReportValues(groups.status) !== report.totalEquipes ||
      sumReportValues(groups.region) !== report.totalEquipes ||
      sumReportValues(groups.workload) !== report.totalOrdensAtribuidas ||
      sumReportValues(groups.ordersMonth) !== report.totalNoAno ||
      sumReportValues(groups.ordersSemester) !== report.totalNoAno ||
      sumReportValues(groups.ordersYear) + report.ordensSemDataValida !== report.totalOrdensAtribuidas) {
    invalid();
  }

  const available = teams.filter(team => team.status === "Disponível").length;
  const unavailable = teams.filter(team => team.status === "Indisponível").length;

  if ((groups.status.find(row => row.group === "Disponível")?.count || 0) !== available ||
      (groups.status.find(row => row.group === "Indisponível")?.count || 0) !== unavailable) {
    invalid();
  }

  if (groups.ordersSemester[0].count !==
      sumReportValues(groups.ordersMonth.slice(0, 6)) ||
      groups.ordersSemester[1].count !==
      sumReportValues(groups.ordersMonth.slice(6))) {
    invalid();
  }

  const selectedYear = groups.ordersYear.find(
    row => Number(row.group) === report.anoSelecionado
  );

  if ((selectedYear?.count || 0) !== report.totalNoAno) {
    invalid();
  }

  const teamValues = {
    ordersMonth: {},
    ordersSemester: {},
    ordersYear: {}
  };

  const mappings = [
    ["porMesPorEquipe", "ordersMonth"],
    ["porSemestrePorEquipe", "ordersSemester"],
    ["porAnoPorEquipe", "ordersYear"]
  ];

  for (const [sourceKey, targetKey] of mappings) {
    if (!isReportObject(report[sourceKey])) {
      invalid();
    }

    for (const team of teams) {
      if (!Object.prototype.hasOwnProperty.call(report[sourceKey], team.id)) {
        invalid();
      }

      const entries = report[sourceKey][team.id];

      if (!Array.isArray(entries)) {
        invalid();
      }

      const converted = entries.map(row => {
        if (!isReportObject(row) ||
            typeof row.grupo !== "string" ||
            !row.grupo.trim() ||
            !isReportCount(row.quantidade)) {
          invalid();
        }

        return {
          group: row.grupo,
          count: row.quantidade
        };
      });

      if (targetKey === "ordersMonth") {
        if (converted.length !== 12 ||
            !converted.every((row, index) =>
              row.group === reportMonths[index])) {
          invalid();
        }
      }

      if (targetKey === "ordersSemester") {
        if (converted.length !== 2 ||
            !converted.every((row, index) =>
              row.group === reportSemesters[index])) {
          invalid();
        }
      }

      if (targetKey === "ordersYear") {
        if (!converted.every((row, index) =>
            /^[0-9]{1,4}$/.test(row.group) &&
            (index === 0 ||
              Number(converted[index - 1].group) < Number(row.group)))) {
          invalid();
        }
      }

      teamValues[targetKey][team.id] = converted;
    }
  }

  const totalTeamMonths = teams.reduce(
    (sum, team) => sum + sumReportValues(teamValues.ordersMonth[team.id]),
    0
  );

  const totalTeamYears = teams.reduce(
    (sum, team) => sum + sumReportValues(teamValues.ordersYear[team.id]),
    0
  );

  if (totalTeamMonths !== report.totalNoAno ||
      totalTeamYears + report.ordensSemDataValida !== report.totalOrdensAtribuidas) {
    invalid();
  }

  return {
    ...report,
    teams,
    groups,
    teamValues
  };
}

async function requestReport(subject, endpoint, validator) {
  const state = reportStates[subject];

  if (state.status === "loading") {
    if (activeReportSubject === subject) {
      renderSelectedReport();
    }
    return;
  }

  state.status = "loading";
  state.report = null;
  state.error = "";

  if (activeReportSubject === subject) {
    renderSelectedReport();
  }

  try {
    const response = await fetch(endpoint, {
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    let payload;

    try {
      payload = await response.json();
    } catch {
      throw new Error("Não foi possível ler a resposta do relatório. Tente novamente.");
    }

    if (!response.ok) {
      const message = typeof payload?.erro === "string" && payload.erro.trim()
        ? payload.erro
        : "Não foi possível consultar o relatório. Tente novamente.";

      throw new Error(message);
    }

    state.report = validator(payload);
    state.status = "ready";

    if (subject === "teams") {
      updateTeamOptions();
    }
  } catch (error) {
    state.status = "error";
    state.error = error instanceof TypeError
      ? "Não foi possível conectar ao servidor de relatórios. Tente novamente."
      : error?.message || "Não foi possível consultar o relatório. Tente novamente.";
  }

  if (activeReportSubject === subject) {
    renderSelectedReport();
  }
}

function loadOrderReport() {
  return requestReport(
    "orders",
    "/api/relatorios/ordens-servico",
    validateOrderReportResponse
  );
}

function loadTreeReport() {
  return requestReport(
    "trees",
    "/api/relatorios/arvores",
    validateTreeReportResponse
  );
}

function loadOccurrenceReport() {
  return requestReport(
    "occurrences",
    "/api/relatorios/ocorrencias",
    validateOccurrenceReportResponse
  );
}

function loadTeamReport() {
  return requestReport(
    "teams",
    "/api/relatorios/equipes",
    validateTeamReportResponse
  );
}

function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function updateTeamOptions() {
  const previousSelection = reportElements.teamSelect.value;

  reportElements.teamSelect.innerHTML =
    '<option value="">Todas as equipes</option>';

  const state = reportStates.teams;

  if (state.status !== "ready") {
    return;
  }

  const options = state.report.teams.map(team => {
    const name = team.codigo.trim()
      ? `${team.codigo} - ${team.nome}`
      : team.nome;

    return `<option value="${escapeReportText(team.id)}">${escapeReportText(name)}</option>`;
  });

  reportElements.teamSelect.insertAdjacentHTML(
    "beforeend",
    options.join("")
  );

  if (state.report.teams.some(team => team.id === previousSelection)) {
    reportElements.teamSelect.value = previousSelection;
  }
}

function updateGroupingOptions() {
  const subject = reportCatalog[activeReportSubject];

  activeReportGrouping = Object.keys(subject.groups)[0];

  reportElements.groupingTabs.innerHTML =
    Object.entries(subject.groups)
      .map(([key, group], index) => {
        const active = index === 0;

        return `<button
          class="report-tab${active ? " is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${active}"
          data-report-grouping="${key}"
        >${escapeReportText(group.label)}</button>`;
      })
      .join("");
}

function updateActiveSubjectTab() {
  reportElements.subjectTabs.forEach(tab => {
    const active = tab.dataset.reportSubject === activeReportSubject;

    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function isTeamPeriodReport() {
  return activeReportSubject === "teams" &&
    ["ordersMonth", "ordersSemester", "ordersYear"]
      .includes(activeReportGrouping);
}

function getSelectedReportDefinition() {
  const definition = {
    ...reportCatalog[activeReportSubject].groups[activeReportGrouping]
  };

  if (activeReportSubject === "orders" &&
      reportStates.orders.status === "ready") {
    const year = reportStates.orders.report.anoSelecionado;

    if (activeReportGrouping === "month") {
      definition.title = `Ordens de serviço por mês (${year})`;
      definition.description =
        `Ordens criadas em cada mês de ${year}, no horário de São Paulo.`;
    }

    if (activeReportGrouping === "semester") {
      definition.title = `Ordens de serviço por semestre (${year})`;
      definition.description =
        `Ordens criadas em cada semestre de ${year}, no horário de São Paulo.`;
    }
  }

  if (activeReportSubject === "teams" &&
      reportStates.teams.status === "ready") {
    const report = reportStates.teams.report;
    const year = report.anoSelecionado;

    if (activeReportGrouping === "ordersMonth") {
      definition.title = `Ordens das equipes por mês (${year})`;
      definition.description =
        `Ordens atribuídas às equipes em cada mês de ${year}.`;
    }

    if (activeReportGrouping === "ordersSemester") {
      definition.title = `Ordens das equipes por semestre (${year})`;
      definition.description =
        `Ordens atribuídas às equipes em cada semestre de ${year}.`;
    }

    if (isTeamPeriodReport() && reportElements.teamSelect.value) {
      const selectedTeam = report.teams.find(
        team => team.id === reportElements.teamSelect.value
      );

      if (selectedTeam) {
        definition.description +=
          ` Equipe selecionada: ${selectedTeam.nome}.`;
      }
    }
  }

  return definition;
}

function getSelectedReportValues() {
  const state = reportStates[activeReportSubject];

  if (state.status !== "ready") {
    return [];
  }

  let values;

  if (activeReportSubject === "teams" &&
      isTeamPeriodReport() &&
      reportElements.teamSelect.value) {
    values = state.report.teamValues[activeReportGrouping]
      [reportElements.teamSelect.value] || [];
  } else {
    values = state.report.groups[activeReportGrouping] || [];
  }

  if (activeReportSubject === "occurrences" &&
      activeReportGrouping === "urgency") {
    const priorityOrder = new Map([
      ["critica", 0],
      ["alta", 1],
      ["media", 2],
      ["baixa", 3]
    ]);
    const normalizePriority = value => String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");

    return [...values].sort((a, b) =>
      (priorityOrder.get(normalizePriority(a.group)) ?? Number.MAX_SAFE_INTEGER) -
      (priorityOrder.get(normalizePriority(b.group)) ?? Number.MAX_SAFE_INTEGER)
    );
  }

  const supportsCountSort =
    (activeReportSubject === "trees" &&
      ["neighborhood", "species"].includes(activeReportGrouping)) ||
    (activeReportSubject === "occurrences" &&
      activeReportGrouping === "neighborhood");

  if (supportsCountSort) {
    const compareNames = (a, b) =>
      String(a.group).localeCompare(String(b.group), "pt-BR", { sensitivity: "base" });

    return [...values].sort(reportElements.countSort.value === "count"
      ? (a, b) => b.count - a.count || compareNames(a, b)
      : compareNames
    );
  }

  return values;
}

function getReportSourceNote() {
  const state = reportStates[activeReportSubject];

  if (state.status === "loading" || state.status === "idle") {
    return "Consultando dados reais do município vinculado à sua conta.";
  }

  if (state.status === "error") {
    return "Os dados reais deste relatório não estão disponíveis nesta consulta.";
  }

  if (activeReportSubject === "trees") {
    return "Dados reais das árvores não arquivadas do município da sua conta.";
  }

  if (activeReportSubject === "occurrences") {
    return "Dados reais das ocorrências do município da sua conta.";
  }

  if (activeReportSubject === "orders") {
    return "Dados reais das ordens de serviço do município da sua conta. Datas no horário de São Paulo.";
  }

  return "Dados reais das equipes do município da sua conta. Disponibilidade calculada pelas ordens de serviço abertas ou em andamento.";
}

function getReportEmptyMessage() {
  const state = reportStates[activeReportSubject];
  const report = state.report;

  if (activeReportSubject === "trees") {
    return "Não há árvores não arquivadas cadastradas no município da sua conta.";
  }

  if (activeReportSubject === "occurrences") {
    return "Não há ocorrências cadastradas no município da sua conta.";
  }

  if (activeReportSubject === "orders") {
    if (report.totalOrdens === 0) {
      return "Não há ordens de serviço cadastradas no município da sua conta.";
    }

    if (activeReportGrouping === "year") {
      return "Não há ordens de serviço com data de criação válida para o agrupamento por ano.";
    }

    if (["month", "semester"].includes(activeReportGrouping)) {
      return `Não há ordens de serviço com data de criação válida em ${report.anoSelecionado}.`;
    }
  }

  if (activeReportSubject === "teams") {
    if (report.totalEquipes === 0) {
      return "Não há equipes cadastradas no município da sua conta.";
    }

    if (activeReportGrouping === "workload") {
      return "Nenhuma ordem de serviço está atribuída às equipes deste município.";
    }

    if (isTeamPeriodReport()) {
      return "Não há ordens de serviço atribuídas para o período ou equipe selecionada.";
    }
  }

  return "Nenhum registro para o filtro selecionado.";
}

function renderSelectedReport() {
  const subject = reportCatalog[activeReportSubject];
  const state = reportStates[activeReportSubject];
  const selectedGroup = getSelectedReportDefinition();

  const ready = state.status === "ready";
  const loading = state.status === "loading";
  const failed = state.status === "error";

  reportElements.teamFilter.hidden = !isTeamPeriodReport();
  reportElements.countSortFilter.hidden = !(
    (activeReportSubject === "trees" &&
      ["neighborhood", "species"].includes(activeReportGrouping)) ||
    (activeReportSubject === "occurrences" &&
      activeReportGrouping === "neighborhood")
  );

  reportElements.card.setAttribute("aria-busy", String(loading));

  reportElements.exportButton.disabled = !ready;
  reportElements.exportButton.setAttribute(
    "aria-disabled",
    String(!ready)
  );

  reportElements.exportButton.title = ready
    ? "Exportar o agrupamento exibido"
    : "Aguarde uma consulta concluída para exportar";

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
  reportElements.totalLabel.textContent =
    selectedGroup.totalLabel || subject.label.toLocaleLowerCase();

  reportElements.groupColumn.textContent = selectedGroup.label;

  reportElements.municipality.textContent = ready
    ? `${state.report.municipioNome} - SP`
    : "Município da sua conta";

  reportElements.sourceNote.textContent = getReportSourceNote();

  if (!ready) {
    reportElements.total.textContent = "—";
    reportElements.chart.innerHTML = "";
    reportElements.table.innerHTML = "";

    const loadingMessages = {
      trees: "Carregando relatório de árvores...",
      occurrences: "Carregando relatório de ocorrências...",
      orders: "Carregando relatório de ordens de serviço...",
      teams: "Carregando relatório de equipes..."
    };

    reportElements.feedback.textContent = failed
      ? state.error
      : loadingMessages[activeReportSubject];

    reportElements.feedback.hidden = false;

    reportElements.feedback.setAttribute(
      "role",
      failed ? "alert" : "status"
    );

    reportElements.feedback.setAttribute(
      "aria-live",
      failed ? "assertive" : "polite"
    );

    reportElements.retry.hidden = !failed;

    return;
  }

  const values = getSelectedReportValues();
  const total = sumReportValues(values);

  const maximum = values.reduce(
    (max, row) => Math.max(max, row.count),
    1
  );

  reportElements.total.textContent = total.toLocaleString("pt-BR");

  reportElements.visualization.hidden = values.length === 0;

  if (activeReportSubject === "orders" &&
      activeReportGrouping !== "status" &&
      state.report.ordensSemDataValida > 0) {
    const missingDates =
      state.report.ordensSemDataValida.toLocaleString("pt-BR");

    reportElements.dateWarning.textContent =
      `OS sem data de criação válida no histórico: ${missingDates}. Esses registros entram no total histórico e nos status, mas ficam fora das séries temporais.`;

    reportElements.dateWarning.hidden = false;
  }

  if (activeReportSubject === "teams" &&
      isTeamPeriodReport() &&
      state.report.ordensSemDataValida > 0) {
    const missingDates =
      state.report.ordensSemDataValida.toLocaleString("pt-BR");

    reportElements.dateWarning.textContent =
      `OS atribuídas sem data de criação válida: ${missingDates}. Esses registros entram no total histórico, mas ficam fora dos agrupamentos por período.`;

    reportElements.dateWarning.hidden = false;
  }

  if (total === 0) {
    reportElements.feedback.textContent = getReportEmptyMessage();
    reportElements.feedback.hidden = false;
  }

  reportElements.chart.setAttribute(
    "aria-label",
    selectedGroup.title
  );

  reportElements.chart.innerHTML = values.map(row => {
    const barWidth = (row.count / maximum) * 100;

    return `<div class="report-bar-row">
      <span class="report-bar-label" title="${escapeReportText(row.group)}">${escapeReportText(row.group)}</span>
      <span class="report-bar-track" aria-hidden="true">
        <span class="report-bar-fill" style="display:block;width:${barWidth.toFixed(2)}%;min-width:0"></span>
      </span>
      <strong class="report-bar-value">${row.count.toLocaleString("pt-BR")}</strong>
    </div>`;
  }).join("");

  reportElements.table.innerHTML = values.map(row => {
    const percentage = total
      ? ((row.count / total) * 100).toFixed(1)
      : "0,0";

    return `<tr>
      <td>${escapeReportText(row.group)}</td>
      <td>${row.count.toLocaleString("pt-BR")}</td>
      <td>${percentage.replace(".", ",")}%</td>
    </tr>`;
  }).join("");
}

function formatReportCsvCell(value) {
  let text = String(value ?? "");

  if (typeof value === "string" &&
      (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) ||
        /^[\t\r\n]/.test(text))) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function exportSelectedReport() {
  const state = reportStates[activeReportSubject];

  if (state.status !== "ready") {
    return;
  }

  const selectedGroup = getSelectedReportDefinition();
  const values = getSelectedReportValues();
  const total = sumReportValues(values);

  const csvRows = [
    [selectedGroup.label, "Quantidade", "Participação"]
  ];

  values.forEach(row => {
    const share = total
      ? ((row.count / total) * 100).toFixed(1).replace(".", ",")
      : "0,0";

    csvRows.push([
      row.group,
      row.count,
      `${share}%`
    ]);
  });

  const csv = "\uFEFF" +
    csvRows.map(row =>
      row.map(formatReportCsvCell).join(";")
    ).join("\r\n");

  const file = new Blob(
    [csv],
    { type: "text/csv;charset=utf-8" }
  );

  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");

  downloadLink.href = downloadUrl;

  const teamSuffix =
    isTeamPeriodReport() && reportElements.teamSelect.value
      ? `-${reportElements.teamSelect.value}`
      : "";

  const yearSuffix =
    activeReportSubject === "orders" &&
    ["month", "semester"].includes(activeReportGrouping)
      ? `-${reportStates.orders.report.anoSelecionado}`
      : activeReportSubject === "teams" &&
        ["ordersMonth", "ordersSemester"].includes(activeReportGrouping)
        ? `-${reportStates.teams.report.anoSelecionado}`
        : "";

  downloadLink.download =
    `${activeReportSubject}-${activeReportGrouping}${yearSuffix}${teamSuffix}.csv`;

  downloadLink.click();

  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

function loadSelectedReport() {
  if (activeReportSubject === "trees") {
    return loadTreeReport();
  }

  if (activeReportSubject === "occurrences") {
    return loadOccurrenceReport();
  }

  if (activeReportSubject === "orders") {
    return loadOrderReport();
  }

  if (activeReportSubject === "teams") {
    return loadTeamReport();
  }
}

function initializeReportsPage() {
  updateTeamOptions();
  updateActiveSubjectTab();
  updateGroupingOptions();
  renderSelectedReport();

  loadTreeReport();

  reportElements.subjectTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const subject = tab.dataset.reportSubject;

      if (!Object.prototype.hasOwnProperty.call(reportCatalog, subject)) {
        return;
      }

      activeReportSubject = subject;

      updateActiveSubjectTab();
      updateGroupingOptions();
      loadSelectedReport();
    });
  });

  reportElements.groupingTabs.addEventListener("click", event => {
    const tab = event.target.closest("[data-report-grouping]");

    if (!tab) {
      return;
    }

    const grouping = tab.dataset.reportGrouping;
    const availableGroups = reportCatalog[activeReportSubject].groups;

    if (!Object.prototype.hasOwnProperty.call(availableGroups, grouping)) {
      return;
    }

    activeReportGrouping = grouping;

    reportElements.groupingTabs
      .querySelectorAll("[data-report-grouping]")
      .forEach(groupTab => {
        const active = groupTab === tab;

        groupTab.classList.toggle("is-active", active);
        groupTab.setAttribute("aria-selected", String(active));
      });

    renderSelectedReport();
  });

  reportElements.teamSelect.addEventListener(
    "change",
    renderSelectedReport
  );

  reportElements.countSort.addEventListener(
    "change",
    renderSelectedReport
  );

  reportElements.exportButton.addEventListener(
    "click",
    exportSelectedReport
  );

  reportElements.retryButton.addEventListener(
    "click",
    loadSelectedReport
  );
}

initializeReportsPage();
