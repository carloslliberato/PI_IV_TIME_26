// Autor: Gabrielle Mota, Sophia Fernandes

// Painel inicial profissional: carrega todos os indicadores reais diretamente do back-end (sem dados fictícios).

// Mapeia cada indicador ao ID do elemento HTML e à mensagem exibida quando o valor no banco for zero
const metricasDashboard = [
  { chave: "totalArvores", elemento: "totalArvores", vazio: "Não existem árvores cadastradas neste município." },
  { chave: "totalOcorrencias", elemento: "totalOcorrencias", vazio: "Não existem ocorrências neste município." },
  { chave: "totalOrdens", elemento: "totalOrdens", vazio: "Não existem ordens de serviço neste município." }
];

const municipiosDashboard = {
  "6ae666a7680e8a4330a1ab66": "Campinas - SP",
  "6ae7854cb9962492d01e6af6": "Hortolândia - SP",
  "6ae7856ab9962492d01e6af7": "Sumaré - SP"
};
let municipioDashboardId = "6ae666a7680e8a4330a1ab66";

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

// Atualiza o banner conforme ocorrências de prioridade alta ou crítica.
function atualizarAlertaPrioridade(totalPrioridadeAlta) {
  const alerta = document.getElementById("riskAlert");
  const tituloAlerta = document.getElementById("riskAlertTitle");
  const mensagemAlerta = document.getElementById("riskAlertMessage");

  if (!alerta || !tituloAlerta || !mensagemAlerta) return;

  if (totalPrioridadeAlta === null) {
    alerta.classList.add("risk-alert-clear");
    tituloAlerta.textContent = "Não foi possível verificar os riscos";
    mensagemAlerta.textContent = "Não foi possível consultar as ordens de serviço agora.";
    alerta.setAttribute("aria-label", "Verificação de ocorrências indisponível");
  } else if (totalPrioridadeAlta > 0) {
    alerta.classList.remove("risk-alert-clear");
    tituloAlerta.textContent = "Ocorrências com prioridade alta identificadas";
    mensagemAlerta.textContent = "Existem ocorrências com prioridades altas que exigem atenção.";
    alerta.setAttribute("aria-label", "Ver ocorrências com prioridade alta ou crítica");
  } else {
    alerta.classList.add("risk-alert-clear");
    tituloAlerta.textContent = "Nenhum risco alto identificado";
    mensagemAlerta.textContent = "Não existem ocorrências com alta prioridade.";
    alerta.setAttribute("aria-label", "Ver ocorrências do município");
  }
}

function atualizarAlertaOrdensParadas(totalOrdensParadas) {
  const alerta = document.getElementById("staleOrdersAlert");
  const titulo = document.getElementById("staleOrdersAlertTitle");
  const mensagem = document.getElementById("staleOrdersAlertMessage");
  if (!alerta || !titulo || !mensagem) return;

  if (totalOrdensParadas === null) {
    alerta.classList.add("risk-alert-clear");
    titulo.textContent = "Não foi possível verificar as ordens";
    mensagem.textContent = "Não foi possível consultar as ordens de serviço agora.";
    alerta.setAttribute("aria-label", "Verificação das ordens de serviço indisponível");
  } else if (totalOrdensParadas > 0) {
    alerta.classList.remove("risk-alert-clear");
    titulo.textContent = "Ordens de serviço sem atualização";
    mensagem.textContent = `${totalOrdensParadas} ordem(ns) aberta(s) há mais de 7 dias exigem atenção.`;
    alerta.setAttribute("aria-label", "Ver ordens de serviço abertas há mais de sete dias");
  } else {
    alerta.classList.add("risk-alert-clear");
    titulo.textContent = "Nenhuma ordem parada há mais de 7 dias";
    mensagem.textContent = "Todas as ordens abertas tiveram atualização nos últimos 7 dias.";
    alerta.setAttribute("aria-label", "Ver ordens de serviço do município");
  }
}

function prioridadeExigeAtencao(valor) {
  const prioridade = String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return prioridade === "alta" || prioridade === "critica";
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

// Busca as OS para identificar ocorrências que já foram encaminhadas à equipe.
async function buscarOrdensParaAlerta() {
  try {
    const resposta = await fetch("/api/ordens-servico", {
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    if (!Array.isArray(dados.ordens)) throw new Error("A API não retornou a lista de ordens de serviço.");
    return dados.ordens;
  } catch (erro) {
    console.error("Erro ao consultar ordens de serviço para o alerta:", erro);
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
        if (sessao.municipioId) {
          municipioDashboardId = String(sessao.municipioId).toLowerCase();
          municipio = municipiosDashboard[municipioDashboardId] || municipio;
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
  const [arvores, ocorrencias, totalOrdens, ordens] = await Promise.all([
    buscarListaDaApi("/api/arvores"),
    buscarListaDaApi("/api/ocorrencias"),
    buscarTotalDeOrdens(),
    buscarOrdensParaAlerta()
  ]);

  const arvoresDoMunicipio = arvores.filter(
    arvore => String(arvore.municipioId || "").toLowerCase() === municipioDashboardId
  );
  const ocorrenciasDoMunicipio = ocorrencias.filter(
    ocorrencia => String(ocorrencia.municipioId || "").toLowerCase() === municipioDashboardId
  );

  const ocorrenciasComOrdem = new Set((ordens || [])
    .map(ordem => String(ordem.ocorrenciaId || "").toLowerCase())
    .filter(Boolean));

  // Alerta apenas chamados prioritários que ainda estão recebidos e sem OS vinculada.
  const totalPrioridadeAlta = ordens === null ? null : ocorrenciasDoMunicipio.filter(ocorrencia =>
      String(ocorrencia.status || "").trim().toLocaleLowerCase("pt-BR") === "recebida"
        && !ocorrenciasComOrdem.has(String(ocorrencia._id || "").toLowerCase())
        && prioridadeExigeAtencao(ocorrencia.prioridade || ocorrencia.urgencia)
    ).length;

  const agora = Date.now();
  const seteDiasEmMs = 7 * 24 * 60 * 60 * 1000;
  const totalOrdensParadas = ordens === null ? null : ordens.filter(ordem => {
    const status = String(ordem.status || "").trim().toLocaleLowerCase("pt-BR");
    if (status !== "aberta" && status !== "em andamento") return false;
    const dataReferencia = Date.parse(ordem.dataAtualizacao || ordem.dataCriacao || "");
    return Number.isFinite(dataReferencia) && agora - dataReferencia > seteDiasEmMs;
  }).length;

  // Monta os indicadores apenas com os totais reais vindos do banco
  const indicadoresReais = {
    totalArvores: arvoresDoMunicipio.length,
    totalOcorrencias: ocorrenciasDoMunicipio.length,
    totalOrdens
  };

  atualizarCardsDashboard(indicadoresReais);
  atualizarAlertaPrioridade(totalPrioridadeAlta);
  atualizarAlertaOrdensParadas(totalOrdensParadas);
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
