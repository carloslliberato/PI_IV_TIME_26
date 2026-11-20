// Cole no Console da tela de ordens de serviço, com a conta profissional conectada.
// Este painel temporário consulta a API existente; não cadastra nem altera registros.
(async () => {
  "use strict";
  const painelId = "arboriza-verificar-historico";
  const existente = document.getElementById(painelId);
  if (existente) { existente.focus(); return; }

  const estilo = document.createElement("style");
  estilo.textContent = `
    #${painelId} { width: min(920px, calc(100vw - 32px)); max-height: calc(100vh - 48px); overflow: auto; padding: 24px; border: 1px solid #c9ddd2; border-radius: 14px; background: #fff; color: #183b30; font-family: Arial,sans-serif; }
    #${painelId}::backdrop { background: rgba(13,35,25,.55); }
    #${painelId} .verificar-historico-cabecalho { display:flex; justify-content:space-between; align-items:center; gap:16px; }
    #${painelId} h2 { margin:0; font-size:24px; }
    #${painelId} .verificar-historico-texto { color:#526a5e; line-height:1.5; }
    #${painelId} form { display:flex; flex-wrap:wrap; gap:10px; margin:20px 0; align-items:center; }
    #${painelId} label { width:100%; font-weight:700; }
    #${painelId} input { flex:1; min-width:200px; padding:11px; border:1px solid #a2b9ac; border-radius:6px; font:inherit; }
    #${painelId} .verificar-historico-botao { border:1px solid #176849; border-radius:6px; padding:11px 16px; background:#176849; color:white; font:inherit; font-weight:700; cursor:pointer; }
    #${painelId} .verificar-historico-botao:disabled { opacity:.6; cursor:wait; }
    #${painelId} :focus-visible { outline:3px solid #73bd98; outline-offset:3px; }
  `;
  document.head.appendChild(estilo);
  const painel = document.createElement("dialog");
  painel.id = painelId;
  painel.setAttribute("aria-labelledby", painelId + "-titulo");
  const cabecalho = document.createElement("div");
  cabecalho.className = "verificar-historico-cabecalho";
  const titulo = document.createElement("h2");
  titulo.id = painelId + "-titulo";
  titulo.textContent = "Verificar histórico de intervenções";
  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "verificar-historico-botao";
  fechar.textContent = "Fechar";
  cabecalho.append(titulo, fechar);
  const explicacao = document.createElement("p");
  explicacao.className = "verificar-historico-texto";
  explicacao.textContent = "Consulta somente leitura. Informe uma árvore do município da sua conta profissional e clique em Consultar. Nenhum registro será criado ou alterado.";
  const form = document.createElement("form");
  const label = document.createElement("label");
  label.htmlFor = painelId + "-arvore";
  label.textContent = "ID da árvore (ObjectId)";
  const input = document.createElement("input");
  input.id = label.htmlFor;
  input.type = "text";
  input.required = true;
  input.maxLength = 24;
  input.pattern = "[a-fA-F0-9]{24}";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = "000000000000000000000001";
  const consultar = document.createElement("button");
  consultar.type = "submit";
  consultar.className = "verificar-historico-botao";
  consultar.textContent = "Consultar";
  consultar.disabled = true;
  form.append(label, input, consultar);
  const mensagem = document.createElement("p");
  mensagem.className = "verificar-historico-texto";
  mensagem.setAttribute("role", "status");
  mensagem.setAttribute("aria-live", "polite");
  mensagem.textContent = "Carregando o componente de consulta…";
  const conteudo = document.createElement("div");
  painel.append(cabecalho, explicacao, form, mensagem, conteudo);
  document.body.appendChild(painel);
  let instancia = null;
  let encerrado = false;

  function limpar() {
    if (encerrado) return;
    encerrado = true;
    instancia?.destruir();
    painel.remove();
    estilo.remove();
  }
  fechar.addEventListener("click", () => painel.close());
  painel.addEventListener("close", limpar, { once: true });
  painel.showModal();

  try {
    const css = "/perfil_profissional/historico-intervencoes.css";
    if (!Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link => link.getAttribute("href") === css)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = css;
      document.head.appendChild(link);
    }
    if (!window.HistoricoIntervencoes?.montar) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "/perfil_profissional/historico-intervencoes.js";
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", () => reject(new Error("Não foi possível carregar o componente. Confira se os arquivos foram copiados.")), { once: true });
        document.head.appendChild(script);
      });
    }
    if (encerrado) return;
    if (!window.HistoricoIntervencoes?.montar) throw new Error("O componente de histórico não está disponível.");
    mensagem.textContent = "Pronto. O ID preenchido corresponde à árvore usada nos testes anteriores; a consulta só começa ao clicar em Consultar.";
    consultar.disabled = false;
    input.focus();
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!form.reportValidity() || encerrado) return;
      instancia?.destruir();
      mensagem.textContent = "";
      consultar.disabled = true;
      const atual = window.HistoricoIntervencoes.montar(conteudo, { arvoreId: input.value.trim() });
      instancia = atual;
      try { await atual.pronto; }
      catch (erro) { if (!encerrado && instancia === atual) mensagem.textContent = "Não foi possível apresentar o histórico. Feche o painel e tente novamente."; }
      finally { if (!encerrado && instancia === atual) consultar.disabled = false; }
    });
  } catch (erro) {
    if (!encerrado) mensagem.textContent = erro.message || "Não foi possível abrir o componente de histórico.";
  }
})();
