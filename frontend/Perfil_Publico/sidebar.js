// Define a estrutura HTML reutilizada como menu lateral nas paginas do portal publico.
const publicSidebarMarkup = `
<aside class="sidebar">
  <a class="brand brand-link" href="index.html" aria-label="Arboriza - página inicial">
    <div class="brand-mark"><i class="bi bi-tree-fill"></i></div>
    <div>
      <div class="brand-name">Arboriza</div>
      <div class="brand-tagline">Cidades mais verdes,<br>vidas melhores</div>
    </div>
  </a>

  <nav class="sidebar-nav" aria-label="Menu público">
    <a class="nav-item" data-page="index.html" href="index.html"><i class="bi bi-tree"></i><span>Árvores</span></a>
    <a class="nav-item" href="ocorrencias.html" id="navOccurrences"><i class="bi bi-exclamation-triangle"></i><span>Ocorrências</span></a>
    <a class="nav-item" data-page="cadastro-cidadao.html" href="cadastro-cidadao.html" id="navSignup"><i class="bi bi-person-plus"></i><span>Faça seu cadastro</span></a>
    <a class="nav-item" data-page="abrir-chamado.html" href="abrir-chamado.html" id="navCall"><i class="bi bi-megaphone"></i><span>Abrir chamado</span></a>
  </nav>

  <div class="sidebar-bottom">
    <div class="mission-card">
      <div class="mission-icon"><i class="bi bi-leaf-fill"></i></div>
      <strong>Juntos por<br>cidades mais verdes</strong>
      <p>Gestão, prevenção<br>e qualidade de vida.</p>
    </div>
  </div>
</aside>`;

// Localiza o ponto reservado no HTML para inserir o sidebar compartilhado.
const sidebarContainer = document.getElementById("sidebar-container");
if (sidebarContainer) {
  // Guarda o script especifico da pagina antes de substituir o contêiner do menu.
  const pageScript = sidebarContainer.dataset.script;
  sidebarContainer.outerHTML = publicSidebarMarkup;

  // Identifica qual arquivo esta aberto para ajustar os links e o item selecionado.
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(link => {
    const page = link.dataset.page;
    if (page) {
      // Na pagina inicial, o link de arvores aponta para a secao local; nas outras, volta ao mapa.
      link.href = page === "index.html"
        ? (currentPage === "index.html" ? "#arvores" : "index.html#arvores")
        : page;
    }

    // Aplica o estado visual ativo e a indicacao acessivel na pagina correspondente.
    const isActive = page === currentPage;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
  });

  // Sempre leva o item Ocorrencias para a tela de consulta e marca-o quando ela estiver aberta.
  const occurrencesLink = document.getElementById("navOccurrences");
  occurrencesLink.href = "ocorrencias-cidadao.html";
  const isOccurrencesPage = currentPage === "ocorrencias-cidadao.html";
  occurrencesLink.classList.toggle("active", isOccurrencesPage);
  if (isOccurrencesPage) occurrencesLink.setAttribute("aria-current", "page");
  else occurrencesLink.removeAttribute("aria-current");

  // Tenta recuperar os dados salvos do usuario; se o JSON estiver invalido, remove o valor corrompido.
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("arborizaUsuario") || "null");
  } catch (error) {
    localStorage.removeItem("arborizaUsuario");
  }

  // Combina os formatos de sessao usados pelo projeto para identificar o login atual.
  const loginFlag = localStorage.getItem("login");
  const isLoggedIn = loginFlag === "true" || currentUser?.login === true;
  // Descobre o setor/perfil do usuario, aceitando os nomes de campo ja usados no armazenamento.
  const storedSetorId = localStorage.getItem("idSetor");
  const setorId = storedSetorId !== null
    ? (storedSetorId === "null" ? null : storedSetorId)
    : (currentUser?.idSetor ?? currentUser?.setorId ?? currentUser?.setor);
  // Procura o nome do usuario nas chaves antigas e atuais para montar a saudacao.
  const userName = localStorage.getItem("nome")
    || localStorage.getItem("nomeUsuario")
    || localStorage.getItem("nomeLogado")
    || currentUser?.nome
    || "";

  if (isLoggedIn && userName) {
    // Um perfil sem setor associado e tratado como cidadao no portal publico.
    const isCitizen = setorId == null || String(setorId).trim() === "";

    if (isCitizen) {
      // Para cidadaos autenticados, troca o cadastro por um atalho de acompanhamento.
      const accountLink = document.getElementById("navSignup");
      accountLink.href = "acompanhe-chamado.html";
      accountLink.querySelector("i").className = "bi bi-clipboard2-check";
      accountLink.querySelector("span").textContent = "Acompanhe seus chamados";
      accountLink.removeAttribute("data-page");
      accountLink.dataset.accountRole = "citizen";
      // Mantem o atalho selecionado quando o cidadao estiver na tela de acompanhamento.
      const isTrackingPage = currentPage === "acompanhe-chamado.html";
      accountLink.classList.toggle("active", isTrackingPage);
      if (isTrackingPage) accountLink.setAttribute("aria-current", "page");
      else accountLink.removeAttribute("aria-current");
    }

    // Substitui o link de login por saudacao e acao de sair, se o cabecalho tiver esse controle.
    const loginLink = document.querySelector(".public-top-actions .login-link");
    if (loginLink) {
      const actions = loginLink.parentElement;
      const greeting = document.createElement("span");
      greeting.className = "welcome-message";
      greeting.append("Bem-vindo(a), ");
      const userNameElement = document.createElement("strong");
      userNameElement.textContent = userName;
      greeting.append(userNameElement);

      const logoutLink = document.createElement("a");
      logoutLink.className = "login-link logout-link";
      logoutLink.href = "#logout";
      logoutLink.textContent = "Sair";
      logoutLink.addEventListener("click", event => {
        event.preventDefault();
        // Encerra a sessao local removendo os dados usados para reconhecer o usuario.
        localStorage.removeItem("arborizaUsuario");
        localStorage.removeItem("login");
        localStorage.removeItem("idSetor");
        localStorage.removeItem("nome");
        localStorage.removeItem("nomeUsuario");
        localStorage.removeItem("nomeLogado");
        window.location.reload();
      });

      actions.replaceChildren(greeting, logoutLink);
    }
  }

  // Carrega a logica especifica desta tela depois que o sidebar ja foi inserido no documento.
  if (pageScript) {
    const script = document.createElement("script");
    script.src = pageScript;
    document.body.appendChild(script);
  }
}