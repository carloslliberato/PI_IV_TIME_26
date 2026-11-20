// Autor: Gabrielle Mota

/* Histórico de intervenções: componente de consulta, sem ativação automática na página. */
(function (global){
  "use strict";

  if (global.HistoricoIntervencoes?.montar) return;

  const CAMINHO_CSS = "/perfil_profissional/historico-intervencoes.css";
  const formatoData = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short"
  });

  function carregarEstilos(){
    if (document.querySelector('link[data-historico-intervencoes-estilos]')
        || document.querySelector('link[href="' + CAMINHO_CSS + '"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CAMINHO_CSS;
    link.setAttribute("data-historico-intervencoes-estilos", "true");
    (document.head || document.documentElement).appendChild(link);
  }

  function elemento(tag, classe, texto){
    const node = document.createElement(tag);
    node.className = classe;
    if (texto !== undefined) node.textContent = String(texto);
    return node;
  }

  function dataFormatada(valor){
    if (typeof valor !== "string" || !valor) return null;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : formatoData.format(data);
  }

  function linkDeFoto(valor){
    if (typeof valor !== "string") return null;
    try {
      const url = new URL(valor.trim());
      if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
      return url.href;
    } catch{
      return null;
    }
  }

  function registro(intervencao){
    const item = elemento("li", "historico-intervencoes-item");
    const cabecalho = elemento("div", "historico-intervencoes-item-cabecalho");
    cabecalho.appendChild(elemento("h4", "historico-intervencoes-tipo",
      typeof intervencao.tipo === "string" && intervencao.tipo.trim() ? intervencao.tipo : "Intervenção"));
    cabecalho.appendChild(elemento("p", "historico-intervencoes-execucao",
      "Executado em: " + (dataFormatada(intervencao.dataExecucao) || "Data não informada")));
    item.appendChild(cabecalho);
    item.appendChild(elemento("p", "historico-intervencoes-descricao",
      typeof intervencao.descricao === "string" && intervencao.descricao.trim()
        ? intervencao.descricao : "Descrição não informada."));

    const criadaEm = dataFormatada(intervencao.dataCriacao);
    if (criadaEm) item.appendChild(elemento("p", "historico-intervencoes-registro", "Registrado em: " + criadaEm));

    const fotos = (Array.isArray(intervencao.fotos) ? intervencao.fotos : []).map(linkDeFoto).filter(Boolean);
    if (fotos.length){
      const links = elemento("ul", "historico-intervencoes-fotos");
      links.setAttribute("aria-label", "Fotos da intervenção");
      fotos.forEach((url, indice) => {
        const foto = elemento("li", "historico-intervencoes-foto");
        const link = elemento("a", "historico-intervencoes-link", "Ver foto " + (indice + 1));
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", "Ver foto " + (indice + 1) + " (abre em outra aba)");
        foto.appendChild(link);
        links.appendChild(foto);
      });
      item.appendChild(links);
    }
    return item;
  }

  function mensagemErro(status, recebeuResposta){
    if (status === 401) return "Sua sessão expirou. Entre novamente para consultar o histórico.";
    if (status === 403) return "Você não tem permissão para consultar o histórico desta árvore.";
    if (status === 400) return "Não foi possível consultar esta árvore. Verifique seu cadastro.";
    if (status === 404) return "O histórico solicitado não foi encontrado.";
    return recebeuResposta
      ? "O histórico está indisponível no momento. Tente atualizar novamente."
      : "Não foi possível conectar ao histórico. Verifique a conexão e tente atualizar.";
  }

  function montar(container, opcoes = {}){
    if (!container || typeof container.appendChild !== "function"){
      throw new TypeError("Informe um elemento para montar o histórico de intervenções.");
    }
    carregarEstilos();
    const arvoreId = typeof opcoes.arvoreId === "string" ? opcoes.arvoreId.trim().toLowerCase() : "";
    const idValido = /^[a-f0-9]{24}$/.test(arvoreId);
    const raiz = elemento("section", "historico-intervencoes-root");
    raiz.setAttribute("aria-label", "Histórico de intervenções da árvore");
    const cabecalho = elemento("div", "historico-intervencoes-cabecalho");
    const titulos = elemento("div", "historico-intervencoes-titulos");
    titulos.appendChild(elemento("h3", "historico-intervencoes-titulo", "Histórico de intervenções"));
    titulos.appendChild(elemento("p", "historico-intervencoes-fuso", "Horários de São Paulo"));
    cabecalho.appendChild(titulos);
    const botao = elemento("button", "historico-intervencoes-atualizar", "Atualizar");
    botao.type = "button";
    cabecalho.appendChild(botao);
    raiz.appendChild(cabecalho);
    const situacao = elemento("p", "historico-intervencoes-situacao");
    situacao.setAttribute("role", "status");
    situacao.setAttribute("aria-live", "polite");
    raiz.appendChild(situacao);
    const lista = elemento("ol", "historico-intervencoes-lista");
    raiz.appendChild(lista);
    container.appendChild(raiz);

    let destruido = false;
    let requisicaoAtual = 0;
    let controlador = null;

    function estado(nome, mensagem){
      raiz.setAttribute("data-state", nome);
      raiz.setAttribute("aria-busy", String(nome === "loading"));
      situacao.textContent = mensagem;
      botao.disabled = nome === "loading" || nome === "invalid";
      botao.textContent = nome === "loading" ? "Atualizando..." : "Atualizar";
    }

    async function atualizar(){
      if (destruido) return;
      const token = ++requisicaoAtual;
      if (controlador) controlador.abort();
      controlador = null;
      lista.replaceChildren();
      if (!idValido) {
        estado("invalid", "Não foi possível consultar o histórico: o identificador da árvore é inválido.");
        return;
      }
      const atual = new AbortController();
      controlador = atual;
      estado("loading", "Carregando histórico de intervenções...");
      let resposta = null;
      try {
        resposta = await fetch("/api/intervencoes?arvoreId=" + encodeURIComponent(arvoreId), {
          credentials: "same-origin", cache: "no-store", signal: atual.signal
        });
        if (destruido || token !== requisicaoAtual) return;
        if (!resposta.ok) {
          const erro = new Error("Consulta indisponível.");
          erro.status = resposta.status;
          throw erro;
        }
        const dados = await resposta.json();
        if (destruido || token !== requisicaoAtual) return;
        if (!Array.isArray(dados?.intervencoes) || dados.intervencoes.some(item =>
          !item || typeof item !== "object" || Array.isArray(item)
          || typeof item.arvoreId !== "string" || item.arvoreId.toLowerCase() !== arvoreId)) {
          throw new Error("Histórico inválido.");
        }
        if (!dados.intervencoes.length) {
          estado("empty", "Nenhuma intervenção encontrada para esta árvore.");
          return;
        }
        dados.intervencoes.forEach(item => lista.appendChild(registro(item)));
        const quantidade = dados.intervencoes.length;
        estado("ready", quantidade + (quantidade === 1 ? " intervenção registrada." : " intervenções registradas."));
      } catch (erro) {
        if (destruido || token !== requisicaoAtual || atual.signal.aborted) return;
        lista.replaceChildren();
        estado("error", mensagemErro(erro.status, Boolean(resposta)));
      } finally {
        if (token === requisicaoAtual) controlador = null;
      }
    }

    function aoAtualizar(){ atualizar(); }
    botao.addEventListener("click", aoAtualizar);

    function destruir(){
      if (destruido) return;
      destruido = true;
      requisicaoAtual += 1;
      if (controlador) controlador.abort();
      controlador = null;
      botao.removeEventListener("click", aoAtualizar);
      raiz.remove();
    }

    const pronto = atualizar();
    return { pronto, atualizar, destruir };
  }

  global.HistoricoIntervencoes = Object.freeze({ montar });
})(window);
