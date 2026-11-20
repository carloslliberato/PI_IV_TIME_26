// feito por Gabrielle, editado por Sophia
// ===============================
// Arboriza - Mapa público com árvores e ocorrências reais da API
// ===============================

const MUNICIPIO_IDS_PARA_CHAVE = {
  "6ae666a7680e8a4330a1ab66": "campinas",
  "6ae7854cb9962492d01e6af6": "hortolandia",
  "6ae7856ab9962492d01e6af7": "sumare"
};
let trees = [];
let publicOccurrences = [];

// Converte o risco vindo da API de árvores para texto legível
function riscoPublico(valor) {
  return ({ BAIXO: "Baixo", MODERADO: "Moderado", ALTO: "Alto", CRITICO: "Crítico" })[valor] || "Não informado";
}

// Retorna o município selecionado no filtro do topo
function municipioPublicoAtual() {
  return document.getElementById("municipioSelect").value;
}

// Retorna as árvores do município selecionado
function arvoresDoMunicipio() {
  const municipioId = municipioPublicoAtual();
  return trees.filter(arvore => arvore.municipioId === municipioId);
}

// Busca as árvores reais cadastradas no MongoDB via GET /api/arvores
async function carregarArvoresPublicas() {
  const resposta = await fetch("/api/arvores");
  if (!resposta.ok) throw new Error(`Falha ao consultar árvores (HTTP ${resposta.status})`);
  const dados = await resposta.json();
  if (!Array.isArray(dados)) throw new Error("Resposta inesperada da API de árvores");
  trees = dados
    .filter(a => a.ativa !== false && MUNICIPIO_IDS_PARA_CHAVE[a.municipioId])
    .filter(a => Number.isFinite(a.latitude) && Number.isFinite(a.longitude)
      && Math.abs(a.latitude) <= 90 && Math.abs(a.longitude) <= 180)
    .map(a => ({
      id: String(a.id), nome: a.nomePopular || a.especie || "Árvore",
      especie: a.nomeCientifico || a.especie || "Não informado",
      bairro: a.bairro || "Não informado", endereco: a.endereco || "Não informado",
      lat: a.latitude, lng: a.longitude, risco: riscoPublico(a.risco),
      municipioId: MUNICIPIO_IDS_PARA_CHAVE[a.municipioId],
      frutifera: Boolean(a.frutifera), manutencao: Boolean(a.manutencao),
      floracao: Boolean(a.floracao), clima: Boolean(a.alertaClimatico)
    }));
  applyPublicFilters();
}

// Caso uma ocorrência antiga não tenha latitude/longitude, posiciona pelo bairro em Campinas
function coordenadasFallbackPublico(bairro, municipioId) {
  const b = String(bairro || "").toLowerCase();
  if (municipioId === "campinas") {
    if (b.includes("taquaral")) return { lat: -22.8754, lng: -47.0475 };
    if (b.includes("cambu")) return { lat: -22.8942, lng: -47.0531 };
    if (b.includes("chapad")) return { lat: -22.8895, lng: -47.0742 };
    if (b.includes("barao") || b.includes("barão")) return { lat: -22.8228, lng: -47.0805 };
  }
  if (municipioId === "sumare") return { lat: -22.8214, lng: -47.2660 };
  if (municipioId === "hortolandia") return { lat: -22.8583, lng: -47.2200 };
  return { lat: -22.9056, lng: -47.0608 };
}

// Busca as ocorrências reais cadastradas no MongoDB via GET /api/ocorrencias
async function carregarOcorrenciasPublicas() {
  try {
    const resposta = await fetch("/api/ocorrencias");
    if (!resposta.ok) throw new Error(`Falha ao consultar ocorrências (HTTP ${resposta.status})`);

    const dados = await resposta.json();
    if (!Array.isArray(dados)) return;

    publicOccurrences = dados.map(oco => {
      const bairro = oco.bairro || "Centro";
      const municipioId = MUNICIPIO_IDS_PARA_CHAVE[oco.municipioId] || String(oco.municipioId || "campinas").toLowerCase();
      const fallback = coordenadasFallbackPublico(bairro, municipioId);
      const temCoords = Number.isFinite(oco.latitude) && Number.isFinite(oco.longitude);

      return {
        id: String(oco.protocolo || oco.id || oco._id),
        municipioId,
        lat: temCoords ? oco.latitude : fallback.lat,
        lng: temCoords ? oco.longitude : fallback.lng,
        tipo: oco.tipoProblema || "Ocorrência arbórea",
        descricao: oco.descricao || "Sem descrição informada.",
        bairro: bairro,
        endereco: oco.localizacao || "Endereço não informado",
        status: oco.status || "Recebida"
      };
    });
  } catch (erro) {
    console.error("Erro ao carregar ocorrências públicas:", erro);
    publicOccurrences = [];
  }
}

