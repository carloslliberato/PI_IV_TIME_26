// Autor: Gabrielle Mota, Sophia Fernandes

// Página de consulta de ocorrências do portal público Arboriza conectada ao back-end.

// Guarda na memória as ocorrências que vieram do banco de dados (MongoDB)
let listaOcorrencias = [];

// Inicializa a página assim que o HTML terminar de carregar
function initializeCitizenOccurrences() {
  // Pega os elementos dos 4 filtros, do corpo da tabela e dos avisos da tela
  const municipalityFilter = document.getElementById("filterMunicipality");
  const typeFilter = document.getElementById("filterType");
  const statusFilter = document.getElementById("filterStatus");
  const priorityFilter = document.getElementById("filterPriority");
  const tableBody = document.getElementById("occurrencesTableBody");
  const resultsCount = document.getElementById("resultsCount");
  const emptyState = document.getElementById("emptyState");
  let requisicaoOcorrenciasAtual = 0;

  // Se algum elemento essencial não existir na tela, interrompe a função
  if (!municipalityFilter || !typeFilter || !statusFilter || !priorityFilter || !tableBody) return;

  // Marca o botão de "Ocorrências" no menu lateral (sidebar) como ativo
  const occurrencesNavLink = document.getElementById("navOccurrences");
  if (occurrencesNavLink) {
    occurrencesNavLink.href = "/ocorrencias-cidadao";
    occurrencesNavLink.classList.add("active");
    occurrencesNavLink.setAttribute("aria-current", "page");
  }

  // Padroniza textos para comparação nos filtros (remove acentos, hífens e deixa minúsculo)
  function normalizarTexto(texto) {
    return String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/-/g, " ")
      .trim()
      .toLowerCase();
  }

  // Transforma valores como "galho-quebrado" em "Galho quebrado" para exibir bonito na tabela
  function formatarTipoOcorrencia(tipo) {
    if (!tipo || tipo === "-") return "-";
    const textoLimpo = tipo.replace(/-/g, " ").trim();
    return textoLimpo.charAt(0).toUpperCase() + textoLimpo.slice(1);
  }

  // Escolhe a cor da etiqueta (badge) de acordo com o status da ocorrência
  function statusClass(status) {
    const st = normalizarTexto(status);
    if (st === "aberta" || st === "recebida") return "status-aberta";
    if (st === "concluida") return "status-concluida";
    return "status-andamento";
  }

  // Escolhe a cor da etiqueta (badge) de acordo com a prioridade/urgência
  function priorityClass(priority) {
    const pr = normalizarTexto(priority);
    if (pr === "alta" || pr === "critica") return "priority-alta";
    if (pr === "media") return "priority-media";
    if (pr === "baixa") return "priority-baixa";
    return "priority-indefinida";
  }

  // Formata o nome do município (ex: transforma "campinas" em "Campinas")
  function formatarMunicipio(mun) {
    if (!mun) return "Campinas";
    const nomesPorId = {
      "6ae666a7680e8a4330a1ab66": "Campinas",
      "6ae7854cb9962492d01e6af6": "Hortolândia",
      "6ae7856ab9962492d01e6af7": "Sumaré",
      "6b0382ed251d742536f8cd10": "Valinhos",
      "6b0382ed251d742536f8cd11": "Vinhedo"
    };
    if (nomesPorId[mun]) return nomesPorId[mun];
    return mun.charAt(0).toUpperCase() + mun.slice(1);
  }

  // Filtra as ocorrências carregadas e desenha as linhas na tabela
  function updateOccurrencesTable() {
    const filteredOccurrences = listaOcorrencias.filter(occurrence => {
      return (!municipalityFilter.value || normalizarTexto(occurrence.municipio) === normalizarTexto(municipalityFilter.value))
        && (!typeFilter.value || normalizarTexto(occurrence.tipo) === normalizarTexto(typeFilter.value))
        && (!statusFilter.value || normalizarTexto(occurrence.status) === normalizarTexto(statusFilter.value))
        && (!priorityFilter.value || normalizarTexto(occurrence.prioridade) === normalizarTexto(priorityFilter.value));
    });

    // Limpa a tabela antes de desenhar as linhas filtradas
    tableBody.replaceChildren();

    // Cria uma linha (tr) e as colunas (td) para cada ocorrência encontrada
    filteredOccurrences.forEach(occurrence => {
      const row = document.createElement("tr");
      const values = [
        { text: occurrence.codigoIdentificador, className: "occurrence-id" },
        { text: occurrence.municipio },
        { text: occurrence.bairro },
        { text: occurrence.tipo },
        { text: occurrence.status, className: `occurrence-badge ${statusClass(occurrence.status)}` },
        { text: occurrence.prioridade, className: `occurrence-badge ${priorityClass(occurrence.prioridade)}` }
      ];

      values.forEach((value, index) => {
        const cell = document.createElement("td");
        // Nas colunas 4 (status) e 5 (prioridade), cria o span colorido
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

    // Atualiza o contador de resultados (ex: "1 ocorrência encontrada")
    if (resultsCount) {
      resultsCount.textContent = `${filteredOccurrences.length} ${filteredOccurrences.length === 1 ? "ocorrência encontrada" : "ocorrências encontradas"}`;
    }

    // Mostra ou esconde a mensagem de lista vazia
    if (emptyState) {
      emptyState.classList.toggle("d-none", filteredOccurrences.length > 0);
    }
  }

  // Busca as ocorrências reais no back-end (Javalin + MongoDB) via GET /api/ocorrencias
  async function carregarOcorrenciasDaApi() {
    const requisicao = ++requisicaoOcorrenciasAtual;
    const status = statusFilter.value;
    const url = status
      ? `/api/ocorrencias?status=${encodeURIComponent(status)}`
      : "/api/ocorrencias";

    try {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error("Erro ao buscar ocorrências do servidor");

      const dadosBanco = await resposta.json();
      if (requisicao !== requisicaoOcorrenciasAtual) return;

      // Converte os nomes dos campos do MongoDB para o formato usado pela tabela
      listaOcorrencias = dadosBanco.map(doc => ({
        codigoIdentificador: doc.codigoIdentificador || doc.id
          || (typeof doc._id === "string" && doc._id.startsWith("OC-") ? doc._id : "-"),
        municipio: doc.municipio || formatarMunicipio(doc.municipioId),
        bairro: doc.bairro || extrairBairro(doc.localizacao),
        tipo: formatarTipoOcorrencia(doc.tipo || doc.tipoProblema),
        status: doc.status || "Recebida",
        prioridade: doc.prioridade || doc.urgencia || "-"
      }));

      // Atualiza a tabela na tela com os dados recebidos
      updateOccurrencesTable();
    } catch (erro) {
      if (requisicao !== requisicaoOcorrenciasAtual) return;
      console.error("Erro ao carregar ocorrências:", erro);
      listaOcorrencias = [];
      updateOccurrencesTable();
    }
  }

  // Caso a ocorrência antiga no banco não tenha o campo bairro separado, extrai do endereço
  function extrairBairro(localizacao) {
    if (localizacao && localizacao.includes("-")) {
      const partes = localizacao.split("-");
      return partes[partes.length - 1].trim();
    }
    return "Centro";
  }

  // Faz a tabela atualizar sempre que o usuário mudar qualquer um dos 4 filtros
  [municipalityFilter, typeFilter, priorityFilter].forEach(filter => {
    filter.addEventListener("change", updateOccurrencesTable);
  });
  statusFilter.addEventListener("change", carregarOcorrenciasDaApi);

  // Chama a API assim que a tela abre
  carregarOcorrenciasDaApi();
}

// Garante que a função rode tanto se a página ainda estiver carregando quanto se já tiver carregado
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCitizenOccurrences, { once: true });
} else {
  initializeCitizenOccurrences();
}
