// ===============================
// Arboriza - Front-end demonstrativo
// ===============================

// Em uma próxima etapa, as funções de busca e CRUD podem trocar
// os dados locais por chamadas fetch() para a API Java.

const trees = [
  {
    id: "10234",
    nome: "Ipê-amarelo",
    especie: "Handroanthus chrysotrichus",
    bairro: "Taquaral",
    endereco: "R. Dr. Alberto Sarmento, 123",
    lat: -22.8768, lng: -47.0594,
    risco: "Baixo",
    frutifera: false, manutencao: false, floracao: true, clima: false,
    distancia: "120 m",
    imagem: "https://images.unsplash.com/photo-1599557626384-36efbcd7f77a?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "10456",
    nome: "Pau-brasil",
    especie: "Paubrasilia echinata",
    bairro: "Cambuí",
    endereco: "Av. Orosimbo Maia, 456",
    lat: -22.8953, lng: -47.0517,
    risco: "Moderado",
    frutifera: true, manutencao: true, floracao: false, clima: false,
    distancia: "340 m",
    imagem: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "10876",
    nome: "Flamboyant",
    especie: "Delonix regia",
    bairro: "Vila Nogueira",
    endereco: "R. Maria Monteiro, 789",
    lat: -22.8995, lng: -47.0402,
    risco: "Alto",
    frutifera: false, manutencao: true, floracao: false, clima: true,
    distancia: "520 m",
    imagem: "https://images.unsplash.com/photo-1522442676585-6f7f3a37c2c5?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "10901",
    nome: "Resedá",
    especie: "Lagerstroemia indica",
    bairro: "Centro",
    endereco: "Av. Heitor Penteado, 1000",
    lat: -22.9055, lng: -47.0602,
    risco: "Baixo",
    frutifera: false, manutencao: false, floracao: true, clima: false,
    distancia: "680 m",
    imagem: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "11110",
    nome: "Jatobá",
    especie: "Hymenaea courbaril",
    bairro: "Jardim Chapadão",
    endereco: "Av. Imperatriz Leopoldina, 300",
    lat: -22.8716, lng: -47.0830,
    risco: "Crítico",
    frutifera: true, manutencao: true, floracao: false, clima: true,
    distancia: "890 m",
    imagem: "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=300&q=80"
  },
  {
    id: "11220",
    nome: "Quaresmeira",
    especie: "Tibouchina granulosa",
    bairro: "Ponte Preta",
    endereco: "Av. das Amoreiras, 121",
    lat: -22.9192, lng: -47.0738,
    risco: "Moderado",
    frutifera: false, manutencao: false, floracao: true, clima: false,
    distancia: "1,1 km",
    imagem: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=300&q=80"
  }
];

const municipalityCenters = {
  campinas: { name: "Campinas - SP", lat: -22.9056, lng: -47.0608, zoom: 13 },
  hortolandia: { name: "Hortolândia - SP", lat: -22.8583, lng: -47.2200, zoom: 13 },
  sumare: { name: "Sumaré - SP", lat: -22.8214, lng: -47.2660, zoom: 13 }
};

// variaveis do mapa que serão usadas em várias funções, como a instância do mapa, camadas de marcadores e ocorrências, e um mapa para associar IDs de árvores aos seus respectivos marcadores.
let map;                                   //mapa
let markerLayer = L.layerGroup();          //camada de marcadores das árvores
let occurrenceLayer = L.layerGroup();      //camada de marcadores de ocorrências
let markersById = new Map();               //map que permite lovalizar rapidamente o marcador de uma árvore pelo seu ID

// inicializa depois que o html carregar
function initializePublicMap() {
  initMap();
  renderTreeList(trees);
  setupEvents();
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePublicMap, { once: true });
} else {
  initializePublicMap();
}

