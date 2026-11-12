// Dados fictícios de árvores, ocorrências e município para a visualização inicial.
// Integração futura: carregar do perfil profissional o município cadastrado e consultar
// apenas os registros cujo municipioId corresponda ao município desse profissional.
const professionalMapDemo = {
  municipality: {
    id: "campinas-demo",
    nome: "Campinas - SP",
    latitude: -22.9056,
    longitude: -47.0608,
    zoom: 13
  },
  // As árvores virão da API. Não exibir exemplos como se fossem cadastros reais.
  trees: [],
  // Ocorrências e ordens permanecem demonstrativas por serem de outros módulos.
  occurrences: [
    { id: "OC-2048", latitude: -22.8860, longitude: -47.0682, descricao: "Galho quebrado após chuva forte.", bairro: "Jardim Chapadão", status: "Em andamento" }
  ],
  serviceOrders: [
    { id: "OS-2026-041", latitude: -22.9104, longitude: -47.0525, titulo: "Poda preventiva", descricao: "Poda de galhos próximos à rede elétrica.", bairro: "Cambuí", status: "Em andamento" }
  ]
};

// Referência de Campinas usada somente na demonstração atual.
// A API ainda não permite recuperar o municipioId da sessão do funcionário.
const MUNICIPIO_ID_MAPA = "6ae666a7680e8a4330a1ab66";

// Guarda o mapa, as camadas e os marcadores para os controles desta página.
let professionalMap;
let treeMarkerLayer;
let occurrenceMarkerLayer;
let serviceOrderMarkerLayer;
let professionalMarkersById = new Map();
let professionalOccurrenceMarkersById = new Map();
let professionalServiceOrderMarkersById = new Map();
let activeMapDataLayer = "trees";

function converterRisco(risco) {
  const riscos = {
    BAIXO: "Baixo",
    MODERADO: "Moderado",
    ALTO: "Alto",
    CRITICO: "Crítico"
  };

  return riscos[risco] || "Não informado";
}

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

