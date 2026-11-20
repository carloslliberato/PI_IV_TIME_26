// Executar com Node.js na raiz do repositório: node scripts/testar-historico-intervencoes.cjs
// Testes isolados: fetch e DOM são dublês, sem consultar o backend ou o MongoDB.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const source = fs.readFileSync(path.join(__dirname, "../frontend/perfil_profissional/historico-intervencoes.js"), "utf8");
const treeId = "000000000000000000000001";

class Elemento {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase(); this.nodeName = this.tagName; this.nodeType = 1;
    this.children = []; this.parentNode = null; this.dataset = {}; this.attributes = {};
    this.style = {}; this.className = ""; this.hidden = false; this.disabled = false; this._texto = "";
    this.listeners = new Map();
    this.classList = {
      add: (...nomes) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...nomes])].join(" "); },
      remove: (...nomes) => { this.className = this.className.split(/\s+/).filter(n => !nomes.includes(n)).join(" "); },
      contains: nome => this.className.split(/\s+/).includes(nome)
    };
  }
  get childNodes() { return this.children; }
  get firstChild() { return this.children[0] || null; }
  get parentElement() { return this.parentNode; }
  get isConnected() { return !!this.parentNode; }
  get textContent() { return this._texto + this.children.map(n => n.textContent).join(""); }
  set textContent(valor) { this.replaceChildren(); this._texto = String(valor ?? ""); }
  set innerHTML(_) { throw new Error("Inserção de HTML não permitida neste teste; use textContent para os dados."); }
  appendChild(filho) { if (filho.parentNode) filho.remove(); filho.parentNode = this; this.children.push(filho); return filho; }
  append(...filhos) { for (let filho of filhos) { if (typeof filho === "string") { const texto = new Elemento("#text"); texto.textContent = filho; filho = texto; } this.appendChild(filho); } }
  replaceChildren(...filhos) { for (const filho of this.children) filho.parentNode = null; this.children = []; this._texto = ""; this.append(...filhos); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(n => n !== this); this.parentNode = null; } }
  removeChild(filho) { filho.remove(); return filho; }
  contains(filho) { return this === filho || this.children.some(n => n.contains(filho)); }
  setAttribute(nome, valor) { this.attributes[nome] = String(valor); if (nome === "class") this.className = String(valor); if (nome.startsWith("data-")) this.dataset[nome.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(valor); }
  getAttribute(nome) { if (nome === "class") return this.className; return this.attributes[nome] ?? null; }
  removeAttribute(nome) { delete this.attributes[nome]; }
  addEventListener(tipo, fn) { this.listeners.set(tipo, fn); }
  removeEventListener(tipo) { this.listeners.delete(tipo); }
  focus() {}
  querySelectorAll(seletor) { return visitar(this).filter(n => seletor.startsWith(".") ? n.classList.contains(seletor.slice(1)) : n.tagName === seletor.toUpperCase()); }
  querySelector(seletor) { return this.querySelectorAll(seletor)[0] || null; }
}
function visitar(raiz) { return raiz.children.flatMap(filho => [filho, ...visitar(filho)]); }
function ambiente(fetch) {
  const document = { createElement: tag => new Elemento(tag), createDocumentFragment: () => new Elemento("#fragment"), body: new Elemento("body"), head: new Elemento("head") };
  document.querySelector = seletor => visitar(document.head).find(node => node.tagName === "LINK" && (
    seletor.includes("data-historico-intervencoes-estilos") ? node.getAttribute("data-historico-intervencoes-estilos") !== null
      : seletor.includes('href="' + node.href + '"')
  )) || null;
  const host = new Elemento("section"); document.body.append(host);
  const window = { document, fetch, HTMLElement: Elemento, Element: Elemento, location: { origin: "http://localhost:8080", href: "http://localhost:8080/ordens-servico" } };
  const context = vm.createContext({ window, document, HTMLElement: Elemento, Element: Elemento, Node: Elemento, fetch, AbortController, URL, Intl, Date, console, setTimeout, clearTimeout });
  vm.runInContext(source, context);
  return { host, api: window.HistoricoIntervencoes };
}
const resposta = (status, dados) => ({ status, ok: status >= 200 && status < 300, json: async () => dados });
const intervencao = overrides => ({
  id: "000000000000000000000002", municipioId: "000000000000000000000003", arvoreId: treeId,
  ordemServicoId: null, equipeId: null, usuarioId: "000000000000000000000004",
  tipo: "Inspeção", descricao: "Serviço executado.", fotos: [],
  dataExecucao: "2026-11-20T13:00:00Z", dataCriacao: "2026-11-20T14:00:00Z", ...overrides
});
const raiz = host => visitar(host).find(n => n.classList.contains("historico-intervencoes-root"));
const estado = host => raiz(host)?.dataset.state;

