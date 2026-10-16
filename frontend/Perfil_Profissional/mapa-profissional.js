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
  trees: [
    { id: "10234", nome: "Ipê-amarelo", especie: "Handroanthus chrysotrichus", bairro: "Taquaral", endereco: "R. Dr. Alberto Sarmento, 123", lat: -22.8768, lng: -47.0594, risco: "Baixo" },
    { id: "10456", nome: "Pau-brasil", especie: "Paubrasilia echinata", bairro: "Cambuí", endereco: "Av. Orosimbo Maia, 456", lat: -22.8953, lng: -47.0517, risco: "Moderado" },
    { id: "10876", nome: "Flamboyant", especie: "Delonix regia", bairro: "Vila Nogueira", endereco: "R. Maria Monteiro, 789", lat: -22.8995, lng: -47.0402, risco: "Alto" },
    { id: "10901", nome: "Resedá", especie: "Lagerstroemia indica", bairro: "Centro", endereco: "Av. Heitor Penteado, 1000", lat: -22.9055, lng: -47.0602, risco: "Baixo" },
    { id: "11110", nome: "Jatobá", especie: "Hymenaea courbaril", bairro: "Jardim Chapadão", endereco: "Av. Imperatriz Leopoldina, 300", lat: -22.8716, lng: -47.0830, risco: "Crítico" },
    { id: "11220", nome: "Quaresmeira", especie: "Tibouchina granulosa", bairro: "Ponte Preta", endereco: "Av. das Amoreiras, 121", lat: -22.9192, lng: -47.0738, risco: "Moderado" }
  ],
  occurrences: [
    { id: "OC-2048", latitude: -22.8860, longitude: -47.0682, descricao: "Galho quebrado após chuva forte.", bairro: "Jardim Chapadão" }
  ]
};

// Guarda o mapa, as camadas e os marcadores para os controles desta página.
let professionalMap;
let treeMarkerLayer;
let occurrenceMarkerLayer;
let professionalMarkersById = new Map();
let riskMarkersVisible = true;

// Carrega a tela depois que o sidebar profissional autorizou o acesso e inseriu seus estilos.
function initializeProfessionalMap() {
  document.getElementById("mapScopeName").textContent = professionalMapDemo.municipality.nome;

  // Futura origem do município: GET do perfil/cadastro profissional.
  // Futuras árvores: resposta filtrada pelo ID do município do profissional.
  // No momento, os exemplos abaixo já pertencem exclusivamente a Campinas - SP.
  if (!initializeLeafletMap()) return;

  renderProfessionalTreeList(professionalMapDemo.trees);
  setupProfessionalMapEvents();
}

// Aguarda o momento seguro para consultar os elementos da página.
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

  // Camada visual de ruas; os dados de árvores e ocorrências continuam sendo mock local.
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
  return riskClasses[risk] || "low";
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
    marker.setOpacity(riskMarkersVisible ? 1 : .18);

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

  // Futuramente, preencher essa camada com ocorrências filtradas pelo município do profissional.
  professionalMapDemo.occurrences.forEach(occurrence => {
    L.circleMarker([occurrence.latitude, occurrence.longitude], {
      radius: 8,
      color: "#8c2c22",
      weight: 2,
      fillColor: "#d84836",
      fillOpacity: .78
    }).bindPopup(`
      <strong>Ocorrência ${escapeProfessionalMapText(occurrence.id)}</strong><br>
      ${escapeProfessionalMapText(occurrence.descricao)}<br>
      ${escapeProfessionalMapText(occurrence.bairro)}
    `).addTo(occurrenceMarkerLayer);
  });
}

