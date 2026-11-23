// Autor: Gabrielle Mota, Sophia Fernandes

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
  treeLocations: [],
  occurrences: [],
  occurrenceLocations: [],
  // Camada de ordens de serviço mantida para o módulo responsável
  serviceOrders: []
};

const MUNICIPIOS_MAPA = {
  "6ae666a7680e8a4330a1ab66": { id: "6ae666a7680e8a4330a1ab66", nome: "Campinas - SP", latitude: -22.9056, longitude: -47.0608, zoom: 13 },
  "6ae7854cb9962492d01e6af6": { id: "6ae7854cb9962492d01e6af6", nome: "Hortolândia - SP", latitude: -22.8583, longitude: -47.2200, zoom: 13 },
  "6ae7856ab9962492d01e6af7": { id: "6ae7856ab9962492d01e6af7", nome: "Sumaré - SP", latitude: -22.8214, longitude: -47.2660, zoom: 13 },
  "6b0382ed251d742536f8cd10": { id: "6b0382ed251d742536f8cd10", nome: "Valinhos - SP", latitude: -22.9702933, longitude: -46.9978148, zoom: 13 },
  "6b0382ed251d742536f8cd11": { id: "6b0382ed251d742536f8cd11", nome: "Vinhedo - SP", latitude: -23.0297, longitude: -46.9753, zoom: 13 }
};
let municipioIdMapa = null;

// Variáveis globais que controlam o mapa Leaflet, suas camadas e os marcadores
let professionalMap;
let treeMarkerLayer;
let occurrenceMarkerLayer;
let serviceOrderMarkerLayer;
let professionalMarkersById = new Map();
let professionalOccurrenceMarkersById = new Map();
let professionalServiceOrderMarkersById = new Map();
let activeMapDataLayer = "trees";
const PROFESSIONAL_MAP_LIST_PAGE_SIZE = 18;

function renderNextProfessionalListPage(listElement) {
  const state = listElement._professionalInfiniteList;
  if (!state || state.rendered >= state.records.length) return;
  const page = state.records.slice(state.rendered, state.rendered + PROFESSIONAL_MAP_LIST_PAGE_SIZE);
  listElement.insertAdjacentHTML("beforeend", page.map(state.renderRecord).join(""));
  state.rendered += page.length;
}

function renderProfessionalInfiniteList(listElement, records, renderRecord, emptyHtml) {
  listElement._professionalInfiniteList = { records, renderRecord, rendered: 0 };
  listElement.scrollTop = 0;
  listElement.innerHTML = records.length ? "" : emptyHtml;
  if (records.length) renderNextProfessionalListPage(listElement);
}

function setupProfessionalInfiniteList() {
  const listElement = document.getElementById("professionalTreeList");
  listElement.addEventListener("scroll", () => {
    if (listElement.scrollTop + listElement.clientHeight >= listElement.scrollHeight - 180) {
      renderNextProfessionalListPage(listElement);
    }
  }, { passive: true });
  const focusCard = card => {
    if (card.dataset.professionalTree) {
      focusProfessionalTree(card.dataset.professionalTree);
    } else if (card.dataset.mapRecordType && card.dataset.mapRecordId) {
      focusProfessionalMapRecord(card.dataset.mapRecordType, card.dataset.mapRecordId);
    }
  };
  listElement.addEventListener("click", event => {
    const card = event.target.closest("[data-professional-tree], [data-map-record-type]");
    if (card) focusCard(card);
  });
  listElement.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest("[data-professional-tree], [data-map-record-type]");
    if (!card) return;
    event.preventDefault();
    focusCard(card);
  });
}

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

function temCoordenadasValidas(registro) {
  return Number.isFinite(registro?.latitude ?? registro?.lat)
    && Number.isFinite(registro?.longitude ?? registro?.lng);
}

