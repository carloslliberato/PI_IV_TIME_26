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
    <a class="nav-item" data-page="index.html" href="#arvores"><i class="bi bi-tree"></i><span>Árvores</span></a>
    <a class="nav-item" href="#ocorrencias" id="navOccurrences"><i class="bi bi-exclamation-triangle"></i><span>Ocorrências</span></a>
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

const sidebarContainer = document.getElementById("sidebar-container");
if (sidebarContainer) {
  const pageScript = sidebarContainer.dataset.script;
  sidebarContainer.outerHTML = publicSidebarMarkup;

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(link => {
    const page = link.dataset.page;
    if (page) {
      link.href = page === "index.html"
        ? (currentPage === "index.html" ? "#arvores" : "index.html#arvores")
        : page;
    }

    const isActive = page === currentPage;
    link.classList.toggle("active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
  });

  document.getElementById("navOccurrences").href = currentPage === "index.html"
    ? "#ocorrencias"
    : "index.html#ocorrencias";

  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("arborizaUsuario") || "null");
  } catch (error) {
    localStorage.removeItem("arborizaUsuario");
  }

  const loginFlag = localStorage.getItem("login");
  const isLoggedIn = loginFlag === "true" || currentUser?.login === true;
  const storedSetorId = localStorage.getItem("idSetor");
  const setorId = storedSetorId !== null
    ? (storedSetorId === "null" ? null : storedSetorId)
    : (currentUser?.idSetor ?? currentUser?.setorId ?? currentUser?.setor);
  const userName = localStorage.getItem("nome")
    || localStorage.getItem("nomeUsuario")
    || localStorage.getItem("nomeLogado")
    || currentUser?.nome
    || "";

  if (isLoggedIn && userName) {
    const isCitizen = setorId == null || String(setorId).trim() === "";

    if (isCitizen) {
      const accountLink = document.getElementById("navSignup");
      accountLink.href = "#acompanhar-chamados";
      accountLink.querySelector("i").className = "bi bi-clipboard2-check";
      accountLink.querySelector("span").textContent = "Acompanhe seus chamados";
      accountLink.removeAttribute("data-page");
      accountLink.dataset.accountRole = "citizen";
    }

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

  if (pageScript) {
    const script = document.createElement("script");
    script.src = pageScript;
    document.body.appendChild(script);
  }
}