// Coordenadas centrais dos municípios suportados no mapa
const municipalityCenters = {
  campinas: { name: "Campinas - SP", lat: -22.9056, lng: -47.0608, zoom: 13 },
  hortolandia: { name: "Hortolândia - SP", lat: -22.8583, lng: -47.2200, zoom: 13 },
  sumare: { name: "Sumaré - SP", lat: -22.8214, lng: -47.2660, zoom: 13 }
};

async function carregarMunicipioDaSessao() {
  try {
    const resposta = await fetch("/api/contas/sessao", { credentials: "same-origin" });
    if (!resposta.ok) return;
    const sessao = await resposta.json();
    const municipio = MUNICIPIO_IDS_PARA_CHAVE[sessao.municipioId];
    if (!municipio || !municipalityCenters[municipio]) return;

    const seletor = document.getElementById("municipioSelect");
    if (seletor.dataset.userSelected === "true") return;
    seletor.value = municipio;
    const dadosMunicipio = municipalityCenters[municipio];
    if (map) map.flyTo([dadosMunicipio.lat, dadosMunicipio.lng], dadosMunicipio.zoom, { duration: 0.8 });
    updateHeaderForMunicipality(dadosMunicipio.name);
    applyPublicFilters();
    if (document.getElementById("occurrencesLayer").checked) {
      renderPublicOccurrencesOnMap();
    }
  } catch (erro) {
    console.warn("Não foi possível carregar o município da sessão:", erro);
  }
}

// Variáveis globais do mapa Leaflet e das camadas de marcadores
let map;
let markerLayer;
let occurrenceLayer;
let markersById = new Map();

