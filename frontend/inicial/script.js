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
    risco: "Médio",
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
    risco: "Médio",
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
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  renderTreeList(trees.slice(0, 4));
  setupEvents();
});

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

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.control.zoom({ position: "topleft" }).addTo(map);

  markerLayer.addTo(map);
  buildTreeMarkers();
}

function riskClass(risco) {
  const mapClass = {
    "Baixo": "low",
    "Médio": "medium",
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
      if (map) {map.flyTo([selected.lat, selected.lng], selected.zoom, { duration: 0.8 });
      }
      const marker = markersById.get(tree.id);
      if (marker) marker.openPopup();
    });
  });
}

// seleciona o municipio no select e atualiza o mapa para o centro do município selecionado, além de atualizar o cabeçalho com o nome do município
// Também adiciona eventos para a busca de árvores, botão "Ver todas", alternância de camadas e envio do formulário de cadastro de árvore.
function setupEvents() {
  const municipalitySelect = document.getElementById("municipioSelect");
  municipalitySelect.addEventListener("change", (event) => {
    const selected = municipalityCenters[event.target.value];
    if (!selected) return;
    map.flyTo([selected.lat, selected.lng], selected.zoom, { duration: 0.8 });

    // No back-end real, a lista local é reutilizada apenas como demonstração.
    updateHeaderForMunicipality(selected.name);
  });

  // na parte de busca, quando o usuário digita no campo de pesquisa, o código filtra a lista de árvores com base no termo digitado. Se o campo estiver vazio, ele renderiza as primeiras 4 árvores e reconstrói os marcadores
  // Caso contrário, ele filtra as árvores que contêm o termo em qualquer um dos campos relevantes (nome, espécie, ID, bairro ou endereço) e renderiza até 6 resultados. Se houver apenas uma árvore correspondente, o mapa se aproxima dela.
  document.getElementById("searchInput").addEventListener("input", (event) => {
    const term = event.target.value.trim().toLowerCase();

    if (!term) {
      renderTreeList(trees.slice(0, 4));
      buildTreeMarkers();
      return;
    }

    const filtered = trees.filter(tree =>
      [tree.nome, tree.especie, tree.id, tree.bairro, tree.endereco]
        .some(value => value.toLowerCase().includes(term))
    );

    renderTreeList(filtered.slice(0, 6));
    buildTreeMarkers(filtered);

    if (filtered.length === 1) {
      const tree = filtered[0];
      map.flyTo([tree.lat, tree.lng], 16, { duration: 0.8 });
    }
  });

  // controla as camadas de seleção
  document.getElementById("btnVerTodas").addEventListener("click", () => {
    renderTreeList(trees);
    buildTreeMarkers();
    if (map) {map.fitBounds(trees.map(tree => [tree.lat, tree.lng]), { padding: [50, 50]});
}
  });

  document.getElementById("treesLayer").addEventListener("change", (event) => {
    if (!map) return;

    if (event.target.checked) {
        map.addLayer(markerLayer);
    } else {
        map.removeLayer(markerLayer);
    }
    });

  document.getElementById("riskLayer").addEventListener("change", (event) => {
    if (event.target.checked) {
      markerLayer.eachLayer(marker => marker.setOpacity(1));
    } else {
      markerLayer.eachLayer(marker => marker.setOpacity(0.18));
    }
  });

  document.getElementById("occurrencesLayer").addEventListener("change", (event) => {
    if (event.target.checked) {
      if (!map.hasLayer(occurrenceLayer)) occurrenceLayer.addTo(map);
      addOccurrenceExample();
    } else {
      map.removeLayer(occurrenceLayer);
      occurrenceLayer.clearLayers();
    }
  });

  document.getElementById("toggleLayers").addEventListener("click", () => {
    const body = document.getElementById("layerBody");
    const icon = document.querySelector("#toggleLayers i");
    body.classList.toggle("d-none");
    icon.className = body.classList.contains("d-none")
      ? "bi bi-chevron-down"
      : "bi bi-chevron-up";
  });


  // faz o evento de cadastro da arvore, abrindo o modal de cadastro e tratando o envio do formulário. Quando o botão "Cadastrar" é clicado, o modal é exibido
  // Ao enviar o formulário, os dados são coletados, uma mensagem de sucesso é exibida (modo demonstrativo), o formulário é resetado e o modal é fechado.
  const modalElement = document.getElementById("treeModal");
  const modal = new bootstrap.Modal(modalElement);

  document.getElementById("btnCadastrar").addEventListener("click", () => modal.show());

  document.getElementById("treeForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.target).entries());

    alert(`Árvore "${data.nomePopular}" cadastrada com sucesso (modo demonstrativo).`);
    event.target.reset();
    modal.hide();
  });
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

function showTreeDetails(tree) {
  alert(
    `Árvore ${tree.id}\n\n` +
    `${tree.nome}\n` +
    `${tree.especie}\n` +
    `Bairro: ${tree.bairro}\n` +
    `Risco: ${tree.risco}\n\n` +
    `Nesta etapa, o botão pode abrir futuramente a ficha completa da árvore.`
  );
}