// Liga a busca, o estado das camadas, o recolhimento da legenda e a ação “Ver todas”.
function setupProfessionalMapEvents() {
  document.getElementById("treeSearch").addEventListener("input", event => {
    const searchTerm = event.target.value.trim().toLocaleLowerCase("pt-BR");
    const matchingTrees = professionalMapDemo.trees.filter(tree =>
      [tree.nome, tree.especie, tree.id, tree.bairro, tree.endereco]
        .some(value => value.toLocaleLowerCase("pt-BR").includes(searchTerm))
    );
    renderProfessionalTreeList(matchingTrees);
    renderProfessionalTreeMarkers(matchingTrees);

    if (matchingTrees.length === 1) {
      professionalMap.flyTo([matchingTrees[0].lat, matchingTrees[0].lng], 16, { duration: .7 });
    }
  });

  document.getElementById("showAllTrees").addEventListener("click", () => {
    document.getElementById("treeSearch").value = "";
    renderProfessionalTreeList(professionalMapDemo.trees);
    renderProfessionalTreeMarkers(professionalMapDemo.trees);
    const treeBounds = professionalMapDemo.trees.map(tree => [tree.lat, tree.lng]);
    professionalMap.fitBounds(treeBounds, { padding: [42, 42] });
  });

  document.getElementById("treesMapLayer").addEventListener("change", event => {
    if (event.target.checked) professionalMap.addLayer(treeMarkerLayer);
    else professionalMap.removeLayer(treeMarkerLayer);
  });

  document.getElementById("riskMapLayer").addEventListener("change", event => {
    riskMarkersVisible = event.target.checked;
    treeMarkerLayer.eachLayer(marker => marker.setOpacity(riskMarkersVisible ? 1 : .18));
  });

  document.getElementById("occurrencesMapLayer").addEventListener("change", event => {
    if (event.target.checked) {
      addProfessionalOccurrenceExamples();
      occurrenceMarkerLayer.addTo(professionalMap);
      updateProfessionalMapToast("Camada de ocorrências ativada.");
    } else {
      professionalMap.removeLayer(occurrenceMarkerLayer);
      occurrenceMarkerLayer.clearLayers();
      updateProfessionalMapToast("Camada de ocorrências desativada.");
    }
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

// Preenche a ficha com dados da árvore e uma linha do tempo ilustrativa.
function openProfessionalTreeDetails(tree) {
  // Ponto de integração: substituir os campos fictícios pela consulta da árvore pelo ID.
  // O histórico abaixo deverá vir da consulta de vistorias, ocorrências e manutenções
  // vinculadas à mesma árvore e ao município do profissional.
  const sampleHistory = [
    { data: "12/06/2026", titulo: "Vistoria realizada", descricao: "Avaliação demonstrativa da copa e do tronco." },
    { data: "20/04/2026", titulo: "Poda preventiva", descricao: "Registro fictício de manutenção da árvore." },
    { data: "18/02/2026", titulo: "Ocorrência registrada", descricao: "Exemplo de ocorrência associada a este exemplar." }
  ];
  const modal = document.getElementById("professionalTreeModal");

  // Atualiza o título e o ID, garantindo que o modal represente a árvore selecionada.
  document.getElementById("professionalTreeModalId").textContent = `ID ${tree.id} · ${professionalMapDemo.municipality.nome}`;
  document.getElementById("professionalTreeModalTitle").textContent = `Ficha da árvore — ${tree.nome}`;

  // Renderiza os dados de exemplo; os valores serão substituídos pela resposta da API.
  document.getElementById("professionalTreeModalBody").innerHTML = `
    <h3 class="professional-tree-modal-section-title">Identificação e localização</h3>
    <div class="professional-tree-details-grid">
      <div class="professional-tree-detail"><span>Nome popular</span><strong>${escapeProfessionalMapText(tree.nome)}</strong></div>
      <div class="professional-tree-detail"><span>Nome científico</span><strong><em>${escapeProfessionalMapText(tree.especie)}</em></strong></div>
      <div class="professional-tree-detail"><span>Espécie</span><strong>Espécie arbórea urbana (exemplo)</strong></div>
      <div class="professional-tree-detail professional-tree-detail-wide"><span>Localização e bairro</span><strong>${escapeProfessionalMapText(tree.endereco)}, ${escapeProfessionalMapText(tree.bairro)} · ${escapeProfessionalMapText(professionalMapDemo.municipality.nome)}</strong></div>
      <div class="professional-tree-detail"><span>Idade estimada</span><strong>Aproximadamente 24 anos (fictício)</strong></div>
      <div class="professional-tree-detail"><span>Altura e diâmetro</span><strong>12,5 m · 58 cm (fictícios)</strong></div>
      <div class="professional-tree-detail"><span>Estado</span><strong>Saudável — avaliação demonstrativa</strong></div>
      <div class="professional-tree-detail"><span>Nível de risco</span><strong>${escapeProfessionalMapText(tree.risco)}</strong></div>
      <div class="professional-tree-detail"><span>Última vistoria</span><strong>12/06/2026 (fictícia)</strong></div>
      <div class="professional-tree-detail"><span>Última poda</span><strong>20/04/2026 (fictícia)</strong></div>
      <div class="professional-tree-detail professional-tree-detail-wide"><span>Próxima manutenção</span><strong>15/12/2026 — vistoria preventiva (fictícia)</strong></div>
    </div>
    <h3 class="professional-tree-modal-section-title">Histórico da árvore</h3>
    <ol class="professional-tree-history">
      ${sampleHistory.map(item => `
        <li><time>${escapeProfessionalMapText(item.data)}</time><strong>${escapeProfessionalMapText(item.titulo)}</strong><p>${escapeProfessionalMapText(item.descricao)}</p></li>
      `).join("")}
    </ol>
  `;

  // Exibe o modal e move o foco para o botão de fechar para navegação acessível.
  modal.hidden = false;
  document.getElementById("closeProfessionalTreeModal").focus();
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
