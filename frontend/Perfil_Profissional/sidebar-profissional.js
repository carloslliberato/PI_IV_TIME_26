
// Sidebar compartilhado pelas telas do Perfil_Profissional.
// Cada tela profissional inclui um elemento #sidebar-profissional. Este arquivo
// carrega seu CSS independente, sem depender dos estilos do Perfil_Publico.

(() => {

  // Lê os dados da sessão armazenados no navegador.
  let usuario = null;

  try {
    usuario = JSON.parse(
      localStorage.getItem("arborizaUsuario") || "null"
    );
  } catch (error) {
    localStorage.removeItem("arborizaUsuario");
  }

  // Verifica se existe uma sessão de login.
  const loginValido =
    localStorage.getItem("login") === "true" ||
    usuario?.login === true;

  // Verifica se a conta possui o perfil de funcionário
  // e se o usuário escolheu acessar como funcionário.
  const possuiPerfilFuncionario =
    usuario?.perfilAtivo === "FUNCIONARIO" &&
    usuario?.perfis?.includes("FUNCIONARIO");

  // Somente usuários autenticados que escolheram o perfil FUNCIONARIO
  // podem acessar as páginas profissionais.
  if (!loginValido || !possuiPerfilFuncionario) {
    document.documentElement.style.visibility = "hidden";
    window.location.replace("/login");
    return;
  }

  const container = document.getElementById("sidebar-profissional");

  if (!container) return;

  // Carrega a folha de estilos exclusiva do perfil profissional uma única vez.
  if (!document.querySelector("link[data-professional-sidebar-styles]")) {
    const styles = document.createElement("link");

    styles.rel = "stylesheet";
    styles.href = "/perfil_profissional/styles-profissional.css";
    styles.dataset.professionalSidebarStyles = "true";

    document.head.appendChild(styles);
  }

  // Guarda o script específico da tela para carregá-lo
  // somente depois de validar o acesso.
  const scriptDaTela = container.dataset.script;

  // Caminhos das telas profissionais do Arboriza.
  const itensMenu = [
    {
      texto: "Inicial",
      icone: "bi-house-door",
      caminho: "/perfil-profissional"
    },
    {
      texto: "Mapa",
      icone: "bi-map",
      caminho: "/mapa-profissional"
    },
    {
      texto: "Ocorrências",
      icone: "bi-exclamation-triangle",
      caminho: "/ocorrencias"
    },
    {
      texto: "Ordens de serviço",
      icone: "bi-tools",
      caminho: "/ordens-servico"
    },
    {
      texto: "Árvores",
      icone: "bi-tree",
      caminho: "/arvores"
    },
    {
      texto: "Equipes",
      icone: "bi-people",
      caminho: "/equipes"
    },
    {
      texto: "Relatórios",
      icone: "bi-file-earmark-bar-graph",
      caminho: "/relatorio"
    }
  ];

  // Estrutura HTML do menu lateral.
  const sidebarMarkup = `
    <aside class="sidebar">

      <a
        class="brand brand-link"
        href="/perfil-profissional"
        aria-label="Arboriza - página inicial profissional"
      >
        <div class="brand-mark">
          <i class="bi bi-tree-fill"></i>
        </div>

        <div>
          <div class="brand-name">Arboriza</div>

          <div class="brand-tagline">
            Cidades mais verdes,<br>
            vidas melhores
          </div>
        </div>
      </a>

      <nav class="sidebar-nav" aria-label="Menu profissional">

        ${itensMenu.map(item => `
          <a
            class="nav-item"
            data-page="${item.caminho}"
            href="${item.caminho}"
          >
            <i class="bi ${item.icone}" aria-hidden="true"></i>
            <span>${item.texto}</span>
          </a>
        `).join("")}

      </nav>

      <div class="sidebar-bottom">

        <div class="mission-card">
          <div class="mission-icon">
            <i class="bi bi-leaf-fill"></i>
          </div>

          <strong>
            Juntos por<br>
            cidades mais verdes
          </strong>

          <p>
            Gestão, prevenção<br>
            e qualidade de vida.
          </p>
        </div>

      </div>

    </aside>
  `;

  // Substitui o espaço reservado pelo menu lateral.
  container.outerHTML = sidebarMarkup;

  // Identifica a página atual e destaca seu respectivo link no menu.
  const paginaAtual = window.location.pathname;

  document.querySelectorAll(".sidebar-nav .nav-item").forEach(link => {

    const estaAtivo = link.dataset.page === paginaAtual;

    link.classList.toggle("active", estaAtivo);

    if (estaAtivo) {
      link.setAttribute("aria-current", "page");
    }

  });

  // Carrega a lógica específica da tela depois de montar o sidebar.
  if (scriptDaTela) {

    const script = document.createElement("script");

    script.src = scriptDaTela;

    document.body.appendChild(script);

  }

})();