// Monta o Leaflet primeiro, para que uma falha na API não apague o mapa.
async function initializeProfessionalMap() {
  document.getElementById("mapScopeName").textContent = professionalMapDemo.municipality.nome + " (teste)";
  updateProfessionalMapListHeading();
  if (!initializeLeafletMap()) return;
  setupProfessionalMapEvents();
  renderProfessionalActiveList();
  try {
    await carregarArvores();
    renderProfessionalActiveList();
    updateProfessionalMapToast(professionalMapDemo.trees.length
      ? `${professionalMapDemo.trees.length} árvores ativas carregadas do MongoDB.`
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

// Cria o mapa e sua camada base cartográfica.
function initializeLeafletMap() {
  const mapElement = document.getElementById("professionalMap");

  // Exibe uma orientação se a biblioteca Leaflet não tiver sido carregada no navegador.
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

  // Centraliza o mapa no município associado ao profissional.
  const municipality = professionalMapDemo.municipality;
  professionalMap = L.map("professionalMap", { zoomControl: false })
    .setView([municipality.latitude, municipality.longitude], municipality.zoom);

  // Camada visual de ruas; árvores são dados reais, outras camadas ainda são demonstrativas.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles © Esri — Sources: Esri, OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(professionalMap);

  // Cria controles de zoom e camadas de dados para os elementos do município.
  L.control.zoom({ position: "topleft" }).addTo(professionalMap);
  treeMarkerLayer = L.layerGroup().addTo(professionalMap);
  occurrenceMarkerLayer = L.layerGroup();
  serviceOrderMarkerLayer = L.layerGroup();
  renderProfessionalTreeMarkers(professionalMapDemo.trees);
  return true;
}

// Converte o nível de risco do registro em uma classe usada pela cor do marcador.
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

// Escapa texto dinâmico antes de inseri-lo em conteúdo HTML dos pop-ups e da lista.
function escapeProfessionalMapText(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Desenha o marcador circular com ícone de árvore e cor correspondente ao risco.
function createProfessionalTreeIcon(risk) {
  return L.divIcon({
    className: "",
    html: `<div class="professional-tree-pin ${professionalRiskClass(risk)}"><i class="bi bi-tree-fill" aria-hidden="true"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -15]
  });
}

// Cria os pop-ups e relaciona cada marcador ao ID da sua árvore.
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

    // Conecta o atalho do pop-up à ficha da mesma árvore selecionada no mapa.
    marker.on("popupopen", event => {
      const detailsButton = event.popup.getElement().querySelector("[data-professional-tree-details]");
      detailsButton?.addEventListener("click", () => openProfessionalTreeDetails(tree));
    });

    marker.addTo(treeMarkerLayer);
    professionalMarkersById.set(tree.id, marker);
  });
}

// Renderiza a coluna de árvores e permite centralizar o mapa ao escolher um card.
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

  // Clique ou Enter/Espaço em um card leva ao marcador correspondente no mapa.
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
    [record.id, record.descricao, record.titulo, record.bairro, record.status]
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
        <div class="professional-tree-card-title-row"><h3>${escapeProfessionalMapText(isOccurrence ? `Ocorrência ${record.id}` : record.titulo)}</h3><span class="professional-record-status">${escapeProfessionalMapText(record.status)}</span></div>
        <div class="professional-tree-card-species">${escapeProfessionalMapText(record.descricao)}</div>
        <div class="professional-tree-card-address">${escapeProfessionalMapText(record.id)} · ${escapeProfessionalMapText(record.bairro)}</div>
      </div>
    </article>
  `).join("");
  listElement.querySelectorAll("[data-map-record-type]").forEach(card => {
    const focusRecord = () => focusProfessionalMapRecord(card.dataset.mapRecordType, card.dataset.mapRecordId);
    card.addEventListener("click", focusRecord);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focusRecord(); }
    });
  });
}

function focusProfessionalMapRecord(type, recordId) {
  if (type === "trees") return focusProfessionalTree(recordId);
  const markerMap = type === "occurrences" ? professionalOccurrenceMarkersById : professionalServiceOrderMarkersById;
  const marker = markerMap.get(recordId);
  if (!marker) return;
  const point = marker.getLatLng();
  professionalMap.flyTo([point.lat, point.lng], 16, { duration: .7 });
  marker.openPopup();
}

function activateProfessionalMapLayer(layer) {
  activeMapDataLayer = layer;
  // Risco é relevante para árvores; ao exibir ordens, a legenda sai da camada visível.
  document.getElementById("professionalRiskLegend").hidden = layer === "serviceOrders";
  professionalMap.removeLayer(treeMarkerLayer);
  professionalMap.removeLayer(occurrenceMarkerLayer);
  professionalMap.removeLayer(serviceOrderMarkerLayer);

  if (layer === "trees") professionalMap.addLayer(treeMarkerLayer);
  if (layer === "occurrences") {
    addProfessionalOccurrenceExamples();
    professionalMap.addLayer(occurrenceMarkerLayer);
  }
  if (layer === "serviceOrders") {
    addProfessionalServiceOrderExamples();
    professionalMap.addLayer(serviceOrderMarkerLayer);
  }
  document.getElementById("treeSearch").value = "";
  renderProfessionalActiveList();
  const messages = { trees: "Camada de árvores cadastradas ativada.", occurrences: "Camada de ocorrências ativada.", serviceOrders: "Camada de ordens de serviço ativada." };
  updateProfessionalMapToast(layer === "trees" ? messages[layer]
    : `${messages[layer]} Registros demonstrativos (integração pendente).`);
}

function fitProfessionalMapToActiveRecords() {
  const records = activeMapDataLayer === "trees"
    ? professionalMapDemo.trees
    : activeMapDataLayer === "occurrences" ? professionalMapDemo.occurrences : professionalMapDemo.serviceOrders;
  const bounds = records.map(record => [record.lat ?? record.latitude, record.lng ?? record.longitude]);
  if (bounds.length) professionalMap.fitBounds(bounds, { padding: [42, 42], maxZoom: 16 });
}

// Aproxima o mapa da árvore escolhida e abre o pop-up daquele marcador.
function focusProfessionalTree(treeId) {
  const tree = professionalMapDemo.trees.find(record => record.id === treeId);
  const marker = professionalMarkersById.get(treeId);
  if (!tree || !marker) return;

  professionalMap.flyTo([tree.lat, tree.lng], 16, { duration: 0.7 });
  marker.openPopup();
}

// Cria os marcadores fictícios de ocorrências dentro do município demonstrativo.
function addProfessionalOccurrenceExamples() {
  if (occurrenceMarkerLayer.getLayers().length) return;
  professionalOccurrenceMarkersById.clear();

  // Futuramente, preencher essa camada com ocorrências filtradas pelo município do profissional.
  professionalMapDemo.occurrences.forEach(occurrence => {
    const marker = L.circleMarker([occurrence.latitude, occurrence.longitude], {
      radius: 8,
      color: "#8c2c22",
      weight: 2,
      fillColor: "#d84836",
      fillOpacity: .78
    }).bindPopup(`
      <strong>Ocorrência ${escapeProfessionalMapText(occurrence.id)} (exemplo)</strong><br>
      ${escapeProfessionalMapText(occurrence.descricao)}<br>
      ${escapeProfessionalMapText(occurrence.bairro)}<br>
      Status: ${escapeProfessionalMapText(occurrence.status)}
    `).addTo(occurrenceMarkerLayer);
    professionalOccurrenceMarkersById.set(occurrence.id, marker);
  });
}

// Cria os marcadores demonstrativos das ordens de serviço.
function addProfessionalServiceOrderExamples() {
  if (serviceOrderMarkerLayer.getLayers().length) return;
  professionalServiceOrderMarkersById.clear();
  professionalMapDemo.serviceOrders.forEach(order => {
    const marker = L.circleMarker([order.latitude, order.longitude], {
      radius: 8,
      color: "#185f8e",
      weight: 2,
      fillColor: "#398ec2",
      fillOpacity: .82
    }).bindPopup(`
      <strong>Ordem de serviço ${escapeProfessionalMapText(order.id)} (exemplo)</strong><br>
      ${escapeProfessionalMapText(order.titulo)}<br>
      ${escapeProfessionalMapText(order.descricao)}<br>
      ${escapeProfessionalMapText(order.bairro)}<br>
      Status: ${escapeProfessionalMapText(order.status)}
    `).addTo(serviceOrderMarkerLayer);
    professionalServiceOrderMarkersById.set(order.id, marker);
  });
}

// Liga a busca, o estado das camadas, o recolhimento da legenda e a ação “Ver todas”.
function setupProfessionalMapEvents() {
  document.getElementById("treeSearch").addEventListener("input", () => renderProfessionalActiveList());

  document.getElementById("showAllTrees").addEventListener("click", () => {
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

  // Permite fechar a ficha pelo X, por clique no fundo ou pela tecla Escape.
  document.getElementById("closeProfessionalTreeModal").addEventListener("click", closeProfessionalTreeDetails);
  document.getElementById("professionalTreeModal").addEventListener("click", event => {
    if (event.target.id === "professionalTreeModal") closeProfessionalTreeDetails();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeProfessionalTreeDetails();
  });
}

// Consulta a ficha completa pelo ID real, sem inserir dados ou históricos fictícios.
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
    // Não reabre o modal caso o usuário tenha fechado enquanto carregava.
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

// Fecha a ficha da árvore selecionada.
function closeProfessionalTreeDetails() {
  const modal = document.getElementById("professionalTreeModal");
  if (modal) modal.hidden = true;
}

// Atualiza a mensagem curta na parte inferior do mapa e depois restaura a orientação.
function updateProfessionalMapToast(message) {
  const toast = document.getElementById("professionalMapToast");
  toast.innerHTML = `<i class="bi bi-geo-alt" aria-hidden="true"></i><span>${escapeProfessionalMapText(message)}</span>`;
  window.clearTimeout(updateProfessionalMapToast.timeoutId);
  updateProfessionalMapToast.timeoutId = window.setTimeout(() => {
    toast.innerHTML = '<i class="bi bi-info-circle" aria-hidden="true"></i><span>Clique em um marcador para consultar os dados da árvore.</span>';
  }, 2500);
}
