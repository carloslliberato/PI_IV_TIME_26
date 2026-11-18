// Feito por Sophia, Gabrielle
// Mapa profissional: exibe as árvores cadastradas e as ocorrências reais vindas do back-end (Javalin + MongoDB).

// Guarda a configuração inicial do município e as listas carregadas da API
const professionalMapDemo = {
  municipality: {
    id: "campinas-demo",
    nome: "Campinas - SP",
    latitude: -22.9056,
    longitude: -47.0608,
    zoom: 13
  },
  // As árvores e ocorrências são preenchidas automaticamente pelas chamadas ao back-end
  trees: [],
  occurrences: [],
  // Camada de ordens de serviço mantida para o módulo responsável
  serviceOrders: [
    { id: "OS-2026-041", latitude: -22.9104, longitude: -47.0525, titulo: "Poda preventiva", descricao: "Poda de galhos próximos à rede elétrica.", bairro: "Cambuí", status: "Em andamento" }
  ]
};

// ID do município de Campinas usado na coleção de árvores
const MUNICIPIO_ID_MAPA = "6ae666a7680e8a4330a1ab66";

// Variáveis globais que controlam o mapa Leaflet, suas camadas e os marcadores
let professionalMap;
let treeMarkerLayer;
let occurrenceMarkerLayer;
let serviceOrderMarkerLayer;
let professionalMarkersById = new Map();
let professionalOccurrenceMarkersById = new Map();
let professionalServiceOrderMarkersById = new Map();
let activeMapDataLayer = "trees";

// Converte o código de risco do banco de árvores para texto legível
function converterRisco(risco) {
  const riscos = {
    BAIXO: "Baixo",
    MODERADO: "Moderado",
    ALTO: "Alto",
    CRITICO: "Crítico"
  };

  return riscos[risco] || "Não informado";
}

// Busca as árvores reais cadastradas no MongoDB via GET /api/arvores
async function carregarArvores() {
  const resposta = await fetch("/api/arvores", { credentials: "same-origin" });
  if (!resposta.ok) throw new Error(`A consulta de árvores falhou (HTTP ${resposta.status}).`);
  const dados = await resposta.json();
  if (!Array.isArray(dados)) throw new Error("Resposta inesperada da API de árvores.");

  professionalMapDemo.trees = dados
    .filter(arvore => arvore.municipioId === MUNICIPIO_ID_MAPA)
    .filter(arvore => arvore.ativa !== false)
    .filter(arvore => Number.isFinite(arvore.latitude) &&
      Number.isFinite(arvore.longitude) &&
      Math.abs(arvore.latitude) <= 90 && Math.abs(arvore.longitude) <= 180)
    .map(arvore => ({
      id: String(arvore.id),
      nome: arvore.nomePopular || arvore.especie || "Árvore sem nome",
      especie: arvore.nomeCientifico || arvore.especie || "Não informado",
      bairro: arvore.bairro || "Não informado",
      endereco: arvore.endereco || "Não informado",
      lat: arvore.latitude,
      lng: arvore.longitude,
      risco: converterRisco(arvore.risco)
    }));
}

// Caso uma ocorrência antiga no banco não tenha latitude/longitude, calcula um ponto pelo bairro em Campinas
function obterCoordenadasFallbackPorBairro(bairro) {
  const b = String(bairro || "").toLowerCase();
  if (b.includes("taquaral")) return { lat: -22.8754, lng: -47.0475 };
  if (b.includes("cambu")) return { lat: -22.8942, lng: -47.0531 };
  if (b.includes("chapad")) return { lat: -22.8895, lng: -47.0742 };
  if (b.includes("barao") || b.includes("barão")) return { lat: -22.8228, lng: -47.0805 };
  return { lat: -22.9056, lng: -47.0608 };
}

