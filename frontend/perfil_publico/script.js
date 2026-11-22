// Autor: Gabrielle Mota

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
let publicOccurrencesLoaded = false; // Indica se a primeira consulta de ocorrências terminou.
let publicLayerTransition = 0;
let activePublicLayer = "trees";

// Converte o risco vindo da API de árvores para texto legível
function riscoPublico(valor) {
  return ({ BAIXO: "Baixo", MODERADO: "Moderado", ALTO: "Alto", CRITICO: "Crítico" })[valor] || "Não informado";
}

// Retorna o município selecionado no filtro do topo
function municipioPublicoAtual() {
  return document.getElementById("municipioSelect").value;
}

function temCoordenadasValidas(arvore) {
  return Number.isFinite(arvore.lat) && Number.isFinite(arvore.lng)
    && Math.abs(arvore.lat) <= 90 && Math.abs(arvore.lng) <= 180;
}

function normalizarBuscaPublica(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function correspondeBuscaPublica(termo, valores) {
  return !termo || valores.some(valor => normalizarBuscaPublica(valor).includes(termo));
}

// Retorna as árvores do município selecionado
function arvoresDoMunicipio() {
  const municipioId = municipioPublicoAtual();
  return trees.filter(arvore => arvore.municipioId === municipioId);
}

// Retorna as ocorrências do município selecionado, com ou sem coordenadas para o mapa.
function ocorrenciasDoMunicipio() {
  const municipioId = municipioPublicoAtual();
  return publicOccurrences.filter(ocorrencia => ocorrencia.municipioId === municipioId);
}

// Busca as árvores reais cadastradas no MongoDB via GET /api/arvores
async function carregarArvoresPublicas() {
  const resposta = await fetch("/api/arvores");
  if (!resposta.ok) throw new Error(`Falha ao consultar árvores (HTTP ${resposta.status})`);
  const dados = await resposta.json();
  if (!Array.isArray(dados)) throw new Error("Resposta inesperada da API de árvores");
  trees = dados
    .map(a => ({
      id: String(a.id), codigoArv: a.codigoArv || "", nome: a.nomePopular || a.especie || "Árvore",
      nomePopular: a.nomePopular || "",
      especie: a.especie || "",
      nomeCientifico: a.nomeCientifico || "",
      bairro: a.bairro || "Não informado", endereco: a.endereco || "Não informado",
      lat: a.latitude == null ? null : Number(a.latitude),
      lng: a.longitude == null ? null : Number(a.longitude),
      risco: riscoPublico(a.risco),
      municipioId: MUNICIPIO_IDS_PARA_CHAVE[String(a.municipioId || "").toLowerCase()],
      frutifera: Boolean(a.frutifera), manutencao: Boolean(a.manutencao),
      floracao: Boolean(a.floracao), clima: Boolean(a.alertaClimatico)
    }))
    .filter(arvore => Boolean(arvore.municipioId));
  applyPublicFilters();
}

// Busca as ocorrências reais cadastradas no MongoDB via GET /api/ocorrencias
async function carregarOcorrenciasPublicas() {
  try {
    const resposta = await fetch("/api/ocorrencias");
    if (!resposta.ok) throw new Error(`Falha ao consultar ocorrências (HTTP ${resposta.status})`);

    const dados = await resposta.json();
    if (!Array.isArray(dados)) {
      throw new Error("Resposta inesperada da API de ocorrências");
    }

    // Mantém todas as ocorrências para a lista; coordenadas serão exigidas apenas para os pinos.
    publicOccurrences = dados.map(oco => {
      const bairro = oco.bairro || "Centro";
      const municipioId = MUNICIPIO_IDS_PARA_CHAVE[oco.municipioId] || String(oco.municipioId || "campinas").toLowerCase();

      return {
        id: String(oco.protocolo || oco.id || oco._id),
        municipioId,
        arvoreId: String(oco.arvoreId || ""),
        nomePopular: oco.nomePopular || "",
        especie: oco.especie || oco.nomeCientifico || "",
        nomeCientifico: oco.nomeCientifico || "",
        lat: oco.latitude,
        lng: oco.longitude,
        tipo: oco.tipoProblema || "Ocorrência arbórea",
        descricao: oco.descricao || "Sem descrição informada.",
        bairro: bairro,
        endereco: [oco.localizacao, oco.numero].filter(Boolean).join(", ") || "Endereço não informado",
        status: oco.status || "Recebida",
        prioridade: oco.prioridade || oco.urgencia || "Média"
      };
    });
    // Libera a lista lateral e a atualiza se a camada estiver selecionada.
    publicOccurrencesLoaded = true;
    if (activePublicLayer === "occurrences") {
      applyPublicFilters();
    }
  } catch (erro) {
    console.error("Erro ao carregar ocorrências públicas:", erro);
    publicOccurrences = [];
    // Finaliza o estado de carregamento para a lista mostrar o estado vazio, em vez de ficar presa.
    publicOccurrencesLoaded = true;
    if (activePublicLayer === "occurrences") {
      applyPublicFilters();
    }
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
    if (activePublicLayer === "occurrences") {
      applyPublicFilters();
      renderPublicOccurrencesOnMap();
    } else {
      await carregarArvoresPublicas();
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
let occurrenceMarkersById = new Map();

// Inicializa o mapa, os eventos e carrega árvores e ocorrências reais
function initializePublicMap() {
  initMap();
  renderTreeList([]);
  setupEvents();
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
        "Tiles © Esri — Sources: Esri, <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap contributors</a>; geocoding © OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(map);

  L.control.zoom({ position: "topleft" }).addTo(map);

  markerLayer.addTo(map);
  buildTreeMarkers();
}

// Converte o nível de risco em classe CSS para colorir o pino
function riskClass(risco) {
  const normalized = String(risco || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  if (["baixo", "baixa"].includes(normalized)) return "low";
  if (["medio", "media", "moderado", "moderada"].includes(normalized)) return "medium";
  if (["alto", "alta"].includes(normalized)) return "high";
  if (["critico", "critica"].includes(normalized)) return "critical";
  return "unknown";
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
    if (!temCoordenadasValidas(tree)) return;
    const marker = L.marker([tree.lat, tree.lng], {
      icon: makeTreeIcon(tree.risco)
    });

    marker.bindPopup(`
      <div class="popup-card">
        <div class="popup-id">${escapeTreeDetail(codigoArvorePublico(tree))}</div>
        <div class="popup-name">${escapeTreeDetail(tree.nome)}</div>
        <div class="popup-species">${escapeTreeDetail(tree.especie)}</div>
        <div class="popup-address">
          ${escapeTreeDetail(tree.endereco)}<br>
          ${escapeTreeDetail(tree.bairro)} - ${escapeTreeDetail(municipalityCenters[municipioPublicoAtual()].name)}
        </div>
        <div class="popup-risk ${riskClass(tree.risco)}">Risco ${escapeTreeDetail(tree.risco)}</div>
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
        <div class="tree-meta">${escapeTreeDetail(codigoArvorePublico(tree))}</div>
        <div class="tree-address">${escapeTreeDetail(tree.endereco)}</div>
        <div class="tree-distance">${escapeTreeDetail(tree.distancia || "")}</div>
      </div>
    </article>
  `).join("");

  container.querySelectorAll("[data-tree-card]").forEach(card => {
    card.addEventListener("click", () => {
      const tree = trees.find(t => t.id === card.dataset.treeCard);
      if (!tree) return;
      if (!temCoordenadasValidas(tree)) {
        const aviso = document.querySelector("#mapToast span");
        if (aviso) aviso.textContent = "Esta árvore não possui localização disponível no mapa.";
        return;
      }
      if (map) map.flyTo([tree.lat, tree.lng], 16, { duration: 0.8 });
      const marker = markersById.get(tree.id);
      if (marker) marker.openPopup();
    });
  });
}

// Desenha na lateral as ocorrências do município, inclusive as que ainda não têm pino no mapa.
function renderOccurrenceList(list, carregando = false) {
  const container = document.getElementById("treeList");

  // Informa que a API está sendo consultada sem voltar a exibir os cartões de árvores.
  if (carregando) {
    container.innerHTML = `
      <div class="alert alert-light border">Carregando ocorrências do município...</div>
    `;
    return;
  }

  // Mostra um estado vazio claro quando o município não possui ocorrências.
  if (!list.length) {
    container.innerHTML = `
      <div class="alert alert-light border">
        Nenhuma ocorrência registrada para este município.
      </div>
    `;
    return;
  }

  // Monta cartões com os dados principais de cada ocorrência.
  container.innerHTML = list.map(ocorrencia => `
    <article class="tree-card occurrence-card" data-occurrence-card="${escapeTreeDetail(ocorrencia.id)}">
      <div class="tree-photo occurrence-photo d-flex align-items-center justify-content-center" aria-hidden="true">
        <i class="bi bi-exclamation-triangle-fill fs-3"></i>
      </div>
      <div class="tree-info">
        <div class="tree-top">
          <h3 class="tree-name">${escapeTreeDetail(ocorrencia.tipo)}</h3>
          <span class="tree-badge badge-${riskClass(ocorrencia.prioridade)}">${escapeTreeDetail(ocorrencia.prioridade)}</span>
        </div>
        <div class="tree-meta">${escapeTreeDetail(ocorrencia.status)} · Identificação: ${escapeTreeDetail(ocorrencia.id)}</div>
        <div class="tree-address">${escapeTreeDetail(ocorrencia.endereco)} · ${escapeTreeDetail(ocorrencia.bairro)}</div>
        <div class="tree-distance">${escapeTreeDetail(ocorrencia.descricao)}</div>
      </div>
    </article>
  `).join("");

  // Ao clicar em uma ocorrência com coordenadas, leva o mapa ao marcador correspondente.
  container.querySelectorAll("[data-occurrence-card]").forEach(card => {
    card.addEventListener("click", () => {
      const ocorrencia = publicOccurrences.find(
        item => item.id === card.dataset.occurrenceCard);
      if (!ocorrencia || !Number.isFinite(ocorrencia.lat) || !Number.isFinite(ocorrencia.lng)) return;
      if (map) map.flyTo([ocorrencia.lat, ocorrencia.lng], 16, { duration: 0.8 });
      occurrenceMarkersById.get(ocorrencia.id)?.openPopup();
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
    if (activePublicLayer === "trees") {
      carregarArvoresPublicas().catch(erro => {
        console.error("Não foi possível carregar as árvores do município:", erro);
        renderTreeList([]);
      });
      return;
    }
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
    if (activePublicLayer === "occurrences") {
      // Na camada de ocorrências, enquadra todos os pinos localizáveis do município.
      const registros = ocorrenciasDoMunicipio()
        .filter(oco => Number.isFinite(oco.lat) && Number.isFinite(oco.lng));
      if (map && registros.length) {
        map.fitBounds(registros.map(oco => [oco.lat, oco.lng]), { padding: [50, 50], maxZoom: 16 });
      }
      return;
    }

    // Na camada de árvores, mantém o enquadramento de todas as árvores do município.
    const registros = arvoresDoMunicipio().filter(temCoordenadasValidas);
    if (map && registros.length) {
      map.fitBounds(registros.map(tree => [tree.lat, tree.lng]), { padding: [50, 50], maxZoom: 16 });
    }
  });

  document.getElementById("treesLayer").addEventListener("change", event => {
    if (!event.target.checked) return;
    activePublicLayer = "trees";
    publicLayerTransition += 1;
    // Atualiza primeiro a lateral: ela não depende do mapa nem da resposta da API.
    document.getElementById("ocorrencias").textContent = "Árvores em destaque";
    try {
      renderTreeLayer();
    } catch (erro) {
      console.error("Falha ao aplicar filtros às árvores; exibindo a lista do município:", erro);
      renderTreeList(arvoresDoMunicipio());
    }

    // Mantém o estado real dos rádios alinhado com a camada selecionada.
    document.getElementById("occurrencesLayer").checked = false;
    if (map && markerLayer && occurrenceLayer) {
      map.removeLayer(occurrenceLayer);
      occurrenceLayer.clearLayers();
      markerLayer.addTo(map);
    }
    document.getElementById("treeLegend").classList.remove("d-none");
    const occurrenceLegend = document.getElementById("occurrenceLegend");
    if (occurrenceLegend) occurrenceLegend.classList.add("d-none");
    const avisoMapa = document.querySelector("#mapToast span");
    if (avisoMapa) avisoMapa.textContent = "Clique em um marcador para ver as informações da árvore.";
    carregarArvoresPublicas().catch(erro => {
      console.error("Não foi possível atualizar as árvores do município:", erro);
      renderTreeList([]);
    });
  });

  // A seleção por rádio garante que somente uma camada fique ativa por vez.
  document.getElementById("occurrencesLayer").addEventListener("change", async event => {
    if (!event.target.checked) return;
    activePublicLayer = "occurrences";
    const transition = ++publicLayerTransition;
    document.getElementById("treesLayer").checked = false;

    // Atualiza o painel imediatamente, sem esperar a resposta da API.
    document.getElementById("ocorrencias").textContent = "Ocorrências no município";
    renderOccurrenceList(
      ocorrenciasDoMunicipio(),
      !publicOccurrencesLoaded && publicOccurrences.length === 0);
    if (map && markerLayer) map.removeLayer(markerLayer);
    await carregarOcorrenciasPublicas();
    if (transition !== publicLayerTransition || activePublicLayer !== "occurrences") return;
    if (!map || !occurrenceLayer) return;
    occurrenceLayer.addTo(map);
    renderPublicOccurrencesOnMap();
    document.getElementById("treeLegend").classList.add("d-none");
    document.getElementById("occurrenceLegend").classList.remove("d-none");
    document.querySelector("#mapToast span").textContent = "Ocorrências registradas neste município.";
    applyPublicFilters();
  });

  document.getElementById("toggleLayers").addEventListener("click", () => {
    const body = document.getElementById("layerBody"), icon = document.querySelector("#toggleLayers i");
    body.classList.toggle("d-none");
    icon.className = body.classList.contains("d-none") ? "bi bi-chevron-down" : "bi bi-chevron-up";
  });

  const filters = document.getElementById("publicFilters"), filterButton = document.getElementById("btnFilters");
  if (filters && filterButton) {
    filterButton.addEventListener("click", () => {
      const open = filters.classList.contains("d-none");
      filters.classList.toggle("d-none", !open);
      filterButton.setAttribute("aria-expanded", String(open));
      const chevron = document.querySelector(".filter-chevron");
      if (chevron) chevron.className = open ? "bi bi-chevron-up filter-chevron" : "bi bi-chevron-down filter-chevron";
    });
  }

  const applyFiltersButton = document.getElementById("applyFilters");
  if (applyFiltersButton && filters && filterButton) applyFiltersButton.addEventListener("click", () => {
    applyPublicFilters();
    filters.classList.add("d-none");
    filterButton.setAttribute("aria-expanded", "false");
    const chevron = document.querySelector(".filter-chevron");
    if (chevron) chevron.className = "bi bi-chevron-down filter-chevron";
  });

  const clearFiltersButton = document.getElementById("clearFilters");
  if (clearFiltersButton) clearFiltersButton.addEventListener("click", () => {
    clearFilterInputs();
    applyPublicFilters();
  });

  ["filterFruitBearing", "filterRisk", "filterMaintenance", "filterFlowering", "filterWeather"].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("change", applyPublicFilters);
  });

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
  const fruit = document.getElementById("filterFruitBearing");
  const risk = document.getElementById("filterRisk");
  const maintenance = document.getElementById("filterMaintenance");
  const flowering = document.getElementById("filterFlowering");
  const weather = document.getElementById("filterWeather");
  if (fruit) fruit.checked = false;
  if (risk) risk.value = "";
  if (maintenance) maintenance.checked = false;
  if (flowering) flowering.checked = false;
  if (weather) weather.checked = false;
}

// Aplica os filtros atuais às árvores do município selecionado.
function arvoresPublicasFiltradas() {
  const term = normalizarBuscaPublica(document.getElementById("searchInput").value),
    fruit = document.getElementById("filterFruitBearing")?.checked || false,
    risk = document.getElementById("filterRisk")?.value || "",
    maintenance = document.getElementById("filterMaintenance")?.checked || false,
    flowering = document.getElementById("filterFlowering")?.checked || false,
    weather = document.getElementById("filterWeather")?.checked || false;
  const filtered = arvoresDoMunicipio().filter(tree => {
    const textMatch = correspondeBuscaPublica(term, [
      tree.nomePopular, tree.nome, tree.especie, tree.nomeCientifico,
      tree.bairro, tree.endereco, tree.id
    ]);
    return textMatch && (!fruit || tree.frutifera) && (!risk || tree.risco === risk) && (!maintenance || tree.manutencao) && (!flowering || tree.floracao) && (!weather || tree.clima);
  });
  return filtered;
}

function ocorrenciasPublicasFiltradas() {
  const term = normalizarBuscaPublica(document.getElementById("searchInput").value);
  return ocorrenciasDoMunicipio().filter(ocorrencia => {
    const arvoreVinculada = trees.find(arvore => arvore.id === ocorrencia.arvoreId);
    return correspondeBuscaPublica(term, [
      ocorrencia.bairro, ocorrencia.tipo, ocorrencia.descricao,
      ocorrencia.endereco, ocorrencia.id, ocorrencia.nomePopular,
      ocorrencia.especie, ocorrencia.nomeCientifico,
      arvoreVinculada?.nomePopular, arvoreVinculada?.nome,
      arvoreVinculada?.especie, arvoreVinculada?.nomeCientifico
    ]);
  });
}

// Atualiza juntos o título, os cartões e os marcadores da camada de árvores.
function renderTreeLayer(treesToShow = arvoresPublicasFiltradas()) {
  const filtered = treesToShow;
  document.getElementById("ocorrencias").textContent = "Árvores em destaque";
  renderTreeList(filtered);
  buildTreeMarkers(filtered);
  if (map && filtered.length === 1) {
    map.flyTo([filtered[0].lat, filtered[0].lng], 16, { duration: 0.8 });
  }
}

// Filtra a lista e o mapa de acordo com a camada ativa.
function applyPublicFilters() {
  const ocorrenciasAtivas = activePublicLayer === "occurrences";
  // Alterna o título e o conteúdo da lateral conforme a camada escolhida.
  document.getElementById("ocorrencias").textContent = ocorrenciasAtivas
    ? "Ocorrências no município"
    : "Árvores em destaque";
  if (ocorrenciasAtivas) {
    renderOccurrenceList(
      ocorrenciasPublicasFiltradas(),
      !publicOccurrencesLoaded && publicOccurrences.length === 0);
    renderPublicOccurrencesOnMap();
    return;
  }
  renderTreeLayer();
}

// Desenha no mapa público os marcadores vermelhos das ocorrências reais do banco de dados
function renderPublicOccurrencesOnMap(source = ocorrenciasPublicasFiltradas()) {
  if (!occurrenceLayer) return;
  occurrenceLayer.clearLayers();
  occurrenceMarkersById.clear();

  // O mapa recebe somente ocorrências do município atual que possuem coordenadas válidas.
  const municipioSelecionado = municipioPublicoAtual();
  const ocorrenciasFiltradas = source.filter(
    oco => (!municipioSelecionado || oco.municipioId === municipioSelecionado)
      && Number.isFinite(oco.lat) && Number.isFinite(oco.lng)
  );

  ocorrenciasFiltradas.forEach(oco => {
    const occurrenceMarker = L.circleMarker([oco.lat, oco.lng], {
      radius: 9,
      color: "#8c2c22",
      weight: 2,
      fillColor: "#d84836",
      fillOpacity: 0.82
    }).bindPopup(`
      <div class="popup-id">${escapeTreeDetail(oco.id)}</div>
      <div class="popup-name">${escapeTreeDetail(oco.tipo)}</div>
      <div class="popup-species">${escapeTreeDetail(oco.descricao)}</div>
      <div class="popup-address">${escapeTreeDetail(oco.endereco)}<br>${escapeTreeDetail(oco.bairro)}</div>
      <div class="popup-risk"><span class="tree-badge badge-${riskClass(oco.prioridade)}">${escapeTreeDetail(oco.prioridade)}</span></div>
      <div class="popup-address">Status: ${escapeTreeDetail(oco.status)}</div>
    `);

    occurrenceMarker.addTo(occurrenceLayer);
    occurrenceMarkersById.set(oco.id, occurrenceMarker);
  });
}

// Atualiza o aviso na barra inferior ao trocar de município
function updateHeaderForMunicipality(name) {
  const toast = document.getElementById("mapToast");
  toast.innerHTML = `<i class="bi bi-geo-alt"></i><span>Mapa atualizado para <strong>${name}</strong>.</span>`;
  setTimeout(() => {
    const texto = activePublicLayer === "occurrences"
      ? "Ocorrências registradas neste município."
      : "Clique em um marcador para ver as informações da árvore.";
    toast.innerHTML = `<i class="bi bi-info-circle"></i><span>${texto}</span>`;
  }, 2500);
}

// Escapa textos dinâmicos para evitar quebra de HTML nos pop-ups
function escapeTreeDetail(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function codigoArvorePublico(tree) {
  return tree?.codigoArv || "Codigo nao informado";
}

function safeTreePhotoUrl(value){
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

// Abre o modal com a ficha detalhada de uma árvore ao clicar no pop-up
async function showTreeDetails(tree) {
  const modalElement = document.getElementById("treeDetailsModal");
  const body = document.getElementById("treeDetailsBody");
  document.getElementById("treeDetailsId").textContent = tree.codigoArv || tree.id;
  document.getElementById("treeDetailsTitle").textContent = tree.nomePopular || tree.nome;
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
    const fotos = (Array.isArray(arvore.fotos) ? arvore.fotos : [])
      .map(safeTreePhotoUrl).filter(Boolean);
    document.getElementById("treeDetailsId").textContent = arvore.codigoArv || tree.codigoArv || tree.id;
    document.getElementById("treeDetailsTitle").textContent = arvore.nomePopular || tree.nomePopular || "Árvore";
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
      <h3 class="tree-details-section-title">Fotos</h3>
      ${fotos.length ? `
        <label class="tree-detail-photo-label" for="treeDetailPhotoSelect">Visualizar foto</label>
        <select class="form-select tree-detail-photo-select" id="treeDetailPhotoSelect" data-photos="${t(JSON.stringify(fotos))}">
          ${fotos.map((foto, indice) => `<option value="${indice}">Foto ${indice + 1}</option>`).join("")}
        </select>
        <img class="tree-detail-photo" id="treeDetailPhoto" src="${t(fotos[0])}" alt="Foto anexada à árvore">
      ` : `<div class="tree-detail-empty"><i class="bi bi-images" aria-hidden="true"></i><span>Nenhuma foto foi anexada a esta árvore.</span></div>`}
    `;
    body.insertAdjacentHTML("beforeend", '<h3 class="tree-details-section-title">Histórico de ordens de serviço</h3><div id="treeOrderHistory"><p>Carregando histórico...</p></div>');
    carregarHistoricoOrdensDaArvore(tree.id, body);
  } catch (erro) {
    console.error("Falha ao abrir ficha pública:", erro);
    body.textContent = "Não foi possível consultar esta ficha.";
  }
}

async function carregarHistoricoOrdensDaArvore(treeId, body){
  const container = body.querySelector("#treeOrderHistory");
  try {
    const resposta = await fetch(`/api/arvores/${encodeURIComponent(treeId)}/ordens-servico`, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const ordens = Array.isArray(dados.ordens) ? dados.ordens : [];
    if (!ordens.length) {
      const mensagem = dados.possuiOcorrencia
        ? "Há uma ocorrência vinculada a esta árvore, mas ainda não há ordens de serviço registradas."
        : "Esta árvore não possui um histórico salvo.";
      container.innerHTML = `<div class="tree-detail-empty"><i class="bi bi-clock-history" aria-hidden="true"></i><span>${escapeTreeDetail(mensagem)}</span></div>`;
      return;
    }
    const t = escapeTreeDetail;
    container.innerHTML = `<div class="table-responsive"><table class="table tree-order-history-table">
      <thead><tr><th>Identificação</th><th>Tipo da ocorrência</th><th>Data</th></tr></thead>
      <tbody>${ordens.map(ordem => {
        const instante = ordem.data ? new Date(ordem.data) : null;
        const data = instante && !Number.isNaN(instante.getTime()) ? instante.toLocaleDateString("pt-BR") : "Não informada";
        return `<tr><td>${t(ordem.codigo || "OS sem código")}</td><td>${t(ordem.tipo || "Não informado")}</td><td>${t(data)}</td></tr>`;
      }).join("")}</tbody></table></div>`;
  } catch (erro) {
    console.warn("Falha ao consultar histórico de OS da árvore:", erro);
    container.innerHTML = `<div class="tree-detail-empty"><i class="bi bi-info-circle" aria-hidden="true"></i><span>Não foi possível carregar o histórico agora.</span></div>`;
  }
}

document.addEventListener("change", event => {
  if (event.target?.id !== "treeDetailPhotoSelect") return;
  const photos = JSON.parse(event.target.dataset.photos || "[]");
  const image = document.getElementById("treeDetailPhoto");
  if (image) image.src = photos[Number(event.target.value)] || photos[0] || "";
});