// cria o mapa, adiciona a camada de tiles do OpenStreetMap, adiciona controles de zoom, adiciona a camada de marcadores e constrói os marcadores das árvores.
function initMap() {
  const mapElement = document.getElementById("map");

  // Verifica se o Leaflet foi carregado corretamente
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

  map = L.map("map", { zoomControl: false }).setView(
    [municipalityCenters.campinas.lat, municipalityCenters.campinas.lng],
    municipalityCenters.campinas.zoom
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

function riskClass(risco) {
  const mapClass = {
    "Baixo": "low",
    "Médio": "medium",
    "Moderado": "medium",
    "Alto": "high",
    "Crítico": "critical"
  };
  return mapClass[risco] || "low";
}

// transforma as arvores em marcadores no mapa, com ícones personalizados de acordo com o risco da árvore. Cada marcador exibe um popup com informações detalhadas sobre a árvore, incluindo ID, nome, espécie, endereço e bairro. Além disso, adiciona um link para ver detalhes adicionais da árvore.
function makeTreeIcon(risco) {
  return L.divIcon({
    className: "",
    html: `<div class="tree-pin ${riskClass(risco)}"><i class="bi bi-tree-fill"></i></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -15]
  });
}

function buildTreeMarkers(source = trees) {
  markerLayer.clearLayers();
  markersById.clear();

  source.forEach(tree => {
    const marker = L.marker([tree.lat, tree.lng], {
      icon: makeTreeIcon(tree.risco)
    });

    // quando clica na arvore abre um popup com as informações da arvore e um link para ver detalhes adicionais
    marker.bindPopup(`
      <div class="popup-card">
        <div class="popup-id">ID: ${tree.id}</div>
        <div class="popup-name">${tree.nome}</div>
        <div class="popup-species">${tree.especie}</div>
        <div class="popup-address">
          ${tree.endereco}<br>
          ${tree.bairro} - Campinas/SP
        </div>
        <div class="popup-link" data-tree-id="${tree.id}">
          Ver detalhes <span aria-hidden="true">→</span>
        </div>
      </div>
    `);

    marker.on("popupopen", () => {
      const link = document.querySelector(`[data-tree-id="${tree.id}"]`);
      if (link) link.addEventListener("click", () => showTreeDetails(tree));
    });

    marker.addTo(markerLayer);
    markersById.set(tree.id, marker);
  });
}

// cria o card do lado direito com a lista de árvores
function renderTreeList(list) {
  const container = document.getElementById("treeList");

  if (!list.length) {
    container.innerHTML = `
      <div class="alert alert-light border">
        Nenhuma árvore encontrada para a busca informada.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(tree => `
    <article class="tree-card" data-tree-card="${tree.id}">
      <img class="tree-photo" src="${tree.imagem}" alt="${tree.nome}">
      <div class="tree-info">
        <div class="tree-top">
          <h3 class="tree-name">${tree.nome}</h3>
          <span class="tree-badge badge-${riskClass(tree.risco)}">
            <i class="bi bi-tree-fill me-1"></i>${tree.risco}
          </span>
        </div>
        <div class="tree-meta">ID: ${tree.id}</div>
        <div class="tree-address">${tree.endereco}</div>
        <div class="tree-distance">${tree.distancia}</div>
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

// seleciona o municipio no select e atualiza o mapa para o centro do município selecionado, além de atualizar o cabeçalho com o nome do município
// Também adiciona eventos para a busca de árvores, botão "Ver todas", alternância de camadas e envio do formulário de cadastro de árvore.
function setupEvents() {
  document.getElementById("municipioSelect").addEventListener("change", event => {
    const selected = municipalityCenters[event.target.value];
    if (!selected) return;
    if (map) map.flyTo([selected.lat, selected.lng], selected.zoom, { duration: 0.8 });
    updateHeaderForMunicipality(selected.name);
  });
  document.getElementById("searchInput").addEventListener("input", applyPublicFilters);
  document.getElementById("btnVerTodas").addEventListener("click", () => {
    document.getElementById("searchInput").value = ""; clearFilterInputs(); renderTreeList(trees); buildTreeMarkers();
    if (map) map.fitBounds(trees.map(tree => [tree.lat, tree.lng]), { padding: [50,50] });
  });
  document.getElementById("treesLayer").addEventListener("change", event => {
    if (!map) return; if (event.target.checked) map.addLayer(markerLayer); else map.removeLayer(markerLayer);
  });
  document.getElementById("riskLayer").addEventListener("change", event => markerLayer.eachLayer(marker => marker.setOpacity(event.target.checked ? 1 : 0.18)));
  document.getElementById("occurrencesLayer").addEventListener("change", event => {
    if (!map) return;
    if (event.target.checked) { if (!map.hasLayer(occurrenceLayer)) occurrenceLayer.addTo(map); addOccurrenceExample(); }
    else { map.removeLayer(occurrenceLayer); occurrenceLayer.clearLayers(); }
  });
  document.getElementById("toggleLayers").addEventListener("click", () => {
    const body=document.getElementById("layerBody"), icon=document.querySelector("#toggleLayers i");
    body.classList.toggle("d-none"); icon.className=body.classList.contains("d-none")?"bi bi-chevron-down":"bi bi-chevron-up";
  });
  const filters=document.getElementById("publicFilters"), filterButton=document.getElementById("btnFilters");
  filterButton.addEventListener("click",()=>{const open=filters.classList.contains("d-none");filters.classList.toggle("d-none",!open);filterButton.setAttribute("aria-expanded",String(open));document.querySelector(".filter-chevron").className=open?"bi bi-chevron-up filter-chevron":"bi bi-chevron-down filter-chevron";});
  document.getElementById("applyFilters").addEventListener("click",()=>{applyPublicFilters();filters.classList.add("d-none");filterButton.setAttribute("aria-expanded","false");document.querySelector(".filter-chevron").className="bi bi-chevron-down filter-chevron";});
  document.getElementById("clearFilters").addEventListener("click",()=>{clearFilterInputs();applyPublicFilters();});
  ["filterFruitBearing","filterRisk","filterMaintenance","filterFlowering","filterWeather"].forEach(id=>document.getElementById(id).addEventListener("change",applyPublicFilters));

  const modal=new bootstrap.Modal(document.getElementById("publicActionModal"));
  const title=document.getElementById("publicActionTitle"), body=document.getElementById("publicActionBody"), submit=document.getElementById("publicActionSubmit");
  let current="";
  const forms={
    signup:{title:"Faça seu cadastro",button:"Criar cadastro",html:`<p class="text-secondary small">Cadastre-se para participar do portal público.</p><label class="form-label">Nome completo</label><input class="form-control mb-3" name="nome" required><label class="form-label">E-mail</label><input class="form-control" name="email" type="email" required`},
    call:{title:"Abrir chamado",button:"Enviar chamado",html:`<p class="text-secondary small">Informe uma situação relacionada à arborização urbana.</p><label class="form-label">Tipo de ocorrência</label><select class="form-select mb-3" name="tipo"><option>Galho quebrado</option><option>Árvore com risco</option><option>Necessidade de poda</option><option>Árvore caída</option><option>Outro</option></select><label class="form-label">Endereço ou local</label><input class="form-control mb-3" name="local" required><label class="form-label">Descrição</label><textarea class="form-control" name="descricao" rows="3" required></textarea>`},
  };
  function openAction(key){current=key;title.textContent=forms[key].title;body.innerHTML=forms[key].html;submit.textContent=forms[key].button;modal.show();}
  const navContact = document.getElementById("navContact");
  if (navContact) navContact.addEventListener("click",e=>{e.preventDefault();openAction("contact")});
  // document.getElementById("navOccurrences").href = "ocorrencias-cidadao.html";
  document.getElementById("navOccurrences").href = "/ocorrencias-cidadao";
  document.getElementById("publicActionForm").addEventListener("submit",e=>{e.preventDefault();alert(({signup:"Cadastro",call:"Chamado",contact:"Mensagem",login:"Login"})[current]+" em modo demonstrativo. A integração real será feita posteriormente.");e.target.reset();modal.hide();});
}
function clearFilterInputs(){document.getElementById("filterFruitBearing").checked=false;document.getElementById("filterRisk").value="";document.getElementById("filterMaintenance").checked=false;document.getElementById("filterFlowering").checked=false;document.getElementById("filterWeather").checked=false;}
function applyPublicFilters(){
  const term=document.getElementById("searchInput").value.trim().toLowerCase(), fruit=document.getElementById("filterFruitBearing").checked, risk=document.getElementById("filterRisk").value, maintenance=document.getElementById("filterMaintenance").checked, flowering=document.getElementById("filterFlowering").checked, weather=document.getElementById("filterWeather").checked;
  const filtered=trees.filter(tree=>{
    const textMatch=!term||[tree.nome,tree.especie,tree.id,tree.bairro,tree.endereco].some(v=>v.toLowerCase().includes(term));
    return textMatch&&(!fruit||tree.frutifera)&&(!risk||tree.risco===risk)&&(!maintenance||tree.manutencao)&&(!flowering||tree.floracao)&&(!weather||tree.clima);
  });
  renderTreeList(filtered);buildTreeMarkers(filtered);if(map&&filtered.length===1)map.flyTo([filtered[0].lat,filtered[0].lng],16,{duration:.8});
}

function addOccurrenceExample() {
  if (occurrenceLayer.getLayers().length) return;

  const occurrenceMarker = L.circleMarker([-22.8860, -47.0682], {
    radius: 8,
    color: "#8c2c22",
    weight: 2,
    fillColor: "#d84836",
    fillOpacity: 0.75
  }).bindPopup(`
    <strong>Ocorrência #OC-2048</strong><br>
    Galho quebrado após chuva forte.
  `);

  occurrenceMarker.addTo(occurrenceLayer);
}

// mensagem temporaria na parte inferior do mapa, informando que o mapa foi atualizado para o município selecionado
// Após 2,5 segundos, a mensagem é substituída por uma instrução padrão para clicar em um marcador e ver as informações da árvore.
function updateHeaderForMunicipality(name) {
  const toast = document.getElementById("mapToast");
  toast.innerHTML = `<i class="bi bi-geo-alt"></i><span>Mapa atualizado para <strong>${name}</strong>.</span>`;
  setTimeout(() => {
    toast.innerHTML = `<i class="bi bi-info-circle"></i><span>Clique em um marcador para ver as informações da árvore.</span>`;
  }, 2500);
}

// Escapa os valores antes de montar o HTML da ficha. Ao integrar a API, mantenha
// essa proteção: os dados recebidos do servidor também devem ser tratados como texto.
function escapeTreeDetail(value) {
  return String(value ?? "—").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

// Dados de demonstração para completar os registros locais enquanto o backend não
// disponibiliza a ficha. Substitua esta função pelo objeto retornado pela API.
function getTreeDetailsData(tree) {
  return {
    nomePopular: tree.nome,
    nomeCientifico: tree.especie,
    especie: "Angiosperma — espécie arbórea urbana (dado fictício)",
    localizacao: `${tree.endereco}, ${tree.bairro}, Campinas/SP`,
    idade: "Aproximadamente 24 anos (fictício)",
    altura: "12,5 m (fictício)",
    diametro: "58 cm (fictício)",
    fotos: [tree.imagem, "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80"],
    estado: "Saudável — avaliação demonstrativa",
    risco: tree.risco,
    ultimaVistoria: "12/08/2025 (fictícia)",
    ultimaPoda: "03/03/2025 (fictícia)",
    proximaManutencao: "15/12/2026 — vistoria preventiva (fictícia)"
  };
}

// Abre a ficha da árvore escolhida no mapa ou na lista.
// Integração com backend: buscar aqui pelo ID (ex.: GET /api/arvores/{id}) e
// mapear a resposta do banco para os campos usados abaixo; hoje usamos dados fictícios.
function showTreeDetails(tree) {
  const details = getTreeDetailsData(tree);
  const modalElement = document.getElementById("treeDetailsModal");
  const body = document.getElementById("treeDetailsBody");

  // Preenche título e identificador com a árvore específica selecionada pelo usuário.
  document.getElementById("treeDetailsId").textContent = `ID ${tree.id} · Dados demonstrativos`;
  document.getElementById("treeDetailsTitle").textContent = `Ficha da árvore — ${details.nomePopular}`;

  // Renderiza a galeria e os campos da ficha. Estes nomes correspondem às informações
  // que deverão ser entregues pelo backend/banco de dados quando a integração existir.
  body.innerHTML = `
    <section class="tree-details-identity" aria-label="Identificação da árvore">
      <div><span>Nome popular</span><strong>${escapeTreeDetail(details.nomePopular)}</strong></div>
      <div><span>Nome científico</span><strong><em>${escapeTreeDetail(details.nomeCientifico)}</em></strong></div>
    </section>
    <h3 class="tree-details-section-title">Localização e características</h3>
    <div class="tree-details-grid">
      <div class="tree-detail-field"><span>Espécie</span><strong>${escapeTreeDetail(details.especie)}</strong></div>
      <div class="tree-detail-field tree-detail-field-wide"><span>Localização e bairro</span><strong>${escapeTreeDetail(details.localizacao)}</strong></div>
      <div class="tree-detail-field"><span>Idade estimada</span><strong>${escapeTreeDetail(details.idade)}</strong></div>
      <div class="tree-detail-field"><span>Altura</span><strong>${escapeTreeDetail(details.altura)}</strong></div>
      <div class="tree-detail-field"><span>Diâmetro</span><strong>${escapeTreeDetail(details.diametro)}</strong></div>
      <div class="tree-detail-field"><span>Estado</span><strong>${escapeTreeDetail(details.estado)}</strong></div>
      <div class="tree-detail-field"><span>Nível de risco</span><strong class="tree-detail-risk ${riskClass(details.risco)}">${escapeTreeDetail(details.risco)}</strong></div>
      <div class="tree-detail-field"><span>Última vistoria</span><strong>${escapeTreeDetail(details.ultimaVistoria)}</strong></div>
      <div class="tree-detail-field"><span>Última poda</span><strong>${escapeTreeDetail(details.ultimaPoda)}</strong></div>
      <div class="tree-detail-field tree-detail-field-wide"><span>Próxima manutenção</span><strong>${escapeTreeDetail(details.proximaManutencao)}</strong></div>
    </div>
    <h3 class="tree-details-section-title">Fotos</h3>
    <div class="tree-details-gallery">
      ${details.fotos.map((photo, index) => `
        <img src="${escapeTreeDetail(photo)}" alt="Foto ${index + 1} da árvore ${escapeTreeDetail(details.nomePopular)}">
      `).join("")}
    </div>
  `;

  // Bootstrap controla abertura, animação, foco e fechamento pelo botão X ou Escape.
  bootstrap.Modal.getOrCreateInstance(modalElement).show();
}