// Busca as árvores reais cadastradas no MongoDB via GET /api/arvores
async function carregarArvores() {
  const resposta = await fetch("/api/arvores", { credentials: "same-origin" });
  if (!resposta.ok) throw new Error(`A consulta de árvores falhou (HTTP ${resposta.status}).`);
  const dados = await resposta.json();
  if (!Array.isArray(dados)) throw new Error("Resposta inesperada da API de árvores.");

  const arvoresDoMunicipio = dados
    .filter(arvore => String(arvore.municipioId || "").toLowerCase() === municipioIdMapa)
    .filter(arvore => Number.isFinite(arvore.latitude) && Math.abs(arvore.latitude) <= 90
      && Number.isFinite(arvore.longitude) && Math.abs(arvore.longitude) <= 180);

  professionalMapDemo.treeLocations = arvoresDoMunicipio.map(arvore => ({
    id: String(arvore.id),
    codigoArv: arvore.codigoArv || "",
    nome: arvore.nomePopular || arvore.especie || "Árvore sem nome",
    especie: arvore.nomeCientifico || arvore.especie || "Não informado",
    bairro: arvore.bairro || "Não informado",
    endereco: arvore.endereco || "Não informado",
    latitude: arvore.latitude,
    longitude: arvore.longitude,
    lat: arvore.latitude,
    lng: arvore.longitude,
    risco: converterRisco(arvore.risco),
    ativa: arvore.ativa !== false
  }));
  professionalMapDemo.trees = professionalMapDemo.treeLocations
    .filter(arvore => arvore.ativa);
}

// Busca as ocorrências reais cadastradas no MongoDB via GET /api/ocorrencias
async function carregarOcorrencias() {
  try {
    const resposta = await fetch("/api/ocorrencias", { credentials: "same-origin" });
    if (!resposta.ok) throw new Error(`A consulta de ocorrências falhou (HTTP ${resposta.status}).`);

    const dados = await resposta.json();
    if (!Array.isArray(dados)) return;

    professionalMapDemo.occurrenceLocations = dados
      .filter(oco => String(oco.municipioId || "").toLowerCase() === municipioIdMapa)
      .map(oco => ({
        objectId: String(oco._id || oco.ocorrenciaId || ""),
        arvoreId: String(oco.arvoreId || ""),
        id: String(oco.protocolo || oco.id || oco._id),
        latitude: oco.latitude,
        longitude: oco.longitude,
        tipo: oco.tipoProblema || "Ocorrência arbórea",
        descricao: oco.descricao || oco.tipoProblema || "Sem descrição informada.",
        bairro: oco.bairro || "Não informado",
        endereco: [oco.localizacao, oco.numero].filter(Boolean).join(", ") || "Endereço não informado",
        status: oco.status || "Recebida",
        risco: oco.prioridade || oco.urgencia || "Média"
      }));
    professionalMapDemo.occurrences = professionalMapDemo.occurrenceLocations
      .filter(temCoordenadasValidas);
  } catch (erro) {
    console.error("Falha ao carregar ocorrências do mapa:", erro);
    professionalMapDemo.occurrences = [];
    professionalMapDemo.occurrenceLocations = [];
  }
}

async function carregarOrdensDeServico() {
  const resposta = await fetch("/api/ordens-servico", { credentials: "same-origin" });
  const dados = await resposta.json();
  if (!resposta.ok) {
    throw new Error(dados.erro || `Falha ao consultar ordens de serviço (HTTP ${resposta.status}).`);
  }
  if (!Array.isArray(dados.ordens)) {
    throw new Error("A API retornou uma lista de ordens de serviço inválida.");
  }

  const ocorrenciasPorId = new Map(
    professionalMapDemo.occurrenceLocations
      .filter(oco => oco.objectId)
      .map(oco => [oco.objectId.toLowerCase(), oco])
  );
  const arvoresPorId = new Map(
    professionalMapDemo.treeLocations.map(arvore => [arvore.id.toLowerCase(), arvore])
  );

  professionalMapDemo.serviceOrders = dados.ordens
    .filter(ordem => String(ordem.municipioId || "").toLowerCase() === municipioIdMapa)
    .map(ordem => {
      const ocorrencia = ocorrenciasPorId.get(String(ordem.ocorrenciaId || "").toLowerCase());
      const arvore = arvoresPorId.get(String(ordem.arvoreId || ocorrencia?.arvoreId || "").toLowerCase());
      const local = temCoordenadasValidas(ordem) ? ordem
        : temCoordenadasValidas(ocorrencia) ? ocorrencia
        : temCoordenadasValidas(arvore) ? arvore : ocorrencia || arvore;
      return {
        id: String(ordem.codigo || ordem.id),
        titulo: ordem.titulo || "Ordem de serviço",
        descricao: ordem.descricao || "Sem descrição informada.",
        bairro: ordem.bairro || local?.bairro || "Não informado",
        endereco: ordem.endereco || local?.endereco || "Endereço não informado",
        latitude: local?.latitude ?? local?.lat ?? null,
        longitude: local?.longitude ?? local?.lng ?? null,
        status: ordem.status || "Aberta",
        prioridade: ordem.prioridade || ordem.urgencia || ocorrencia?.risco || arvore?.risco || "Média",
        dataCriacao: ordem.dataCriacao || null
      };
    });
}