(async () => {
  let chamadas = [];
  let e = ambiente(async (url, options) => { chamadas.push({ url, options }); return resposta(200, { intervencoes: [] }); });
  let controle = e.api.montar(e.host, { arvoreId: "uuid-incompativel" });
  await controle.pronto;
  assert.equal(chamadas.length, 0); assert.equal(estado(e.host), "invalid");
  controle.destruir();
  controle = e.api.montar(e.host, { arvoreId: treeId });
  await controle.pronto;
  assert.equal(estado(e.host), "empty"); assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0].options.credentials, "same-origin");
  assert.match(chamadas[0].url, new RegExp("arvoreId=" + treeId));
  assert.ok(!chamadas[0].options.method || chamadas[0].options.method === "GET");

  e = ambiente(async () => resposta(200, { intervencoes: [intervencao({ descricao: "<img src=x onerror=alert(1)>", fotos: ["https://example.org/foto.jpg", "javascript:alert(1)", "https://usuario:senha@example.org/foto.jpg", "data:image/png;base64,AAAA"] })] }));
  controle = e.api.montar(e.host, { arvoreId: treeId }); await controle.pronto;
  assert.equal(estado(e.host), "ready");
  assert.ok(e.host.textContent.includes("<img src=x onerror=alert(1)>"));
  assert.equal(visitar(e.host).filter(n => n.tagName === "IMG" || n.tagName === "SCRIPT").length, 0);
  const links = visitar(e.host).filter(n => n.tagName === "A");
  assert.equal(links.length, 1);
  assert.ok(links.some(n => (n.href || n.getAttribute("href")) === "https://example.org/foto.jpg"));
  assert.ok(links.every(n => /^https?:/.test(n.href || n.getAttribute("href") || "")));
  assert.ok(links.every(n => /noopener/.test(n.rel || n.getAttribute("rel") || "")));
  assert.match(e.host.textContent, /20\/11\/2026/);
  assert.match(e.host.textContent, /10:00/, "Execução às 13h UTC deve aparecer às 10h em São Paulo");

  for (const codigo of [401, 403, 500]) {
    e = ambiente(async () => resposta(codigo, { erro: "Mensagem de teste" }));
    controle = e.api.montar(e.host, { arvoreId: treeId }); await controle.pronto;
    assert.equal(estado(e.host), "error", "HTTP " + codigo + " não deve aparecer como histórico vazio");
  }

  const pendentes = [];
  e = ambiente((url, options) => new Promise(resolve => pendentes.push({ resolve, options })));
  controle = e.api.montar(e.host, { arvoreId: treeId });
  const atualizar = controle.atualizar();
  assert.equal(pendentes.length, 2);
  pendentes[1].resolve(resposta(200, { intervencoes: [] })); await atualizar;
  pendentes[0].resolve(resposta(200, { intervencoes: [intervencao()] })); await controle.pronto;
  assert.equal(estado(e.host), "empty", "Resposta antiga não pode substituir a consulta mais recente");

  let resolver;
  let sinal;
  e = ambiente((url, options) => { sinal = options.signal; return new Promise(resolve => { resolver = resolve; }); });
  const preservado = new Elemento("p"); preservado.textContent = "Conteúdo de outra parte da tela"; e.host.append(preservado);
  controle = e.api.montar(e.host, { arvoreId: treeId }); controle.destruir();
  resolver(resposta(200, { intervencoes: [intervencao()] })); await controle.pronto;
  assert.ok(sinal.aborted); assert.ok(e.host.contains(preservado)); assert.equal(raiz(e.host), undefined);
  console.log("PASS: ID inválido, vazio, GET com same-origin, dados como texto, links seguros, datas, HTTP401/403/500, corrida e destruição.");
})().catch(erro => { console.error(erro); process.exitCode = 1; });