// Inicializa o mapa, os eventos e carrega árvores e ocorrências reais
function initializePublicMap() {
  initMap();
  renderTreeList([]);
  setupEvents();
  carregarMunicipioDaSessao();
  carregarOcorrenciasPublicas();
  carregarArvoresPublicas().catch(erro => {
    console.error("Não foi possível carregar o mapa público:", erro);
    trees = [];
    applyPublicFilters();
    const toast = document.getElementById("mapToast");
    if (toast) toast.textContent = "Não foi possível carregar as árvores do banco.";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePublicMap, { once: true });
} else {
  initializePublicMap();
}

// Cria o mapa Leaflet e configura as camadas de árvores e ocorrências
function initMap() {
  const mapElement = document.getElementById("map");

  if (typeof L === "undefined") {
    mapElement.innerHTML = `
      <div class="d-flex align-items-center justify-content-center h-100 p-4 text-center">
        <div>
          <i class="bi bi-map fs-1 text-success"></i>
          <h5 class="mt-3">Mapa indisponível</h5>
          <p class="text-secondary mb-0">
            Não foi possível carregar o mapa. Verifique a conexão com a internet e recarregue a página.
          </p>
        </div>
      </div>
    `;
    return;
  }

  markerLayer = L.layerGroup();
  occurrenceLayer = L.layerGroup();
  map = L.map("map", { zoomControl: false }).setView(
    [municipalityCenters[municipioPublicoAtual()].lat, municipalityCenters[municipioPublicoAtual()].lng],
    municipalityCenters[municipioPublicoAtual()].zoom
  );
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    {
      attribution:
        "Tiles © Esri — Sources: Esri, OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(map);

  L.control.zoom({ position: "topleft" }).addTo(map);

  markerLayer.addTo(map);
  buildTreeMarkers();
}

// Converte o nível de risco em classe CSS para colorir o pino
function riskClass(risco) {
  const mapClass = {
    "Baixo": "low",
    "Médio": "medium",
    "Moderado": "medium",
    "Alto": "high",
    "Crítico": "critical"
  };
  return mapClass[risco] || "unknown";
}

// Cria o ícone circular colorido da árvore no mapa
function makeTreeIcon(risco) {
  return L.divIcon({
    className: "",
    html: `<div class="tree-pin ${riskClass(risco)}"><i class="bi bi-tree-fill"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -15]
  });
}

// Desenha os pinos das árvores no mapa e abre a ficha detalhada ao clicar
function buildTreeMarkers(source = trees) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  markersById.clear();

  source.forEach(tree => {
    const marker = L.marker([tree.lat, tree.lng], {
      icon: makeTreeIcon(tree.risco)
    });

    marker.bindPopup(`
      <div class="popup-card">
        <div class="popup-id">ID: ${escapeTreeDetail(tree.id)}</div>
        <div class="popup-name">${escapeTreeDetail(tree.nome)}</div>
        <div class="popup-species">${escapeTreeDetail(tree.especie)}</div>
        <div class="popup-address">
          ${escapeTreeDetail(tree.endereco)}<br>
          ${escapeTreeDetail(tree.bairro)} - ${escapeTreeDetail(municipalityCenters[municipioPublicoAtual()].name)}
        </div>
        <div class="popup-link" data-tree-id="${escapeTreeDetail(tree.id)}">
          Ver detalhes <span aria-hidden="true">→</span>
        </div>
      </div>
    `);

    marker.on("popupopen", event => {
      const link = event.popup.getElement()?.querySelector("[data-tree-id]");
      if (link) link.addEventListener("click", () => showTreeDetails(tree));
    });

    marker.addTo(markerLayer);
    markersById.set(tree.id, marker);
  });
}

// Desenha a lista lateral de árvores na coluna direita
function renderTreeList(list) {
  const container = document.getElementById("treeList");

  if (!list.length) {
    container.innerHTML = `
      <div class="alert alert-light border">
        Nenhuma árvore cadastrada para esta busca ou município.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(tree => `
    <article class="tree-card" data-tree-card="${escapeTreeDetail(tree.id)}">
      <div class="tree-photo d-flex align-items-center justify-content-center bg-success-subtle" aria-hidden="true">
        <i class="bi bi-tree-fill fs-3 text-success"></i>
      </div>
      <div class="tree-info">
        <div class="tree-top">
          <h3 class="tree-name">${escapeTreeDetail(tree.nome)}</h3>
          <span class="tree-badge badge-${riskClass(tree.risco)}">
            <i class="bi bi-tree-fill me-1"></i>${escapeTreeDetail(tree.risco)}
          </span>
        </div>
        <div class="tree-meta">ID: ${escapeTreeDetail(tree.id)}</div>
        <div class="tree-address">${escapeTreeDetail(tree.endereco)}</div>
        <div class="tree-distance">${escapeTreeDetail(tree.distancia || "")}</div>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-tree-card]").forEach(card => {
    card.addEventListener("click", () => {
      const tree = trees.find(t => t.id === card.dataset.treeCard);
      if (!tree) return;
      if (map) map.flyTo([tree.lat, tree.lng], 16, { duration: 0.8 });
      const marker = markersById.get(tree.id);
      if (marker) marker.openPopup();
    });
  });
}

// Configura os eventos de busca, troca de município, camadas e filtros do mapa público
function setupEvents() {
  document.getElementById("municipioSelect").addEventListener("change", event => {
    event.target.dataset.userSelected = "true";
    const selected = municipalityCenters[event.target.value];
    if (!selected) return;
    if (map) map.flyTo([selected.lat, selected.lng], selected.zoom, { duration: 0.8 });
    updateHeaderForMunicipality(selected.name);
    applyPublicFilters();
    if (document.getElementById("occurrencesLayer").checked) {
      renderPublicOccurrencesOnMap();
    }
  });

  document.getElementById("searchInput").addEventListener("input", applyPublicFilters);

  document.getElementById("btnVerTodas").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    clearFilterInputs();
    applyPublicFilters();
    const registros = arvoresDoMunicipio();
    if (map && registros.length) {
      map.fitBounds(registros.map(tree => [tree.lat, tree.lng]), { padding: [50, 50], maxZoom: 16 });
    }
  });

  document.getElementById("treesLayer").addEventListener("change", event => {
    if (!event.target.checked || !map || !markerLayer) return;
    map.removeLayer(occurrenceLayer);
    occurrenceLayer.clearLayers();
    markerLayer.addTo(map);
    document.getElementById("treeLegend").classList.remove("d-none");
    document.getElementById("occurrenceLegend").classList.add("d-none");
    document.querySelector("#mapToast span").textContent = "Clique em um marcador para ver as informações da árvore.";
  });

  // A seleção por rádio garante que somente uma camada fique ativa por vez.
  document.getElementById("occurrencesLayer").addEventListener("change", async event => {
    if (!event.target.checked || !map || !occurrenceLayer) return;
    map.removeLayer(markerLayer);
    await carregarOcorrenciasPublicas();
    occurrenceLayer.addTo(map);
    renderPublicOccurrencesOnMap();
    document.getElementById("treeLegend").classList.add("d-none");
    document.getElementById("occurrenceLegend").classList.remove("d-none");
    document.querySelector("#mapToast span").textContent = "Ocorrências registradas neste município.";
  });

  document.getElementById("toggleLayers").addEventListener("click", () => {
    const body = document.getElementById("layerBody"), icon = document.querySelector("#toggleLayers i");
    body.classList.toggle("d-none");
    icon.className = body.classList.contains("d-none") ? "bi bi-chevron-down" : "bi bi-chevron-up";
  });

  const filters = document.getElementById("publicFilters"), filterButton = document.getElementById("btnFilters");
  filterButton.addEventListener("click", () => {
    const open = filters.classList.contains("d-none");
    filters.classList.toggle("d-none", !open);
    filterButton.setAttribute("aria-expanded", String(open));
    document.querySelector(".filter-chevron").className = open ? "bi bi-chevron-up filter-chevron" : "bi bi-chevron-down filter-chevron";
  });

  document.getElementById("applyFilters").addEventListener("click", () => {
    applyPublicFilters();
    filters.classList.add("d-none");
    filterButton.setAttribute("aria-expanded", "false");
    document.querySelector(".filter-chevron").className = "bi bi-chevron-down filter-chevron";
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    clearFilterInputs();
    applyPublicFilters();
  });

  ["filterFruitBearing", "filterRisk", "filterMaintenance", "filterFlowering", "filterWeather"].forEach(id =>
    document.getElementById(id).addEventListener("change", applyPublicFilters)
  );

  const modal = new bootstrap.Modal(document.getElementById("publicActionModal"));
  const title = document.getElementById("publicActionTitle"), body = document.getElementById("publicActionBody"), submit = document.getElementById("publicActionSubmit");
  let current = "";
  const forms = {
    signup: { title: "Faça seu cadastro", button: "Criar cadastro", html: `<p class="text-secondary small">Cadastre-se para participar do portal público.</p><label class="form-label">Nome completo</label><input class="form-control mb-3" name="nome" required><label class="form-label">E-mail</label><input class="form-control" name="email" type="email" required>` },
    call: { title: "Abrir chamado", button: "Enviar chamado", html: `<p class="text-secondary small">Informe uma situação relacionada à arborização urbana.</p><label class="form-label">Tipo de ocorrência</label><select class="form-select mb-3" name="tipo"><option>Galho quebrado</option><option>Árvore com risco</option><option>Necessidade de poda</option><option>Árvore caída</option><option>Outro</option></select><label class="form-label">Endereço ou local</label><input class="form-control mb-3" name="local" required><label class="form-label">Descrição</label><textarea class="form-control" name="descricao" rows="3" required></textarea>` },
  };
  function openAction(key) { current = key; title.textContent = forms[key].title; body.innerHTML = forms[key].html; submit.textContent = forms[key].button; modal.show(); }
  const navContact = document.getElementById("navContact");
  if (navContact) navContact.addEventListener("click", e => { e.preventDefault(); openAction("contact"); });
  document.getElementById("publicActionForm").addEventListener("submit", e => {
    e.preventDefault();
    alert(({ signup: "Cadastro", call: "Chamado", contact: "Mensagem", login: "Login" })[current] + " em modo demonstrativo.");
    e.target.reset();
    modal.hide();
  });
}

// Limpa os filtros de características das árvores
function clearFilterInputs() {
  document.getElementById("filterFruitBearing").checked = false;
  document.getElementById("filterRisk").value = "";
  document.getElementById("filterMaintenance").checked = false;
  document.getElementById("filterFlowering").checked = false;
  document.getElementById("filterWeather").checked = false;
}

// Filtra as árvores na lista e no mapa
function applyPublicFilters() {
  const term = document.getElementById("searchInput").value.trim().toLowerCase(),
    fruit = document.getElementById("filterFruitBearing").checked,
    risk = document.getElementById("filterRisk").value,
    maintenance = document.getElementById("filterMaintenance").checked,
    flowering = document.getElementById("filterFlowering").checked,
    weather = document.getElementById("filterWeather").checked;
  const filtered = arvoresDoMunicipio().filter(tree => {
    const textMatch = !term || [tree.nome, tree.especie, tree.id, tree.bairro, tree.endereco].some(v => v.toLowerCase().includes(term));
    return textMatch && (!fruit || tree.frutifera) && (!risk || tree.risco === risk) && (!maintenance || tree.manutencao) && (!flowering || tree.floracao) && (!weather || tree.clima);
  });
  renderTreeList(filtered);
  buildTreeMarkers(filtered);
  if (map && filtered.length === 1) map.flyTo([filtered[0].lat, filtered[0].lng], 16, { duration: 0.8 });
}

// Desenha no mapa público os marcadores vermelhos das ocorrências reais do banco de dados
function renderPublicOccurrencesOnMap() {
  if (!occurrenceLayer) return;
  occurrenceLayer.clearLayers();

  const municipioSelecionado = municipioPublicoAtual();
  const ocorrenciasFiltradas = publicOccurrences.filter(
    oco => !municipioSelecionado || oco.municipioId === municipioSelecionado
  );

  ocorrenciasFiltradas.forEach(oco => {
    const occurrenceMarker = L.circleMarker([oco.lat, oco.lng], {
      radius: 9,
      color: "#8c2c22",
      weight: 2,
      fillColor: "#d84836",
      fillOpacity: 0.82
    }).bindPopup(`
      <strong>Ocorrência #${escapeTreeDetail(oco.id)}</strong><br>
      <b>Tipo:</b> ${escapeTreeDetail(oco.tipo)}<br>
      ${escapeTreeDetail(oco.descricao)}<br>
      <b>Local:</b> ${escapeTreeDetail(oco.endereco)} (${escapeTreeDetail(oco.bairro)})<br>
      <b>Status:</b> ${escapeTreeDetail(oco.status)}
    `);

    occurrenceMarker.addTo(occurrenceLayer);
  });
}

// Atualiza o aviso na barra inferior ao trocar de município
function updateHeaderForMunicipality(name) {
  const toast = document.getElementById("mapToast");
  toast.innerHTML = `<i class="bi bi-geo-alt"></i><span>Mapa atualizado para <strong>${name}</strong>.</span>`;
  setTimeout(() => {
    toast.innerHTML = `<i class="bi bi-info-circle"></i><span>Clique em um marcador para ver as informações da árvore.</span>`;
  }, 2500);
}

// Escapa textos dinâmicos para evitar quebra de HTML nos pop-ups
function escapeTreeDetail(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Abre o modal com a ficha detalhada de uma árvore ao clicar no pop-up
async function showTreeDetails(tree) {
  const modalElement = document.getElementById("treeDetailsModal");
  const body = document.getElementById("treeDetailsBody");
  document.getElementById("treeDetailsId").textContent = `ID ${tree.id}`;
  document.getElementById("treeDetailsTitle").textContent = `Ficha da árvore — ${tree.nome}`;
  body.textContent = "Carregando ficha...";
  bootstrap.Modal.getOrCreateInstance(modalElement).show();

  try {
    const resposta = await fetch(`/api/arvores/${encodeURIComponent(tree.id)}`);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const arvore = await resposta.json();
    const t = escapeTreeDetail;
    const data = valor => {
      if (!valor) return "Não registrada";
      const d = new Date(valor);
      return Number.isNaN(d.getTime()) ? "Não registrada" : d.toLocaleDateString("pt-BR");
    };
    const campo = (nome, valor, amplo = false) => `
      <div class="tree-detail-field ${amplo ? "tree-detail-field-wide" : ""}">
        <span>${t(nome)}</span><strong>${t(valor ?? "Não informado")}</strong>
      </div>`;
    document.getElementById("treeDetailsTitle").textContent =
      `Ficha da árvore — ${arvore.nomePopular || arvore.especie || "Árvore"}`;
    body.innerHTML = `
      <section class="tree-details-identity" aria-label="Identificação da árvore">
        <div><span>Nome popular</span><strong>${t(arvore.nomePopular)}</strong></div>
        <div><span>Nome científico</span><strong>${t(arvore.nomeCientifico)}</strong></div>
      </section>
      <h3 class="tree-details-section-title">Localização e características</h3>
      <div class="tree-details-grid">
        ${campo("Espécie", arvore.especie)}
        ${campo("Localização", `${arvore.endereco || "Não informado"}, ${arvore.bairro || "Não informado"}`, true)}
        ${campo("Idade estimada", arvore.idade)}
        ${campo("Altura", arvore.alturaMetros == null ? null : `${arvore.alturaMetros} m`)}
        ${campo("Diâmetro", arvore.diametroCm == null ? null : `${arvore.diametroCm} cm`)}
        ${campo("Estado", arvore.estado)}
        ${campo("Nível de risco", riscoPublico(arvore.risco))}
        ${campo("Última vistoria", data(arvore.ultimaInspecao))}
        ${campo("Última poda", data(arvore.ultimaPoda))}
        ${campo("Próxima manutenção", data(arvore.proximaManutencao), true)}
      </div>
      <h3 class="tree-details-section-title">Fotos e histórico</h3>
      <p>Fotos e histórico individual aguardam integração com a API.</p>
    `;
  } catch (erro) {
    console.error("Falha ao abrir ficha pública:", erro);
    body.textContent = "Não foi possível consultar esta ficha.";
  }
}
