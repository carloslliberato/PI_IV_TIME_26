// Sidebar compartilhado pelas telas do Perfil_Profissional.
// Cada tela profissional inclui um elemento #sidebar-profissional. Este arquivo
// carrega seu CSS independente, sem depender dos estilos do Perfil_Publico.

(() => {
  // Lê o formato atual e os formatos antigos da sessão usados pelo projeto.
  // Confere os dados locais de acesso antes de mostrar qualquer tela profissional.
  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem("arborizaUsuario") || "null");
  } catch (error) {
    localStorage.removeItem("arborizaUsuario");
  }

  const loginValido = localStorage.getItem("login") === "true" || usuario?.login === true;
  const setorSalvo = localStorage.getItem("idSetor");
  const setor = setorSalvo !== null
    ? (setorSalvo === "null" ? null : setorSalvo)
    : (usuario?.idSetor ?? usuario?.setorId ?? usuario?.setor ?? null);
  const setorValido = setor !== null && String(setor).trim() !== "";

  // Somente usuários autenticados e vinculados a um setor acessam o perfil profissional.
  if (!loginValido || !setorValido) {
    document.documentElement.style.visibility = "hidden";
    window.location.replace("../Login/login.html");
    return;
  }

  const container = document.getElementById("sidebar-profissional");
  if (!container) return;

  // Carrega a folha de estilos exclusiva do perfil profissional uma única vez.
  if (!document.querySelector("link[data-professional-sidebar-styles]")) {
    const styles = document.createElement("link");
    styles.rel = "stylesheet";
    styles.href = "styles-profissional.css";
    styles.dataset.professionalSidebarStyles = "true";
    document.head.appendChild(styles);
  }

  // Guarda o script específico da tela para carregá-lo somente depois de validar o acesso.
  const scriptDaTela = container.dataset.script;

  // Os caminhos apontam para as telas profissionais que serão criadas nesta pasta.
  const itensMenu = [
    { texto: "Inicial", icone: "bi-house-door", caminho: "inicial.html" },
    { texto: "Mapa", icone: "bi-map", caminho: "mapa-profissional.html" },
    { texto: "Ocorrências", icone: "bi-exclamation-triangle", caminho: "ocorrencias.html" },
    { texto: "Ordens de serviço", icone: "bi-tools", caminho: "ordens-servico.html" },
    { texto: "Árvores", icone: "bi-tree", caminho: "arvores.html" },
    { texto: "Equipes", icone: "bi-people", caminho: "equipes.html" },
    { texto: "Relatórios", icone: "bi-file-earmark-bar-graph", caminho: "relatorio.html" }
  ];

  // Mantém a marca, os ícones, a fonte e o rodapé iguais aos do sidebar público.
  const sidebarMarkup = `
    <aside class="sidebar">
      <a class="brand brand-link" href="inicial.html" aria-label="Arboriza - página inicial profissional">
        <div class="brand-mark"><i class="bi bi-tree-fill"></i></div>
        <div>
          <div class="brand-name">Arboriza</div>
          <div class="brand-tagline">Cidades mais verdes,<br>vidas melhores</div>
        </div>
      </a>

      <nav class="sidebar-nav" aria-label="Menu profissional">
        ${itensMenu.map(item => `
          <a class="nav-item" data-page="${item.caminho}" href="${item.caminho}">
            <i class="bi ${item.icone}" aria-hidden="true"></i><span>${item.texto}</span>
          </a>
        `).join("")}
      </nav>

      <div class="sidebar-bottom">
        <div class="mission-card">
          <div class="mission-icon"><i class="bi bi-leaf-fill"></i></div>
          <strong>Juntos por<br>cidades mais verdes</strong>
          <p>Gestão, prevenção<br>e qualidade de vida.</p>
        </div>
      </div>
    </aside>
  `;

  // Substitui o espaço reservado pelo menu e marca o link da tela atual como ativo.
  container.outerHTML = sidebarMarkup;
  const paginaAtual = window.location.pathname.split("/").pop() || "inicial.html";
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(link => {
    const estaAtivo = link.dataset.page === paginaAtual;
    link.classList.toggle("active", estaAtivo);
    if (estaAtivo) link.setAttribute("aria-current", "page");
  });

  // Carrega a lógica da tela após o sidebar estar presente e após validar o acesso.
  if (scriptDaTela) {
    const script = document.createElement("script");
    script.src = scriptDaTela;
    document.body.appendChild(script);
  }
})();