// Inicializa o mapa Leaflet e carrega tanto as árvores quanto as ocorrências reais do banco
async function initializeProfessionalMap() {
  try {
    const respostaSessao = await fetch("/api/contas/sessao", { credentials: "same-origin" });
    if (respostaSessao.ok) {
      const sessao = await respostaSessao.json();
      municipioIdMapa = String(sessao.municipioId || "").toLowerCase();
    }
  } catch (erro) {
    console.warn("Não foi possível obter o município da sessão:", erro);
  }
  const municipio = MUNICIPIOS_MAPA[municipioIdMapa] || MUNICIPIOS_MAPA["6ae666a7680e8a4330a1ab66"];
  municipioIdMapa = municipio.id;
  professionalMapDemo.municipality = { ...municipio };
  document.getElementById("mapScopeName").textContent = professionalMapDemo.municipality.nome;
  updateProfessionalMapListHeading();
  if (!initializeLeafletMap()) return;
  setupProfessionalMapEvents();
  setupProfessionalInfiniteList();
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
      attribution: "Tiles © Esri — Sources: Esri, <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>; geocoding © OpenStreetMap contributors",
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

function professionalPriorityClass(priority) {
  const normalized = String(priority || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  if (["baixa", "baixo"].includes(normalized)) return "low";
  if (["media", "medio", "moderada", "moderado"].includes(normalized)) return "medium";
  if (["alta", "alto"].includes(normalized)) return "high";
  if (["critica", "critico"].includes(normalized)) return "critical";
  return "unknown";
}

// Protege os textos exibidos nos pop-ups contra caracteres HTML inválidos
function escapeProfessionalMapText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Cria o ícone circular colorido para cada árvore no mapa
function codigoArvoreMapa(tree) {
  return tree?.codigoArv || "Codigo nao informado";
}

function safeProfessionalTreePhoto(value) {
  if (typeof value !== "string") return "";
  const source = value.trim();
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(source)) return source;
  try {
    const url = new URL(source, window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

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
        <div class="professional-tree-popup-id">${escapeProfessionalMapText(codigoArvoreMapa(tree))}</div>
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
  renderProfessionalInfiniteList(listElement, treeRecords, tree => `
    <article class="professional-tree-card" data-professional-tree="${escapeProfessionalMapText(tree.id)}" tabindex="0" role="button" aria-label="Centralizar mapa na árvore ${escapeProfessionalMapText(tree.nome)}">
      <span class="professional-tree-card-icon"><i class="bi bi-tree-fill" aria-hidden="true"></i></span>
      <div class="professional-tree-card-copy">
        <div class="professional-tree-card-title-row">
          <h3>${escapeProfessionalMapText(tree.nome)}</h3>
          <span class="professional-risk-badge ${professionalRiskClass(tree.risco)}">${escapeProfessionalMapText(tree.risco)}</span>
        </div>
        <div class="professional-tree-card-species">${escapeProfessionalMapText(tree.especie)}</div>
        <div class="professional-tree-card-address">${escapeProfessionalMapText(codigoArvoreMapa(tree))} · ${escapeProfessionalMapText(tree.bairro)}</div>
      </div>
    </article>
  `, '<div class="professional-tree-empty">Não há árvores que correspondam à busca neste município.</div>');
}

// Atualiza os títulos e placeholders da barra lateral conforme a camada selecionada (Árvores, Ocorrências ou Ordens)
function updateProfessionalMapListHeading() {
  const labels = {
    trees: { title: "Árvores cadastradas", all: "Ver todas" },
    occurrences: { title: "Ocorrências", all: "Ver todas" },
    serviceOrders: { title: "Ordens de serviço", all: "Ver todas" }
  };
  const selected = labels[activeMapDataLayer];
  document.getElementById("mapListTitle").textContent = selected.title;
  document.getElementById("showAllTrees").textContent = selected.all;
}

// Desenha todos os registros da camada ativa na lista lateral direita.
function renderProfessionalActiveList() {
  updateProfessionalMapListHeading();

  if (activeMapDataLayer === "trees") {
    renderProfessionalTreeList(professionalMapDemo.trees);
    renderProfessionalTreeMarkers(professionalMapDemo.trees);
    return;
  }

  const records = activeMapDataLayer === "occurrences" ? professionalMapDemo.occurrences : professionalMapDemo.serviceOrders;
  const matches = [...records];
  if (activeMapDataLayer === "serviceOrders") {
    const creationTime = order => {
      const timestamp = Date.parse(order.dataCriacao || "");
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    matches.sort((left, right) => creationTime(right) - creationTime(left));
  }

  const isOccurrence = activeMapDataLayer === "occurrences";
  const icon = isOccurrence ? "bi-exclamation-triangle-fill" : "bi-clipboard2-check-fill";
  const emptyText = isOccurrence ? "Não há ocorrências registradas neste município." : "Não há ordens de serviço registradas neste município.";
  const listElement = document.getElementById("professionalTreeList");
  renderProfessionalInfiniteList(listElement, matches, record => `
    <article class="professional-tree-card" data-map-record-type="${isOccurrence ? "occurrences" : "serviceOrders"}" data-map-record-id="${escapeProfessionalMapText(record.id)}" tabindex="0" role="button" aria-label="Centralizar mapa em ${escapeProfessionalMapText(record.id)}">
      <span class="professional-tree-card-icon"><i class="bi ${icon}" aria-hidden="true"></i></span>
      <div class="professional-tree-card-copy">
        <div class="professional-tree-card-title-row">
          <h3>${escapeProfessionalMapText(isOccurrence ? record.tipo : record.titulo)}</h3>
          <span class="professional-risk-badge ${professionalPriorityClass(isOccurrence ? record.risco : record.prioridade)}">${escapeProfessionalMapText(isOccurrence ? record.risco : record.prioridade)}</span>
        </div>
        <div class="professional-tree-card-species">${escapeProfessionalMapText(record.descricao)}</div>
        <div class="professional-tree-card-address">${escapeProfessionalMapText(record.status)} · ${escapeProfessionalMapText(record.id)} · ${escapeProfessionalMapText(record.bairro)}</div>
      </div>
    </article>
  `, `<div class="professional-tree-empty">${emptyText}</div>`);
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
  let mensagemCamada;
  document.getElementById("professionalRiskLegend").hidden = layer !== "trees";
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
    try {
      await Promise.all([carregarArvores(), carregarOcorrencias()]);
      await carregarOrdensDeServico();
      addProfessionalServiceOrderMarkers();
      const semCoordenadas = professionalMapDemo.serviceOrders
        .filter(ordem => !Number.isFinite(ordem.latitude) || !Number.isFinite(ordem.longitude)).length;
      mensagemCamada = semCoordenadas
        ? `${professionalMapDemo.serviceOrders.length - semCoordenadas} OS com localização; ${semCoordenadas} sem coordenadas.`
        : `${professionalMapDemo.serviceOrders.length} ordem(ns) de serviço carregadas.`;
    } catch (erro) {
      console.error("Falha ao carregar ordens de serviço do mapa:", erro);
      professionalMapDemo.serviceOrders = [];
      mensagemCamada = erro.message;
    }
    professionalMap.addLayer(serviceOrderMarkerLayer);
  }

  renderProfessionalActiveList();

  const messages = {
    trees: "Camada de árvores cadastradas ativada.",
    occurrences: `Camada de ocorrências ativada (${professionalMapDemo.occurrences.length} registro(s)).`,
    serviceOrders: "Camada de ordens de serviço ativada."
  };
  updateProfessionalMapToast(mensagemCamada || messages[layer]);
}

// Ajusta o zoom do mapa para enquadrar todos os marcadores da camada ativa ao clicar em "Ver todas"
function fitProfessionalMapToActiveRecords() {
  const records = activeMapDataLayer === "trees"
    ? professionalMapDemo.trees
    : activeMapDataLayer === "occurrences" ? professionalMapDemo.occurrences : professionalMapDemo.serviceOrders;
  const bounds = records
    .filter(record => Number.isFinite(record.lat ?? record.latitude)
      && Number.isFinite(record.lng ?? record.longitude))
    .map(record => [record.lat ?? record.latitude, record.lng ?? record.longitude]);
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
      <div class="professional-tree-popup-id">${escapeProfessionalMapText(occurrence.id)}</div>
      <div class="professional-tree-popup-name">${escapeProfessionalMapText(occurrence.tipo)}</div>
      <div class="professional-tree-popup-species">${escapeProfessionalMapText(occurrence.descricao)}</div>
      <div class="professional-tree-popup-address">${escapeProfessionalMapText(occurrence.endereco)}<br>${escapeProfessionalMapText(occurrence.bairro)}</div>
      <div class="professional-tree-popup-risk"><span class="professional-risk-badge ${professionalPriorityClass(occurrence.risco)}">${escapeProfessionalMapText(occurrence.risco)}</span></div>
      <div class="professional-tree-popup-address">Status: ${escapeProfessionalMapText(occurrence.status)}</div>
    `).addTo(occurrenceMarkerLayer);

    professionalOccurrenceMarkersById.set(occurrence.id, marker);
  });
}

// Desenha os marcadores de ordens de serviço vinculadas a ocorrências ou árvores.
function addProfessionalServiceOrderMarkers() {
  serviceOrderMarkerLayer.clearLayers();
  professionalServiceOrderMarkersById.clear();
  professionalMapDemo.serviceOrders.forEach(order => {
    if (!Number.isFinite(order.latitude) || !Number.isFinite(order.longitude)) return;
    const marker = L.circleMarker([order.latitude, order.longitude], {
      radius: 8,
      color: "#185f8e",
      weight: 2,
      fillColor: "#398ec2",
      fillOpacity: 0.82
    }).bindPopup(`
      <div class="professional-tree-popup-id">${escapeProfessionalMapText(order.id)}</div>
      <div class="professional-tree-popup-name">${escapeProfessionalMapText(order.titulo)}</div>
      <div class="professional-tree-popup-species">${escapeProfessionalMapText(order.descricao)}</div>
      <div class="professional-tree-popup-address">${escapeProfessionalMapText(order.endereco)}<br>${escapeProfessionalMapText(order.bairro)}</div>
      <div class="professional-tree-popup-risk"><span class="professional-risk-badge ${professionalPriorityClass(order.prioridade)}">${escapeProfessionalMapText(order.prioridade)}</span></div>
      <div class="professional-tree-popup-address">Status: ${escapeProfessionalMapText(order.status)}</div>
    `).addTo(serviceOrderMarkerLayer);
    professionalServiceOrderMarkersById.set(order.id, marker);
  });
}

// Liga os eventos de troca de camadas e fechamento do modal de ficha da árvore
function setupProfessionalMapEvents() {
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
  document.getElementById("professionalTreeModalBody").addEventListener("change", event => {
    if (event.target?.id !== "professionalTreePhotoSelect") return;
    const fotos = JSON.parse(event.target.dataset.photos || "[]");
    const imagem = document.getElementById("professionalTreePhoto");
    if (imagem) imagem.src = fotos[Number(event.target.value)] || fotos[0] || "";
  });
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
  document.getElementById("professionalTreeModalId").textContent = codigoArvoreMapa(tree);
  titulo.textContent = tree.nome || "Árvore";
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
    const fotos = (Array.isArray(arvore.fotos) ? arvore.fotos : [])
      .map(safeProfessionalTreePhoto).filter(Boolean);
    document.getElementById("professionalTreeModalId").textContent = arvore.codigoArv || tree.codigoArv || codigoArvoreMapa(tree);
    titulo.textContent = arvore.nomePopular || tree.nome || "Árvore";
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
        ${campo("Risco", converterRisco(arvore.risco))}
        ${campo("Última vistoria", data(arvore.ultimaInspecao))}
        ${campo("Última poda", data(arvore.ultimaPoda))}
        ${campo("Próxima manutenção", data(arvore.proximaManutencao))}
      </div>
      <h3 class="professional-tree-modal-section-title">Fotos</h3>
      ${fotos.length ? `
        <label class="professional-tree-photo-label" for="professionalTreePhotoSelect">Visualizar foto</label>
        <select class="professional-tree-photo-select" id="professionalTreePhotoSelect" data-photos="${texto(JSON.stringify(fotos))}">
          ${fotos.map((foto, indice) => `<option value="${indice}">Foto ${indice + 1}</option>`).join("")}
        </select>
        <img class="professional-tree-photo" id="professionalTreePhoto" src="${texto(fotos[0])}" alt="Foto anexada à árvore">
      ` : `<div class="professional-tree-empty-state"><i class="bi bi-images" aria-hidden="true"></i><span>Nenhuma foto foi anexada a esta árvore.</span></div>`}
      <h3 class="professional-tree-modal-section-title">Histórico</h3>
      <div id="professionalTreeHistory"><div class="professional-tree-empty-state"><i class="bi bi-clock-history" aria-hidden="true"></i><span>Carregando histórico...</span></div></div>
    `;
    carregarHistoricoProfissionalDaArvore(tree.id, corpo);
  } catch (erro) {
    console.error("Erro ao consultar ficha da árvore:", erro);
    if (!modal.hidden) corpo.textContent = "Não foi possível carregar a ficha desta árvore.";
  }
}

async function carregarHistoricoProfissionalDaArvore(treeId, corpo) {
  const container = corpo.querySelector("#professionalTreeHistory");
  try {
    const resposta = await fetch(`/api/arvores/${encodeURIComponent(treeId)}/ordens-servico`, {
      credentials: "same-origin", cache: "no-store"
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const ordens = Array.isArray(dados.ordens) ? dados.ordens : [];
    if (!ordens.length) {
      const mensagem = "Esta árvore não possui um histórico salvo.";
      container.innerHTML = `<div class="professional-tree-empty-state"><i class="bi bi-clock-history" aria-hidden="true"></i><span>${escapeProfessionalMapText(mensagem)}</span></div>`;
      return;
    }
    container.innerHTML = `<ol class="professional-tree-history-timeline">${ordens.map(ordem => {
        const instante = ordem.data ? new Date(ordem.data) : null;
        const data = instante && !Number.isNaN(instante.getTime()) ? instante.toLocaleDateString("pt-BR") : "Não informada";
        const texto = escapeProfessionalMapText;
        return `<li class="professional-tree-history-item"><time>${texto(data)}</time><strong>${texto(ordem.tipo || "Intervenção")}</strong>${ordem.descricao ? `<p>${texto(ordem.descricao)}</p>` : ""}</li>`;
      }).join("")}</ol>`;
  } catch (erro) {
    console.warn("Erro ao consultar histórico de OS da árvore:", erro);
    container.innerHTML = `<div class="professional-tree-empty-state"><i class="bi bi-info-circle" aria-hidden="true"></i><span>Não foi possível carregar o histórico agora.</span></div>`;
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
