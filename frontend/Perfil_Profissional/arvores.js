// Esta tela usa registros de demonstração até a API e o banco municipal estarem disponíveis.
(() => {
  // Dados fictícios para desenhar a lista, a ficha e as abas relacionadas.
  // FUTURO API/BD (GET): buscar árvores filtradas pelo município do profissional e incluir
  // os registros associados de histórico, ocorrências, ordens de serviço e documentos.
  const demoTrees = [
    { id: "10234", name: "Ipê-amarelo", scientificName: "Handroanthus chrysotrichus", species: "Árvore nativa", location: "R. Dr. Alberto Sarmento, 123", neighborhood: "Taquaral", age: "20 anos", height: "8", diameter: "35", state: "Saudável", risk: "Médio", lastPruning: "10/08/2023", lastInspection: "15/03/2024", nextMaintenance: "10/08/2025", maintenance: false, flowering: true, photos: ["https://images.unsplash.com/photo-1599557626384-36efbcd7f77a?auto=format&fit=crop&w=1000&q=85", "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1000&q=85", "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=85", "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1000&q=85"], history: [{ date: "15/03/2024", type: "Vistoria", description: "Vistoria de rotina. Árvore saudável.", responsible: "Equipe de arborização" }, { date: "10/08/2023", type: "Poda", description: "Poda de manutenção.", responsible: "Equipe de manejo" }, { date: "12/04/2022", type: "Vistoria", description: "Árvore saudável. Sem necessidade de intervenção.", responsible: "Equipe de arborização" }, { date: "18/09/2021", type: "Ocorrência", description: "Solicitação de avaliação por galhos próximos à rede elétrica.", responsible: "Central municipal" }], occurrences: [{ date: "18/09/2021", type: "Galhos próximos à rede", description: "Solicitação avaliada e encaminhada para vistoria.", status: "Concluída" }], orders: [{ date: "10/08/2023", type: "Poda de manutenção", description: "OS-2023-0841 · Serviço concluído.", status: "Concluída" }], documents: [{ date: "15/03/2024", type: "Laudo de vistoria", description: "Relatório de inspeção da árvore.", status: "Disponível" }] },
    { id: "10418", name: "Jatobá", scientificName: "Hymenaea courbaril", species: "Árvore nativa", location: "Av. Imperatriz Leopoldina, 300", neighborhood: "Jardim Chapadão", age: "35 anos", height: "14", diameter: "62", state: "Regular", risk: "Alto", lastPruning: "22/11/2022", lastInspection: "09/02/2024", nextMaintenance: "Pendente", maintenance: true, flowering: false, photos: ["https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=85", "https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1000&q=85"], history: [{ date: "09/02/2024", type: "Vistoria", description: "Galho seco identificado; recomenda-se poda preventiva.", responsible: "Equipe de arborização" }, { date: "22/11/2022", type: "Poda", description: "Poda de condução.", responsible: "Equipe de manejo" }], occurrences: [{ date: "03/02/2024", type: "Galho seco", description: "Morador comunicou risco de queda de galho.", status: "Em análise" }], orders: [{ date: "12/02/2024", type: "Poda preventiva", description: "OS-2024-0132 · Aguardando execução.", status: "Pendente" }], documents: [] },
    { id: "11076", name: "Pau-brasil", scientificName: "Paubrasilia echinata", species: "Árvore nativa", location: "Praça Carlos Gomes, s/n", neighborhood: "Centro", age: "18 anos", height: "7.5", diameter: "29", state: "Saudável", risk: "Baixo", lastPruning: "Não registrada", lastInspection: "12/06/2024", nextMaintenance: "12/06/2026", maintenance: false, flowering: false, photos: ["https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1000&q=85"], history: [{ date: "12/06/2024", type: "Vistoria", description: "Boas condições gerais; sem intervenção indicada.", responsible: "Equipe de arborização" }], occurrences: [], orders: [], documents: [] },
    { id: "11802", name: "Sibipiruna", scientificName: "Cenostigma pluviosum", species: "Árvore nativa", location: "R. Barão de Jaguara, 880", neighborhood: "Centro", age: "26 anos", height: "11", diameter: "48", state: "Regular", risk: "Crítico", lastPruning: "04/04/2022", lastInspection: "17/05/2024", nextMaintenance: "Pendente", maintenance: true, flowering: true, photos: ["https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1000&q=85"], history: [{ date: "17/05/2024", type: "Vistoria", description: "Inclinação do tronco e cavidade; avaliação técnica recomendada.", responsible: "Eng. ambiental" }], occurrences: [{ date: "17/05/2024", type: "Inclinação", description: "Risco crítico encaminhado à equipe técnica.", status: "Aberta" }], orders: [{ date: "20/05/2024", type: "Avaliação técnica", description: "OS-2024-0520 · Prioridade imediata.", status: "Em andamento" }], documents: [] },
    { id: "12031", name: "Quaresmeira", scientificName: "Pleroma granulosum", species: "Árvore nativa", location: "Av. Júlio de Mesquita, 410", neighborhood: "Cambuí", age: "12 anos", height: "6", diameter: "22", state: "Saudável", risk: "Baixo", lastPruning: "18/02/2024", lastInspection: "18/02/2024", nextMaintenance: "18/02/2026", maintenance: false, flowering: true, photos: ["https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=85"], history: [{ date: "18/02/2024", type: "Poda", description: "Poda leve de formação.", responsible: "Equipe de manejo" }], occurrences: [], orders: [], documents: [] }
  ];

  // A cópia em memória simula a coleção local. A API irá assumir as leituras e gravações.
  let trees = demoTrees.map(tree => ({ ...tree, photos: [...tree.photos], history: [...tree.history] }));
  const el = id => document.getElementById(id);
  const listBody = el("treesTableBody");
  let selectedTreeId = null;
  let selectedPhotoIndex = 0;
  let activeTab = "history";
  let interventionMustSave = false;
  let toastTimer;

  // Escapa texto antes de inserir campos nos templates HTML desta tela.
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const treeById = id => trees.find(tree => String(tree.id) === String(id));
  const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Traduz o nível de risco para uma classe de cor consistente com o restante do painel.
  function riskClass(risk) {
    const value = normalize(risk);
    if (value.includes("crit")) return "critical";
    if (value.includes("alto")) return "high";
    if (value.includes("medio") || value.includes("moderado")) return "moderate";
    return "low";
  }

  // Desenha as linhas da tabela usando os registros atuais e os filtros selecionados.
  // FUTURO API/BD: substituir a filtragem local por GET /api/arvores com busca, risco,
  // municipioId e paginação; o município deve vir do cadastro do profissional autenticado.
  function renderTable() {
    const term = normalize(el("treeSearchInput").value.trim());
    const filter = normalize(el("treeRiskFilter").value);
    const visibleTrees = trees.filter(tree => {
      const matchesSearch = !term || normalize([tree.id, tree.name, tree.scientificName, tree.neighborhood, tree.location, ...(tree.orders || []).map(order => order.description)].join(" ")).includes(term);
      const riskValue = normalize(tree.risk);
      const matchesRisk = filter === "moderado" ? (riskValue === "medio" || riskValue === "moderado") : riskValue === filter;
      const matchesFilter = !filter || matchesRisk || (filter === "manutencao" && tree.maintenance) || (filter === "floracao" && tree.flowering);
      return matchesSearch && matchesFilter;
    });
    listBody.innerHTML = visibleTrees.map(tree => `<tr>
      <td><button class="tree-id-link" type="button" data-open-tree="${escapeHtml(tree.id)}" aria-label="Abrir ficha da árvore ${escapeHtml(tree.id)}">${escapeHtml(tree.id)}</button></td>
      <td><strong>${escapeHtml(tree.name)}</strong><span class="tree-scientific-cell">${escapeHtml(tree.scientificName)}</span></td>
      <td>${escapeHtml(tree.neighborhood)}</td>
      <td><span class="tree-risk-badge ${riskClass(tree.risk)}"><i class="bi bi-tree-fill" aria-hidden="true"></i>${escapeHtml(tree.risk)}</span></td>
      <td>${escapeHtml(tree.lastVisit || tree.lastInspection)}</td>
    </tr>`).join("");
    el("treeResultCount").textContent = `${visibleTrees.length} ${visibleTrees.length === 1 ? "árvore encontrada" : "árvores encontradas"}`;
    el("treesEmpty").hidden = visibleTrees.length !== 0;
    document.querySelector(".trees-table-scroll").hidden = visibleTrees.length === 0;
  }

  // Abre um modal e prende o foco visual dentro do fluxo atual.
  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector("input, select, button")?.focus();
  }
  // Considera pendente apenas uma intervenção em que a pessoa já começou a preencher algum campo.
  function hasInterventionContent() {
    return [...el("interventionForm").querySelectorAll("input, select, textarea")]
      .some(field => String(field.value || "").trim() !== "");
  }
  // Fecha um modal comum. A edição bloqueia este processo enquanto a intervenção não for salva.
  function closeModal(modal, force = false) {
    if (modal.id === "editTreeModal" && interventionMustSave && hasInterventionContent() && !force) {
      el("interventionCloseNote").textContent = "Salve a intervenção antes de fechar esta janela.";
      el("interventionCloseNote").classList.add("is-error");
      return;
    }
    if (modal.id === "editTreeModal" && interventionMustSave && !hasInterventionContent()) {
      // Formulário vazio pode ser descartado sem exigir um salvamento.
      interventionMustSave = false;
      el("interventionForm").reset();
      el("interventionForm").hidden = true;
      el("editTreeForm").hidden = false;
      el("editFormHeading").hidden = false;
    }
    modal.hidden = true;
    if (![el("treeDetailsModal"), el("createTreeModal"), el("editTreeModal")].some(item => !item.hidden)) document.body.classList.remove("modal-open");
  }
  // Mostra avisos temporários após cadastro, edição, intervenção ou exclusão.
  function showToast(message, kind = "success") {
    const toast = el("treesToast");
    toast.className = `trees-toast ${kind === "error" ? "toast-error" : ""}`;
    toast.querySelector("span").textContent = message;
    toast.querySelector("i").className = kind === "error" ? "bi bi-exclamation-circle-fill" : "bi bi-check-circle-fill";
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  // Monta as informações completas e as imagens da ficha selecionada.
  // FUTURO API/BD: consultar GET /api/arvores/{id}; carregar os metadados e as URLs de fotos
  // retornadas pelo serviço de arquivos, sem usar os dados fictícios deste objeto.
  function renderDetails(tree) {
    selectedTreeId = tree.id;
    selectedPhotoIndex = 0;
    el("treeDetailsTitle").textContent = tree.name;
    el("treeScientificName").textContent = tree.scientificName;
    el("treeSpeciesTag").textContent = tree.species || "Espécie não informada";
    const rows = [
      ["ID da árvore", tree.id, "bi-upc-scan"], ["Nome popular", tree.name, "bi-tree"], ["Nome científico", tree.scientificName, "bi-pencil"], ["Espécie", tree.species || "Não informada", "bi-flower1"], ["Localização", tree.location, "bi-geo-alt"], ["Bairro", tree.neighborhood, "bi-house"], ["Idade estimada", tree.age, "bi-hourglass-split"], ["Altura", `${tree.height} m`, "bi-arrows-vertical"], ["Diâmetro do tronco (DAP)", `${tree.diameter} cm`, "bi-circle"], ["Estado", tree.state, "bi-heart-pulse"], ["Nível de risco", tree.risk, "bi-exclamation-triangle"], ["Última vistoria", tree.lastInspection, "bi-clipboard2-check"], ["Última poda", tree.lastPruning, "bi-scissors"], ["Próxima manutenção", tree.nextMaintenance, "bi-calendar-event"]
    ];
    el("treeInfoList").innerHTML = rows.map(([label, value, icon]) => `<div class="tree-info-row"><dt><i class="bi ${icon}" aria-hidden="true"></i>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    renderPhotos(tree);
    el("deleteTreePanel").hidden = true;
    activeTab = "history";
    updateTabs(tree);
  }

  // Atualiza a foto principal, contador e miniaturas clicáveis da galeria.
  function renderPhotos(tree) {
    const photos = tree.photos?.length ? tree.photos : [];
    if (!photos.length) {
      el("treeMainPhoto").removeAttribute("src");
      el("treeMainPhoto").alt = "Nenhuma foto cadastrada para esta árvore";
      el("treePhotoCount").textContent = "Sem fotos";
      el("treePhotoThumbnails").innerHTML = "";
      return;
    }
    selectedPhotoIndex = Math.min(selectedPhotoIndex, photos.length - 1);
    el("treeMainPhoto").src = photos[selectedPhotoIndex];
    el("treeMainPhoto").alt = `Foto ${selectedPhotoIndex + 1} de ${tree.name}`;
    el("treePhotoCount").textContent = `${selectedPhotoIndex + 1}/${photos.length}`;
    el("treePhotoThumbnails").innerHTML = photos.map((url, index) => `<button class="tree-photo-thumb ${index === selectedPhotoIndex ? "active" : ""}" data-photo-index="${index}" type="button" aria-label="Ver foto ${index + 1}"><img src="${escapeHtml(url)}" alt=""></button>`).join("");
  }

  // Desenha a tabela da aba ativa a partir dos dados relacionados à árvore.
  // FUTURO API/BD: carregar cada coleção associada ao ID da árvore por endpoint de histórico,
  // ocorrências, ordens de serviço e documentos (por exemplo /api/arvores/{id}/historico).
  function updateTabs(tree) {
    document.querySelectorAll("[data-tree-tab]").forEach(tab => {
      const active = tab.dataset.treeTab === activeTab;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    const configs = {
      history: { title: "Data", items: tree.history || [], columns: item => [item.date, item.type, item.description, item.responsible], headers: ["Data", "Tipo", "Descrição", "Responsável"] },
      occurrences: { title: "Data", items: tree.occurrences || [], columns: item => [item.date, item.type, item.description, item.status], headers: ["Data", "Ocorrência", "Descrição", "Situação"] },
      orders: { title: "Data", items: tree.orders || [], columns: item => [item.date, item.type, item.description, item.status], headers: ["Data", "Serviço", "Descrição", "Situação"] },
      documents: { title: "Data", items: tree.documents || [], columns: item => [item.date, item.type, item.description, item.status], headers: ["Data", "Documento", "Descrição", "Situação"] }
    };
    const config = configs[activeTab];
    if (!config.items.length) {
      el("treeRelatedContent").innerHTML = `<div class="tree-related-empty"><i class="bi bi-inbox" aria-hidden="true"></i><span>Não há ${activeTab === "orders" ? "ordens de serviço" : activeTab === "documents" ? "documentos" : activeTab === "occurrences" ? "ocorrências" : "registros de histórico"} para esta árvore.</span></div>`;
      return;
    }
    el("treeRelatedContent").innerHTML = `<div class="tree-related-table-wrap"><table class="tree-related-table"><thead><tr>${config.headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${config.items.map(item => `<tr>${config.columns(item).map(value => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  // Abre ficha a partir do link de ID da tabela.
  listBody.addEventListener("click", event => {
    const trigger = event.target.closest("[data-open-tree]");
    if (!trigger) return;
    const tree = treeById(trigger.dataset.openTree);
    if (tree) { renderDetails(tree); openModal(el("treeDetailsModal")); }
  });
  el("treeSearchInput").addEventListener("input", renderTable);
  el("treeRiskFilter").addEventListener("change", renderTable);
  el("openCreateTree").addEventListener("click", () => openModal(el("createTreeModal")));

  // Salva um novo cadastro na lista de demonstração e sinaliza sucesso.
  // FUTURO API/BD (POST): enviar os campos do formulário junto ao município do profissional,
  // receber o ID criado, atualizar a listagem e só então fechar o modal.
  el("createTreeForm").addEventListener("submit", event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const tree = { id: String(Math.max(...trees.map(item => Number(item.id) || 0), 10000) + 1), name: values.name.trim(), scientificName: values.scientificName.trim(), species: "Espécie a classificar", location: values.location.trim(), neighborhood: values.neighborhood.trim(), age: values.age.trim(), height: values.height, diameter: values.diameter, state: values.state, risk: values.risk, lastPruning: "Não registrada", lastInspection: "Não registrada", nextMaintenance: "A definir", maintenance: false, flowering: false, photos: [], history: [], occurrences: [], orders: [], documents: [] };
    trees.unshift(tree);
    event.currentTarget.reset();
    renderTable();
    closeModal(el("createTreeModal"));
    showToast("Árvore salva com sucesso.");
  });

  // Abre a edição preenchida; a ação de intervenção reutiliza a janela e já expande seu formulário.
  function openTreeEditor(showIntervention = false) {
    const tree = treeById(selectedTreeId);
    if (!tree) return;
    closeModal(el("treeDetailsModal"));
    const form = el("editTreeForm");
    form.elements.state.value = tree.state;
    form.elements.height.value = tree.height;
    form.elements.diameter.value = tree.diameter;
    form.hidden = showIntervention;
    el("editFormHeading").hidden = showIntervention;
    el("interventionForm").reset();
    el("interventionForm").hidden = !showIntervention;
    interventionMustSave = showIntervention;
    el("interventionCloseNote").textContent = "Salve a intervenção para poder fechar esta janela.";
    el("interventionCloseNote").classList.remove("is-error");
    openModal(el("editTreeModal"));
    if (showIntervention) el("interventionForm").elements.date.focus();
  }

  el("editTreeButton").addEventListener("click", () => openTreeEditor(false));
  // O botão fica na ficha, à esquerda de Editar árvore, e abre diretamente os campos da intervenção.
  el("startInterventionButton").addEventListener("click", () => openTreeEditor(true));

  // Grava em memória estado, tamanho e uma foto selecionada no computador.
  // FUTURO API/BD (PATCH + upload): enviar estado/altura/diâmetro e a foto em multipart/form-data.
  el("editTreeForm").addEventListener("submit", event => {
    event.preventDefault();
    const tree = treeById(selectedTreeId);
    if (!tree) return;
    const form = event.currentTarget;
    tree.state = form.elements.state.value;
    tree.height = form.elements.height.value;
    tree.diameter = form.elements.diameter.value;
    const file = form.elements.photo.files?.[0];
    if (file) {
      if (tree.photos[0]?.startsWith("blob:")) URL.revokeObjectURL(tree.photos[0]);
      tree.photos.unshift(URL.createObjectURL(file));
    }
    renderTable();
    closeModal(el("editTreeModal"));
    renderDetails(tree);
    openModal(el("treeDetailsModal"));
    showToast("Dados da árvore atualizados.");
  });

  // Salva intervenção e adiciona o evento à linha do tempo demonstrativa.
  // FUTURO API/BD (POST): gravar a intervenção vinculada ao ID da árvore e ao usuário responsável;
  // atualizar histórico e última poda/vistoria quando o tipo de serviço indicar essa atualização.
  el("interventionForm").addEventListener("submit", event => {
    event.preventDefault();
    const tree = treeById(selectedTreeId);
    if (!tree) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const dateParts = values.date.split("-");
    tree.history.unshift({ date: `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`, type: values.type.trim(), description: values.description.trim(), responsible: values.responsible.trim() });
    if (normalize(values.type).includes("poda")) tree.lastPruning = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    if (normalize(values.type).includes("vistoria")) tree.lastInspection = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    interventionMustSave = false;
    el("interventionCloseNote").textContent = "Intervenção salva. Agora você pode fechar esta janela.";
    el("interventionCloseNote").classList.remove("is-error");
    closeModal(el("editTreeModal"), true);
    renderDetails(tree);
    openModal(el("treeDetailsModal"));
    renderTable();
    showToast("Intervenção registrada com sucesso.");
  });

  // Solicita o motivo antes de permitir a ação destrutiva.
  el("showDeleteTree").addEventListener("click", () => {
    el("deleteTreePanel").hidden = false;
    el("deleteReason").focus();
  });
  // Confirma a exclusão com a pessoa usuária e, depois, remove o registro local.
  // FUTURO API/BD (DELETE): enviar ID e motivo selecionado para auditoria antes de atualizar a lista.
  el("confirmDeleteTree").addEventListener("click", () => {
    const reason = el("deleteReason").value;
    if (!reason) { showToast("Selecione o motivo da exclusão.", "error"); el("deleteReason").focus(); return; }
    if (!window.confirm(`Deseja realmente excluir a árvore ${treeById(selectedTreeId)?.name || "selecionada"}?`)) return;
    trees = trees.filter(tree => String(tree.id) !== String(selectedTreeId));
    closeModal(el("treeDetailsModal"));
    renderTable();
    showToast("Árvore excluída da lista.");
  });

  // Permite percorrer imagens e selecionar miniaturas da galeria.
  el("previousTreePhoto").addEventListener("click", () => { const tree = treeById(selectedTreeId); if (tree?.photos.length) { selectedPhotoIndex = (selectedPhotoIndex - 1 + tree.photos.length) % tree.photos.length; renderPhotos(tree); } });
  el("nextTreePhoto").addEventListener("click", () => { const tree = treeById(selectedTreeId); if (tree?.photos.length) { selectedPhotoIndex = (selectedPhotoIndex + 1) % tree.photos.length; renderPhotos(tree); } });
  el("treePhotoThumbnails").addEventListener("click", event => { const button = event.target.closest("[data-photo-index]"); const tree = treeById(selectedTreeId); if (button && tree) { selectedPhotoIndex = Number(button.dataset.photoIndex); renderPhotos(tree); } });

  // Alterna os registros associados à árvore sem sair da ficha.
  document.querySelectorAll("[data-tree-tab]").forEach(tab => tab.addEventListener("click", () => { activeTab = tab.dataset.treeTab; const tree = treeById(selectedTreeId); if (tree) updateTabs(tree); }));

  // Fecha pela tecla Escape ou pelos botões X/cancelar, respeitando o bloqueio da intervenção.
  document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.closest(".tree-modal-backdrop"))));
  el("closeEditModal").addEventListener("click", () => closeModal(el("editTreeModal")));
  document.querySelectorAll(".tree-modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(backdrop); }));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const open = [el("editTreeModal"), el("createTreeModal"), el("treeDetailsModal")].find(modal => !modal.hidden);
    if (open) closeModal(open);
  });

  // Preenche o nome do município de demonstração; futuramente virá do cadastro profissional.
  // FUTURO API/BD: ler o município no perfil autenticado ou no endpoint de sessão do profissional.
  renderTable();
})();
