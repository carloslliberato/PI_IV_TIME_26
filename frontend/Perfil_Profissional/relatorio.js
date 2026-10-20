// Mantém descrições e agrupamentos disponíveis para cada assunto do painel.
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
        values: [{ group: "Janeiro", count: 8 }, { group: "Fevereiro", count: 6 }, { group: "Março", count: 9 }, { group: "Abril", count: 7 }, { group: "Maio", count: 10 }, { group: "Junho", count: 8 }, { group: "Julho", count: 11 }, { group: "Agosto", count: 9 }, { group: "Setembro", count: 8 }, { group: "Outubro", count: 7 }, { group: "Novembro", count: 6 }, { group: "Dezembro", count: 5 }]
      },
      semester: {
        label: "Semestre",
        title: "Ordens de serviço por semestre",
        description: "Comparação entre os dois semestres do ano atual.",
        // DADOS FICTÍCIOS. API/BD: agrupar data de abertura em 1º ou 2º semestre e contar ordens.
        values: [{ group: "1º semestre", count: 48 }, { group: "2º semestre", count: 41 }]
      },
      region: {
        label: "Região",
        title: "Ordens de serviço por região",
        description: "Distribuição das ordens de serviço entre as regiões municipais.",
        // DADOS FICTÍCIOS. API/BD: retornar região da ordem (ou região da equipe designada) e contagem.
        values: [{ group: "Região Central", count: 61 }, { group: "Região Norte", count: 54 }, { group: "Região Sul", count: 49 }, { group: "Região Leste", count: 45 }, { group: "Região Oeste", count: 38 }]
      }
    }
  }
};

// Guarda referências aos controles e áreas que serão atualizados pelo relatório ativo.
const reportElements = {
  subject: document.getElementById("reportSubject"),
  grouping: document.getElementById("reportGrouping"),
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

// Converte textos inseridos na tabela e no gráfico em conteúdo HTML seguro.
function escapeReportText(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Atualiza as opções de agrupamento conforme árvores, ocorrências ou ordens são escolhidas.
function updateGroupingOptions() {
  const subject = reportCatalog[reportElements.subject.value];
  reportElements.grouping.innerHTML = Object.entries(subject.groups)
    .map(([key, group]) => `<option value="${key}">${escapeReportText(group.label)}</option>`)
    .join("");
}

// Renderiza os totais, as barras proporcionais e a tabela do agrupamento ativo.
function renderSelectedReport() {
  const subject = reportCatalog[reportElements.subject.value];
  const selectedGroup = subject.groups[reportElements.grouping.value];
  const values = selectedGroup.values;
  const total = values.reduce((sum, row) => sum + row.count, 0);
  const maximum = Math.max(...values.map(row => row.count), 1);

  reportElements.title.textContent = selectedGroup.title;
  reportElements.description.textContent = selectedGroup.description;
  reportElements.total.textContent = total.toLocaleString("pt-BR");
  reportElements.totalLabel.textContent = subject.label.toLocaleLowerCase();
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
  const subject = reportCatalog[reportElements.subject.value];
  const selectedGroup = subject.groups[reportElements.grouping.value];
  const total = selectedGroup.values.reduce((sum, row) => sum + row.count, 0);
  const csvRows = [[selectedGroup.label, "Quantidade", "Participação"]];

  // Usa os mesmos itens da visualização para que arquivo e tela permaneçam consistentes.
  selectedGroup.values.forEach(row => {
    const share = total ? ((row.count / total) * 100).toFixed(1).replace(".", ",") : "0,0";
    csvRows.push([row.group, row.count, `${share}%`]);
  });

  const csv = "\uFEFF" + csvRows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(file);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = `${reportElements.subject.value}-${reportElements.grouping.value}.csv`;
  downloadLink.click();
  URL.revokeObjectURL(downloadUrl);
}

// Inicializa o município e eventos da tela; este texto virá do perfil autenticado via API.
function initializeReportsPage() {
  // DADOS FICTÍCIOS. API/BD: obter município e setor do usuário autenticado (ex.: GET /api/me).
  reportElements.municipality.textContent = localStorage.getItem("municipio") || "Campinas - SP";
  updateGroupingOptions();
  renderSelectedReport();

  // Muda agrupamentos disponíveis ao trocar de assunto e atualiza ao mudar o agrupamento.
  reportElements.subject.addEventListener("change", () => {
    updateGroupingOptions();
    renderSelectedReport();
  });
  reportElements.grouping.addEventListener("change", renderSelectedReport);
  reportElements.exportButton.addEventListener("click", exportSelectedReport);

  // INTEGRAÇÃO FUTURA: substituir reportCatalog pelos resultados agrupados da API municipal.
  // Campos esperados por linha: grupo (bairro/espécie/risco/status/período/região) e quantidade.
  // Sugestão: GET /api/relatorios?assunto=trees&agrupamento=neighborhood&municipioId={idSetor}.
}

// O sidebar só carrega este arquivo depois de validar login e setor.
initializeReportsPage();
