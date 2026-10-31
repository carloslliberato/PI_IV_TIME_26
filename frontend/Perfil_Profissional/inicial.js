// Dados fictícios usados para preencher a página inicial profissional durante a demonstração.
const dashboardDemo = {
  profissional: {
    nome: "Ana Souza",
    municipio: "Campinas - SP"
  },
  indicadores: {
    totalArvores: 1284,
    riscoAlto: 27,
    riscoMedio: 116,
    riscoBaixo: 1141,
    podasPendentes: 14,
    vistoriasPendentes: 22,
    totalOcorrencias: 9,
    totalOrdens: 6
  }
};

// Mapeia cada indicador ao elemento e à mensagem a exibir quando o valor for zero.
const metricasDashboard = [
  { chave: "totalArvores", elemento: "totalArvores", vazio: "Não existem árvores cadastradas neste município." },
  { chave: "totalOcorrencias", elemento: "totalOcorrencias", vazio: "Não existem ocorrências neste município." },
  { chave: "totalOrdens", elemento: "totalOrdens", vazio: "Não existem ordens de serviço neste município." }
];

// Preenche a tela a partir dos dados locais de demonstração.
function carregarDashboardProfissional() {
  const dados = dashboardDemo;

  // Preenche no topo a pessoa logada e o município associado ao cadastro profissional.
  const nomeSalvo = localStorage.getItem("nome")
    || localStorage.getItem("nomeUsuario")
    || localStorage.getItem("nomeLogado")
    || dados.profissional.nome;
  document.getElementById("nomeProfissional").textContent = nomeSalvo;
  document.getElementById("municipioProfissional").textContent = dados.profissional.municipio;

  // Para cada indicador, exibe a contagem ou a mensagem apropriada quando ela for zero.
  metricasDashboard.forEach(metrica => {
    const elemento = document.getElementById(metrica.elemento);
    const valor = Number(dados.indicadores[metrica.chave]) || 0;

    if (valor === 0) {
      elemento.textContent = metrica.vazio;
      elemento.classList.add("dashboard-value-empty");
      elemento.setAttribute("aria-label", metrica.vazio);
      return;
    }

    elemento.textContent = valor.toLocaleString("pt-BR");
    elemento.classList.remove("dashboard-value-empty");
    elemento.removeAttribute("aria-label");
  });

  // Destaca riscos altos em vermelho; se não houver nenhum, informa isso sem gerar alarme.
  const totalRiscoAlto = Number(dados.indicadores.riscoAlto) || 0;
  const alerta = document.getElementById("riskAlert");
  const tituloAlerta = document.getElementById("riskAlertTitle");
  const mensagemAlerta = document.getElementById("riskAlertMessage");

  if (totalRiscoAlto > 0) {
    alerta.classList.remove("risk-alert-clear");
    tituloAlerta.textContent = `${totalRiscoAlto.toLocaleString("pt-BR")} árvores com risco alto`;
    mensagemAlerta.textContent = "Há árvores que necessitam de atenção imediata neste município.";
  } else {
    alerta.classList.add("risk-alert-clear");
    tituloAlerta.textContent = "Nenhum risco alto identificado";
    mensagemAlerta.textContent = "Não existem árvores em risco alto aguardando atenção imediata.";
  }
}

// Encerra a sessão local e retorna ao login.
function encerrarSessaoProfissional() {
  ["arborizaUsuario", "login", "idSetor", "nome", "nomeUsuario", "nomeLogado"].forEach(chave => {
    localStorage.removeItem(chave);
  });
  window.location.replace("/login");
}

// Liga as ações aos elementos depois que o sidebar carregar este script.
document.getElementById("btnLogout").addEventListener("click", encerrarSessaoProfissional);
carregarDashboardProfissional();