// Busca as ocorrências reais cadastradas no MongoDB via GET /api/ocorrencias
async function carregarOcorrencias() {
  try {
    const resposta = await fetch("/api/ocorrencias", { credentials: "same-origin" });
    if (!resposta.ok) throw new Error(`A consulta de ocorrências falhou (HTTP ${resposta.status}).`);

    const dados = await resposta.json();
    if (!Array.isArray(dados)) return;

    professionalMapDemo.occurrences = dados.map(oco => {
      const bairro = oco.bairro || "Centro";
      const fallback = obterCoordenadasFallbackPorBairro(bairro);
      const temCoordenadas = Number.isFinite(oco.latitude) && Number.isFinite(oco.longitude);

      return {
        id: String(oco.protocolo || oco.id || oco._id),
        latitude: temCoordenadas ? oco.latitude : fallback.lat,
        longitude: temCoordenadas ? oco.longitude : fallback.lng,
        tipo: oco.tipoProblema || "Ocorrência arbórea",
        descricao: oco.descricao || oco.tipoProblema || "Sem descrição informada.",
        bairro: bairro,
        endereco: oco.localizacao || "Endereço não informado",
        status: oco.status || "Recebida",
        risco: oco.urgencia || "Média"
      };
    });
  } catch (erro) {
    console.error("Falha ao carregar ocorrências do mapa:", erro);
    professionalMapDemo.occurrences = [];
  }
}

