// feito por Sophia
// Painel inicial profissional: carrega todos os indicadores reais diretamente do back-end (sem dados fictícios).

// Mapeia cada indicador ao ID do elemento HTML e à mensagem exibida quando o valor no banco for zero
const metricasDashboard = [
  { chave: "totalArvores", elemento: "totalArvores", vazio: "Não existem árvores cadastradas neste município." },
  { chave: "totalOcorrencias", elemento: "totalOcorrencias", vazio: "Não existem ocorrências neste município." },
  { chave: "totalOrdens", elemento: "totalOrdens", vazio: "Não existem ordens de serviço neste município." }
];

// Atualiza os 3 cards principais da tela com os números vindos do banco de dados
function atualizarCardsDashboard(indicadores) {
  metricasDashboard.forEach(metrica => {
    const elemento = document.getElementById(metrica.elemento);
    if (!elemento) return;

    // A falha de consulta de um indicador não deve aparecer como quantidade zero.
    if (indicadores[metrica.chave] === null) {
      const mensagem = "Não foi possível carregar este indicador.";
      elemento.textContent = mensagem;
      elemento.classList.add("dashboard-value-empty");
      elemento.setAttribute("aria-label", mensagem);
      return;
    }

    const valor = Number(indicadores[metrica.chave]) || 0;

    // Se não houver registros no banco, mostra a mensagem informativa em vez do número
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
}

// Atualiza o banner de alerta no topo conforme a quantidade real de árvores com risco alto
function atualizarAlertaRisco(totalRiscoAlto) {
  const alerta = document.getElementById("riskAlert");
  const tituloAlerta = document.getElementById("riskAlertTitle");
  const mensagemAlerta = document.getElementById("riskAlertMessage");

  if (!alerta || !tituloAlerta || !mensagemAlerta) return;

  if (totalRiscoAlto > 0) {
    alerta.classList.remove("risk-alert-clear");
    tituloAlerta.textContent = `${totalRiscoAlto.toLocaleString("pt-BR")} ${totalRiscoAlto === 1 ? "árvore com risco alto" : "árvores com risco alto"}`;
    mensagemAlerta.textContent = "Há árvores que necessitam de atenção imediata neste município.";
  } else {
    alerta.classList.add("risk-alert-clear");
    tituloAlerta.textContent = "Nenhum risco alto identificado";
    mensagemAlerta.textContent = "Não existem árvores em risco alto aguardando atenção imediata.";
  }
}

// Função auxiliar que faz GET em uma rota da API e devolve a lista JSON (ou lista vazia se falhar)
async function buscarListaDaApi(url) {
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return [];
    const dados = await resposta.json();
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error(`Erro ao consultar ${url}:`, erro);
    return [];
  }
}

// Consulta o total de OS no relatório autorizado pelo município da conta.
async function buscarTotalDeOrdens() {
  try {
    const resposta = await fetch("/api/relatorios/ordens-servico", {
      credentials: "same-origin",
      cache: "no-store"
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados?.erro || "Não foi possível consultar o total de ordens de serviço.");
    }

    const total = dados?.relatorio?.totalOrdens;
    if (!Number.isSafeInteger(total) || total < 0) {
      throw new Error("A API retornou um total de ordens de serviço inválido.");
    }

    return total;
  } catch (erro) {
    console.error("Erro ao consultar o indicador de ordens de serviço:", erro);
    return null;
  }
}

// Busca os dados da sessão do profissional logado (nome e município) no back-end
async function carregarDadosSessaoProfissional() {
  let nome = localStorage.getItem("nome")
    || localStorage.getItem("nomeUsuario")
    || localStorage.getItem("nomeLogado")
    || "Profissional";
  let municipio = "Campinas - SP";

  try {
    const resposta = await fetch("/api/contas/sessao");
    if (resposta.ok) {
      const sessao = await resposta.json();
      if (sessao) {
        if (sessao.nome) nome = sessao.nome;
        if (sessao.municipio) municipio = sessao.municipio;
        else if (sessao.municipioId) {
          municipio = sessao.municipioId.charAt(0).toUpperCase() + sessao.municipioId.slice(1) + " - SP";
        }
      }
    }
  } catch (erro) {
    // Caso a sessão não esteja ativa, usa os dados salvos no navegador
  }

  const elNome = document.getElementById("nomeProfissional");
  const elMunicipio = document.getElementById("municipioProfissional");
  if (elNome) elNome.textContent = nome;
  if (elMunicipio) elMunicipio.textContent = municipio;
}

// Carrega todos os dados reais do MongoDB e preenche a tela inicial profissional
async function carregarDashboardProfissional() {
  await carregarDadosSessaoProfissional();

  // Busca árvores e ocorrências em paralelo com o total municipal de OS.
  const [arvores, ocorrencias, totalOrdens] = await Promise.all([
    buscarListaDaApi("/api/arvores"),
    buscarListaDaApi("/api/ocorrencias"),
    buscarTotalDeOrdens()
  ]);

  // Conta quantas árvores estão classificadas com risco Alto ou Crítico
  const totalRiscoAlto = arvores.filter(arvore => {
    const risco = String(arvore.nivelRisco || arvore.risco || "").toLowerCase();
    return risco.includes("alto") || risco.includes("crít") || risco.includes("crit");
  }).length;

  // Monta os indicadores apenas com os totais reais vindos do banco
  const indicadoresReais = {
    totalArvores: arvores.length,
    totalOcorrencias: ocorrencias.length,
    totalOrdens
  };

  atualizarCardsDashboard(indicadoresReais);
  atualizarAlertaRisco(totalRiscoAlto);
}

// Encerra a sessão no back-end, limpa os dados locais e redireciona para o login
async function encerrarSessaoProfissional() {
  const botaoLogout = document.getElementById("btnLogout");

  try {
    if (botaoLogout) botaoLogout.disabled = true;

    const resposta = await fetch("/api/contas/logout", {
      method: "POST"
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Não foi possível encerrar a sessão.");
    }

    [
      "arborizaUsuario",
      "login",
      "idSetor",
      "nome",
      "nomeUsuario",
      "nomeLogado"
    ].forEach(chave => {
      localStorage.removeItem(chave);
    });

    window.location.replace("/login");
  } catch (erro) {
    console.error("Erro ao encerrar sessão:", erro);
    alert("Não foi possível encerrar sua sessão. Tente novamente.");
    if (botaoLogout) botaoLogout.disabled = false;
  }
}

// Liga o botão de sair e inicia o carregamento dos dados reais
document.getElementById("btnLogout")?.addEventListener("click", encerrarSessaoProfissional);
carregarDashboardProfissional();