// Inicializa o mapa Leaflet e carrega tanto as árvores quanto as ocorrências reais do banco
async function initializeProfessionalMap() {
  document.getElementById("mapScopeName").textContent = professionalMapDemo.municipality.nome;
  updateProfessionalMapListHeading();
  if (!initializeLeafletMap()) return;
  setupProfessionalMapEvents();
  renderProfessionalActiveList();

  // Carrega ocorrências reais em paralelo com as árvores
  await carregarOcorrencias();

  try {
    await carregarArvores();
    renderProfessionalActiveList();
    updateProfessionalMapToast(professionalMapDemo.trees.length
      ? `${professionalMapDemo.trees.length} árvores e ${professionalMapDemo.occurrences.length} ocorrência(s) carregadas.`
      : "Nenhuma árvore ativa com coordenadas válidas para este município.");
  } catch (erro) {
    console.error("Falha ao carregar árvores do mapa:", erro);
    professionalMapDemo.trees = [];
    renderProfessionalActiveList();
    updateProfessionalMapToast("Não foi possível consultar as árvores. Verifique o backend.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeProfessionalMap, { once: true });
} else {
  initializeProfessionalMap();
}

// Monta o mapa Leaflet e configura as camadas de Árvores, Ocorrências e Ordens de Serviço
function initializeLeafletMap() {
  const mapElement = document.getElementById("professionalMap");

  if (typeof L === "undefined") {
    mapElement.innerHTML = `
      <div class="professional-map-unavailable">
        <i class="bi bi-map" aria-hidden="true"></i>
        <strong>Mapa indisponível</strong>
        <span>Não foi possível carregar o mapa. Verifique a conexão e recarregue a página.</span>
      </div>
    `;
    return false;
  }

  const municipality = professionalMapDemo.municipality;
  professionalMap = L.map("professionalMap", { zoomControl: false })
    .setView([municipality.latitude, municipality.longitude], municipality.zoom);

  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles © Esri — Sources: Esri, OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(professionalMap);

  L.control.zoom({ position: "topleft" }).addTo(professionalMap);
  treeMarkerLayer = L.layerGroup().addTo(professionalMap);
  occurrenceMarkerLayer = L.layerGroup();
  serviceOrderMarkerLayer = L.layerGroup();
  renderProfessionalTreeMarkers(professionalMapDemo.trees);
  return true;
}

// Converte o nível de risco em classe CSS para colorir os pinos do mapa
function professionalRiskClass(risk) {
  const riskClasses = {
    "Baixo": "low",
    "Médio": "medium",
    "Moderado": "medium",
    "Alto": "high",
    "Crítico": "critical"
  };
  return riskClasses[risk] || "unknown";
}

// Protege os textos exibidos nos pop-ups contra caracteres HTML inválidos
function escapeProfessionalMapText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Cria o ícone circular colorido para cada árvore no mapa
function createProfessionalTreeIcon(risk) {
  return L.divIcon({
    className: "",
    html: `<div class="professional-tree-pin ${professionalRiskClass(risk)}"><i class="bi bi-tree-fill" aria-hidden="true"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -15]
  });
}

// Desenha os marcadores das árvores no mapa e liga o botão "Ver detalhes" do pop-up
function renderProfessionalTreeMarkers(treeRecords) {
  treeMarkerLayer.clearLayers();
  professionalMarkersById.clear();

  treeRecords.forEach(tree => {
    const marker = L.marker([tree.lat, tree.lng], {
      icon: createProfessionalTreeIcon(tree.risco)
    });
    marker.bindPopup(`
      <div class="professional-tree-popup">
        <div class="professional-tree-popup-id">ID: ${escapeProfessionalMapText(tree.id)}</div>
        <div class="professional-tree-popup-name">${escapeProfessionalMapText(tree.nome)}</div>
        <div class="professional-tree-popup-species">${escapeProfessionalMapText(tree.especie)}</div>
        <div class="professional-tree-popup-address">
          ${escapeProfessionalMapText(tree.endereco)}<br>
          ${escapeProfessionalMapText(tree.bairro)} · ${escapeProfessionalMapText(professionalMapDemo.municipality.nome)}
        </div>
        <div class="professional-tree-popup-risk ${professionalRiskClass(tree.risco)}">Risco ${escapeProfessionalMapText(tree.risco)}</div>
        <button class="professional-tree-popup-link" type="button" data-professional-tree-details="${escapeProfessionalMapText(tree.id)}">Ver detalhes <span aria-hidden="true">→</span></button>
      </div>
    `);

    marker.on("popupopen", event => {
      const detailsButton = event.popup.getElement().querySelector("[data-professional-tree-details]");
      detailsButton?.addEventListener("click", () => openProfessionalTreeDetails(tree));
    });

    marker.addTo(treeMarkerLayer);
    professionalMarkersById.set(tree.id, marker);
  });
}

// Desenha os cartões de árvores na lista lateral direita
function renderProfessionalTreeList(treeRecords) {
  const listElement = document.getElementById("professionalTreeList");

  if (!treeRecords.length) {
    listElement.innerHTML = '<div class="professional-tree-empty">Não há árvores que correspondam à busca neste município.</div>';
    return;
  }

  listElement.innerHTML = treeRecords.map(tree => `
    <article class="professional-tree-card" data-professional-tree="${escapeProfessionalMapText(tree.id)}" tabindex="0" role="button" aria-label="Centralizar mapa na árvore ${escapeProfessionalMapText(tree.nome)}">
      <span class="professional-tree-card-icon"><i class="bi bi-tree-fill" aria-hidden="true"></i></span>
      <div class="professional-tree-card-copy">
        <div class="professional-tree-card-title-row">
          <h3>${escapeProfessionalMapText(tree.nome)}</h3>
          <span class="professional-risk-badge ${professionalRiskClass(tree.risco)}">${escapeProfessionalMapText(tree.risco)}</span>
        </div>
        <div class="professional-tree-card-species">${escapeProfessionalMapText(tree.especie)}</div>
        <div class="professional-tree-card-address">ID ${escapeProfessionalMapText(tree.id)} · ${escapeProfessionalMapText(tree.bairro)}</div>
      </div>
    </article>
  `).join("");

  listElement.querySelectorAll("[data-professional-tree]").forEach(card => {
    const focusTree = () => focusProfessionalTree(card.dataset.professionalTree);
    card.addEventListener("click", focusTree);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusTree();
      }
    });
  });
}

// Atualiza os títulos e placeholders da barra lateral conforme a camada selecionada (Árvores, Ocorrências ou Ordens)
function updateProfessionalMapListHeading() {
  const labels = {
    trees: { title: "Árvores cadastradas", search: "Buscar árvore", placeholder: "Nome, espécie, bairro ou ID...", all: "Ver todas" },
    occurrences: { title: "Ocorrências", search: "Buscar ocorrência", placeholder: "Descrição, bairro ou ID...", all: "Ver todas" },
    serviceOrders: { title: "Ordens de serviço", search: "Buscar ordem de serviço", placeholder: "Serviço, bairro ou ID...", all: "Ver todas" }
  };
  const selected = labels[activeMapDataLayer];
  document.getElementById("mapListTitle").textContent = selected.title;
  document.getElementById("mapListSearchLabel").textContent = selected.search;
  document.getElementById("treeSearch").placeholder = selected.placeholder;
  document.getElementById("showAllTrees").textContent = selected.all;
}

// Filtra e desenha a lista lateral direita de acordo com a camada ativa e o texto digitado na busca
function renderProfessionalActiveList() {
  updateProfessionalMapListHeading();
  const query = document.getElementById("treeSearch").value.trim().toLocaleLowerCase("pt-BR");

  if (activeMapDataLayer === "trees") {
    const matches = professionalMapDemo.trees.filter(tree =>
      [tree.nome, tree.especie, tree.id, tree.bairro, tree.endereco]
        .some(value => value.toLocaleLowerCase("pt-BR").includes(query))
    );
    renderProfessionalTreeList(matches);
    renderProfessionalTreeMarkers(matches);
    return;
  }

  const records = activeMapDataLayer === "occurrences" ? professionalMapDemo.occurrences : professionalMapDemo.serviceOrders;
  const matches = records.filter(record =>
    [record.id, record.tipo, record.descricao, record.titulo, record.bairro, record.status]
      .some(value => String(value ?? "").toLocaleLowerCase("pt-BR").includes(query))
  );

  const isOccurrence = activeMapDataLayer === "occurrences";
  const icon = isOccurrence ? "bi-exclamation-triangle-fill" : "bi-clipboard2-check-fill";
  const emptyText = isOccurrence ? "Não há ocorrências que correspondam à busca." : "Não há ordens de serviço que correspondam à busca.";
  const listElement = document.getElementById("professionalTreeList");

  if (!matches.length) {
    listElement.innerHTML = `<div class="professional-tree-empty">${emptyText}</div>`;
    return;
  }

  listElement.innerHTML = matches.map(record => `
    <article class="professional-tree-card" data-map-record-type="${isOccurrence ? "occurrences" : "serviceOrders"}" data-map-record-id="${escapeProfessionalMapText(record.id)}" tabindex="0" role="button" aria-label="Centralizar mapa em ${escapeProfessionalMapText(record.id)}">
      <span class="professional-tree-card-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
      <div class="professional-tree-card-copy">
        <div class="professional-tree-card-title-row">
          <h3>${escapeProfessionalMapText(isOccurrence ? `Ocorrência ${record.id}` : record.titulo)}</h3>
          <span class="professional-record-status">${escapeProfessionalMapText(record.status)}</span>
        </div>
        <div class="professional-tree-card-species">${escapeProfessionalMapText(record.descricao)}</div>
        <div class="professional-tree-card-address">${escapeProfessionalMapText(record.id)} · ${escapeProfessionalMapText(record.bairro)}</div>
      </div>
    </article>
  `).join("");

  listElement.querySelectorAll("[data-map-record-type]").forEach(card => {
    const focusRecord = () => focusProfessionalMapRecord(card.dataset.mapRecordType, card.dataset.mapRecordId);
    card.addEventListener("click", focusRecord);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        focusRecord();
      }
    });
  });
}

// Voa com a câmera do mapa até o marcador clicado na lista lateral e abre o balão (popup)
function focusProfessionalMapRecord(type, recordId) {
  if (type === "trees") return focusProfessionalTree(recordId);
  const markerMap = type === "occurrences" ? professionalOccurrenceMarkersById : professionalServiceOrderMarkersById;
  const marker = markerMap.get(recordId);
  if (!marker) return;
  const point = marker.getLatLng();
  professionalMap.flyTo([point.lat, point.lng], 16, { duration: 0.7 });
  marker.openPopup();
}

// Alterna entre as camadas de Árvores, Ocorrências e Ordens de Serviço no menu "Camadas"
async function activateProfessionalMapLayer(layer) {
  activeMapDataLayer = layer;
  document.getElementById("professionalRiskLegend").hidden = layer === "serviceOrders";
  professionalMap.removeLayer(treeMarkerLayer);
  professionalMap.removeLayer(occurrenceMarkerLayer);
  professionalMap.removeLayer(serviceOrderMarkerLayer);

  if (layer === "trees") {
    professionalMap.addLayer(treeMarkerLayer);
  }
  if (layer === "occurrences") {
    await carregarOcorrencias();
    renderProfessionalOccurrenceMarkers();
    professionalMap.addLayer(occurrenceMarkerLayer);
  }
  if (layer === "serviceOrders") {
    addProfessionalServiceOrderExamples();
    professionalMap.addLayer(serviceOrderMarkerLayer);
  }

  document.getElementById("treeSearch").value = "";
  renderProfessionalActiveList();

  const messages = {
    trees: "Camada de árvores cadastradas ativada.",
    occurrences: `Camada de ocorrências ativada (${professionalMapDemo.occurrences.length} registro(s)).`,
    serviceOrders: "Camada de ordens de serviço ativada."
  };
  updateProfessionalMapToast(messages[layer]);
}

// Ajusta o zoom do mapa para enquadrar todos os marcadores da camada ativa ao clicar em "Ver todas"
function fitProfessionalMapToActiveRecords() {
  const records = activeMapDataLayer === "trees"
    ? professionalMapDemo.trees
    : activeMapDataLayer === "occurrences" ? professionalMapDemo.occurrences : professionalMapDemo.serviceOrders;
  const bounds = records.map(record => [record.lat ?? record.latitude, record.lng ?? record.longitude]);
  if (bounds.length) professionalMap.fitBounds(bounds, { padding: [42, 42], maxZoom: 16 });
}

// Centraliza o mapa em uma árvore específica
function focusProfessionalTree(treeId) {
  const tree = professionalMapDemo.trees.find(record => record.id === treeId);
  const marker = professionalMarkersById.get(treeId);
  if (!tree || !marker) return;

  professionalMap.flyTo([tree.lat, tree.lng], 16, { duration: 0.7 });
  marker.openPopup();
}

// Desenha os pinos vermelhos das ocorrências reais vindas do MongoDB no mapa
function renderProfessionalOccurrenceMarkers() {
  occurrenceMarkerLayer.clearLayers();
  professionalOccurrenceMarkersById.clear();

  professionalMapDemo.occurrences.forEach(occurrence => {
    const marker = L.circleMarker([occurrence.latitude, occurrence.longitude], {
      radius: 9,
      color: "#8c2c22",
      weight: 2,
      fillColor: "#d84836",
      fillOpacity: 0.85
    }).bindPopup(`
      <strong>Ocorrência ${escapeProfessionalMapText(occurrence.id)}</strong><br>
      <b>Tipo:</b> ${escapeProfessionalMapText(occurrence.tipo)}<br>
      ${escapeProfessionalMapText(occurrence.descricao)}<br>
      <b>Local:</b> ${escapeProfessionalMapText(occurrence.endereco)} (${escapeProfessionalMapText(occurrence.bairro)})<br>
      <b>Status:</b> ${escapeProfessionalMapText(occurrence.status)} · <b>Risco:</b> ${escapeProfessionalMapText(occurrence.risco)}
    `).addTo(occurrenceMarkerLayer);

    professionalOccurrenceMarkersById.set(occurrence.id, marker);
  });
}

// Desenha os marcadores de ordens de serviço no mapa
function addProfessionalServiceOrderExamples() {
  if (serviceOrderMarkerLayer.getLayers().length) return;
  professionalServiceOrderMarkersById.clear();
  professionalMapDemo.serviceOrders.forEach(order => {
    const marker = L.circleMarker([order.latitude, order.longitude], {
      radius: 8,
      color: "#185f8e",
      weight: 2,
      fillColor: "#398ec2",
      fillOpacity: 0.82
    }).bindPopup(`
      <strong>Ordem de serviço ${escapeProfessionalMapText(order.id)}</strong><br>
      ${escapeProfessionalMapText(order.titulo)}<br>
      ${escapeProfessionalMapText(order.descricao)}<br>
      ${escapeProfessionalMapText(order.bairro)}<br>
      Status: ${escapeProfessionalMapText(order.status)}
    `).addTo(serviceOrderMarkerLayer);
    professionalServiceOrderMarkersById.set(order.id, marker);
  });
}

// Liga os eventos de busca, troca de camadas e fechamento do modal de ficha da árvore
function setupProfessionalMapEvents() {
  document.getElementById("treeSearch").addEventListener("input", () => renderProfessionalActiveList());

// Redireciona para as rotas protegidas configuradas no ConfiguracaoPaginas.java
  document.getElementById("showAllTrees").addEventListener("click", () => {
    if (activeMapDataLayer === "occurrences") {
      window.location.href = "/ocorrencias";
      return;
    }
    if (activeMapDataLayer === "serviceOrders") {
      window.location.href = "/ordens-servico";
      return;
    }
    if(activeMapDataLayer === "trees") {
      window.location.href = "/arvores";
      return;
    }
    document.getElementById("treeSearch").value = "";
    renderProfessionalActiveList();
    fitProfessionalMapToActiveRecords();
  });

  document.querySelectorAll("[name='mapDataLayer']").forEach(input => {
    input.addEventListener("change", event => activateProfessionalMapLayer(event.currentTarget.dataset.mapLayer));
  });

  document.getElementById("toggleMapLayers").addEventListener("click", event => {
    const layerBody = document.getElementById("mapLayerBody");
    const button = event.currentTarget;
    const isCollapsed = layerBody.classList.toggle("professional-map-layers-collapsed");
    button.setAttribute("aria-label", isCollapsed ? "Expandir camadas" : "Recolher camadas");
    button.title = isCollapsed ? "Expandir camadas" : "Recolher camadas";
    button.querySelector("i").className = isCollapsed ? "bi bi-chevron-down" : "bi bi-chevron-up";
  });

  document.getElementById("closeProfessionalTreeModal").addEventListener("click", closeProfessionalTreeDetails);
  document.getElementById("professionalTreeModal").addEventListener("click", event => {
    if (event.target.id === "professionalTreeModal") closeProfessionalTreeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeProfessionalTreeDetails();
  });
}

// Abre o modal com a ficha detalhada de uma árvore ao clicar no botão do pop-up
async function openProfessionalTreeDetails(tree) {
  const modal = document.getElementById("professionalTreeModal");
  const corpo = document.getElementById("professionalTreeModalBody");
  const titulo = document.getElementById("professionalTreeModalTitle");
  document.getElementById("professionalTreeModalId").textContent = `ID ${tree.id}`;
  titulo.textContent = `Ficha da árvore — ${tree.nome}`;
  corpo.textContent = "Carregando ficha...";
  modal.hidden = false;
  document.getElementById("closeProfessionalTreeModal").focus();

  try {
    const resposta = await fetch(`/api/arvores/${encodeURIComponent(tree.id)}`, {
      credentials: "same-origin"
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const arvore = await resposta.json();
    if (modal.hidden) return;
    const texto = escapeProfessionalMapText;
    const data = valor => {
      if (!valor) return "Não registrada";
      const d = new Date(valor);
      return Number.isNaN(d.getTime()) ? "Não registrada" : d.toLocaleDateString("pt-BR");
    };
    const campo = (rotulo, valor, amplo = false) => `
      <div class="professional-tree-detail ${amplo ? "professional-tree-detail-wide" : ""}">
        <span>${texto(rotulo)}</span><strong>${texto(valor ?? "Não informado")}</strong>
      </div>`;
    const risco = converterRisco(arvore.risco);
    titulo.textContent = `Ficha da árvore — ${arvore.nomePopular || arvore.especie || "Sem nome"}`;
    corpo.innerHTML = `
      <h3 class="professional-tree-modal-section-title">Identificação e localização</h3>
      <div class="professional-tree-details-grid">
        ${campo("Nome popular", arvore.nomePopular)}
        ${campo("Nome científico", arvore.nomeCientifico)}
        ${campo("Espécie", arvore.especie)}
        ${campo("Endereço e bairro", `${arvore.endereco || "Não informado"} · ${arvore.bairro || "Não informado"}`, true)}
        ${campo("Latitude", arvore.latitude)}
        ${campo("Longitude", arvore.longitude)}
        ${campo("Idade estimada", arvore.idade)}
        ${campo("Altura", arvore.alturaMetros == null ? null : `${arvore.alturaMetros} m`)}
        ${campo("Diâmetro", arvore.diametroCm == null ? null : `${arvore.diametroCm} cm`)}
        ${campo("Estado", arvore.estado)}
        ${campo("Risco", risco)}
        ${campo("Última vistoria", data(arvore.ultimaInspecao))}
        ${campo("Última poda", data(arvore.ultimaPoda))}
        ${campo("Próxima manutenção", data(arvore.proximaManutencao))}
      </div>
      <h3 class="professional-tree-modal-section-title">Histórico da árvore</h3>
      <p>Histórico de intervenções ainda não disponibilizado pela API.</p>
    `;
  } catch (erro) {
    console.error("Erro ao consultar ficha da árvore:", erro);
    if (!modal.hidden) corpo.textContent = "Não foi possível carregar a ficha desta árvore.";
  }
}

// Fecha o modal da ficha da árvore
function closeProfessionalTreeDetails() {
  const modal = document.getElementById("professionalTreeModal");
  if (modal) modal.hidden = true;
}

// Mostra uma mensagem temporária na barra inferior do mapa
function updateProfessionalMapToast(message) {
  const toast = document.getElementById("professionalMapToast");
  toast.innerHTML = `<i class="bi bi-geo-alt" aria-hidden="true"></i><span>${escapeProfessionalMapText(message)}</span>`;
  window.clearTimeout(updateProfessionalMapToast.timeoutId);
  updateProfessionalMapToast.timeoutId = window.setTimeout(() => {
    toast.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i><span>Clique em um marcador para consultar os dados da árvore ou ocorrência.</span>';
  }, 2500);
}