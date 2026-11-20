/* Testes isolados do contrato da tela: não acessam a API nem alteram dados reais.
 * Autoria: Marialvo Corrêa de Freitas Junior.
 * Execute na raiz do projeto: node scripts/testar-cancelamento-os.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../frontend/perfil_profissional/ordens-servico.js"), "utf8")
  .replace(/initializeServiceOrdersPage\(\);\s*$/, "");
const orderId = "000000000000000000000021";
const activeOrder = { id: orderId, titulo: "OS de teste", status: "Aberta", observacoes: "Observação original." };
const response = (status, value) => ({ status, ok: status >= 200 && status < 300, json: async () => value });
let passed = 0;

function environment(){
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      value: "", hidden: false, innerHTML: "", textContent: "", isConnected: true,
      classList: { add(){}, remove(){}, toggle(){} },
      focus(){ this.focused = true; },
      querySelector(){ return null; }, querySelectorAll(){ return []; },
      listeners: {}, addEventListener(event, callback){ this.listeners[event] = callback; }
    });
    return nodes.get(id);
  };
  const context = vm.createContext({
    console, URL, Date,
    document: { getElementById: node, body: node("body"), activeElement: null, addEventListener(){} },
    window: { confirm(){ throw new Error("O cancelamento não deve usar a confirmação sem motivo."); } },
    fetch(){ throw new Error("Requisição não simulada."); }
  });
  vm.runInContext(source + `
    globalThis.api = {
      state: serviceOrdersState, page: serviceOrdersPage,
      open: cancelServiceOrderFromDetails, closeForm: closeServiceOrderCancellationForm,
      submit: submitServiceOrderCancellation, closeModal: closeServiceOrderDetails,
      validate: validateServiceOrderCancellationReason, details: renderServiceOrderDetails,
      recover: recoverServiceOrderOperation, setup: setupServiceOrdersEvents
    };`, context);
  const { api } = context;
  api.state.currentOrderId = orderId;
  api.state.details.set(orderId, { ...activeOrder });
  api.state.orders = [{ ...activeOrder }];
  api.page.modal.hidden = false;
  api.page.createModal.hidden = true;
  function form(reason){
    const field = { value: reason };
    return {
      dataset: { cancelOrderForm: orderId },
      elements: { namedItem: name => { assert.equal(name, "motivoCancelamento"); return field; } },
      reportValidity: () => true
    };
  }
  return { api, context, node, form };
}

async function test(name, run){
  await run();
  passed++;
  console.log(`OK ${passed}: ${name}`);
}

(async () => {
  await test("abrir, editar e voltar preserva o motivo sem enviar a alteração", async () => {
    const e = environment();
    e.api.setup();
    e.api.open(orderId);
    assert.match(e.api.page.modalContent.innerHTML, /name="motivoCancelamento"[\s\S]*maxlength="1000"/);
    assert.match(e.api.page.modalContent.innerHTML, /Confirmar cancelamento/);
    const form = e.form("Motivo digitado antes de voltar.");
    e.api.page.modalContent.listeners.input({ target: { closest: selector => selector === "[data-cancel-order-form]" ? form : null } });
    e.api.page.modalContent.querySelector = selector => selector === "[data-cancel-order-form]" ? form : null;
    e.api.closeForm(orderId);
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo digitado antes de voltar.");
    assert.equal(e.api.state.cancellationForms.has(orderId), false);
    e.api.open(orderId);
    assert.match(e.api.page.modalContent.innerHTML, /Motivo digitado antes de voltar\./);
    e.api.closeModal();
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo digitado antes de voltar.");
  });

  await test("motivos vazios e acima do limite não enviam PATCH", async () => {
    const e = environment();
    e.api.open(orderId);
    for (const reason of ["", " \t\n ", "\u00A0\u0085\uFEFF", "x".repeat(1001)]){
      await e.api.submit(e.form(reason));
      assert.equal(e.api.state.operations.size, 0);
      assert.equal(e.api.state.feedback.get(orderId).error, true);
    }
    assert.equal(e.api.validate(" x "), "x");
    assert.equal(e.api.validate("\u00A0\u0085\uFEFFMotivo com acentuação.\u0085\u00A0"), "Motivo com acentuação.");
    assert.equal(e.api.validate("á".repeat(1000)).length, 1000);
  });

  await test("confirmação envia motivo e status em um único PATCH e conserva observações", async () => {
    const e = environment();
    e.api.open(orderId);
    let resolve;
    const calls = [];
    e.context.fetch = (url, init) => {
      calls.push({ url, init });
      return new Promise(done => { resolve = done; });
    };
    const form = e.form("  Serviço duplicado.\nConferido pela equipe.  ");
    const sending = e.api.submit(form);
    await e.api.submit(form);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `/api/ordens-servico/${orderId}/status`);
    assert.equal(calls[0].init.method, "PATCH");
    assert.equal(calls[0].init.credentials, "same-origin");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      status: "Cancelada", motivoCancelamento: "Serviço duplicado.\nConferido pela equipe."
    });
    assert.match(e.api.page.modalContent.innerHTML, /<fieldset disabled>/);
    assert.match(e.api.page.modalContent.innerHTML, /Cancelando\.\.\./);
    resolve(response(200, { ordem: { ...activeOrder, status: "Cancelada", motivoCancelamento: "Serviço duplicado.\nConferido pela equipe." } }));
    await sending;
    assert.equal(e.api.state.details.get(orderId).observacoes, "Observação original.");
    assert.equal(e.api.state.cancellationDrafts.has(orderId), false);
    assert.match(e.api.page.modalContent.innerHTML, /Motivo do cancelamento/);
    assert.doesNotMatch(e.api.page.modalContent.innerHTML, /data-cancel-order-form/);
  });

  await test("rejeição 400 preserva rascunho e permite corrigir sem repetir o pedido", async () => {
    const e = environment();
    e.api.open(orderId);
    const calls = [];
    e.context.fetch = async (url, init) => {
      calls.push(init.method);
      return response(400, { erro: "O motivo informado foi rejeitado." });
    };
    await e.api.submit(e.form("Motivo preservado."));
    assert.deepEqual(calls, ["PATCH"]);
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo preservado.");
    assert.equal(e.api.state.cancellationForms.has(orderId), true);
    assert.equal(e.api.state.operations.size, 0);
    assert.equal(e.api.state.feedback.get(orderId).message, "O motivo informado foi rejeitado.");
    assert.equal(e.api.state.feedback.get(orderId).error, true);
  });

  await test("resposta incerta bloqueia novo envio e consulta o motivo persistido", async () => {
    const e = environment();
    e.api.open(orderId);
    const calls = [];
    e.context.fetch = async (url, init) => {
      calls.push(init.method || "GET");
      throw new TypeError("Falha de rede simulada.");
    };
    const form = e.form("Motivo para conferir depois.");
    await e.api.submit(form);
    assert.equal(e.api.state.operations.get(orderId).phase, "unknown");
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo para conferir depois.");
    await e.api.submit(form);
    assert.deepEqual(calls, ["PATCH", "GET"]);
    e.context.fetch = async (url, init) => {
      calls.push(init.method || "GET");
      return response(200, { ordem: { ...activeOrder, status: "Cancelada", motivoCancelamento: "Motivo para conferir depois." } });
    };
    await e.api.recover(orderId, e.api.state.operations.get(orderId));
    assert.deepEqual(calls, ["PATCH", "GET", "GET"]);
    assert.equal(e.api.state.operations.size, 0);
    assert.match(e.api.state.feedback.get(orderId).message, /Cancelamento confirmado/);
  });

  await test("motivo divergente após consulta não recebe confirmação de sucesso", async () => {
    const e = environment();
    e.api.open(orderId);
    const calls = [];
    e.context.fetch = async (url, init) => {
      calls.push(init.method || "GET");
      return response(200, { ordem: { ...activeOrder, status: "Cancelada", motivoCancelamento: "Outro motivo registrado." } });
    };
    await e.api.submit(e.form("Motivo solicitado."));
    assert.deepEqual(calls, ["PATCH", "GET"]);
    assert.equal(e.api.state.feedback.get(orderId).error, true);
    assert.match(e.api.state.feedback.get(orderId).message, /não corresponde ao enviado/);
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo solicitado.");
    assert.match(e.api.page.modalContent.innerHTML, /Outro motivo registrado\./);
  });

  await test("indisponibilidade 503 mantém o rascunho e consulta antes de liberar tentativa", async () => {
    const e = environment();
    e.api.open(orderId);
    const calls = [];
    e.context.fetch = async (url, init) => {
      calls.push(init.method || "GET");
      return init.method === "PATCH"
        ? response(503, { erro: "O servidor de validação está indisponível." })
        : response(200, { ordem: { ...activeOrder } });
    };
    await e.api.submit(e.form("Motivo conservado durante indisponibilidade."));
    assert.deepEqual(calls, ["PATCH", "GET"]);
    assert.equal(e.api.state.cancellationDrafts.get(orderId), "Motivo conservado durante indisponibilidade.");
    assert.equal(e.api.state.cancellationForms.has(orderId), true);
    assert.match(e.api.state.feedback.get(orderId).message, /não foi confirmada/);
    assert.match(e.api.state.feedback.get(orderId).message, /servidor de validação está indisponível/);
    assert.equal(e.api.state.feedback.get(orderId).error, true);
    assert.equal(e.api.state.details.get(orderId).status, "Aberta");
  });

  await test("consulta exibe motivo como texto e identifica registros antigos sem motivo", async () => {
    const e = environment();
    e.api.details({ ...activeOrder, status: "Cancelada", motivoCancelamento: '<img src=x onerror="alert(1)">\nLinha 2' });
    assert.match(e.api.page.modalContent.innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.doesNotMatch(e.api.page.modalContent.innerHTML, /<img|data-cancel-order-form/);
    for (const motivoCancelamento of [undefined, null, ""]){
      e.api.details({ ...activeOrder, status: "Cancelada", motivoCancelamento });
      assert.match(e.api.page.modalContent.innerHTML, /Motivo não registrado\./);
    }
    e.api.details({ ...activeOrder });
    assert.doesNotMatch(e.api.page.modalContent.innerHTML, /serviceOrderCancellationRecordTitle/);
  });

  console.log(`Aprovado: ${passed} cenários isolados de cancelamento de OS.`);
  console.log("Nenhuma API real foi chamada. Estes testes não validam o visual da tela nem a gravação no MongoDB.");
})().catch(error => { console.error("Falha nos testes isolados de cancelamento:", error); process.exitCode = 1; });
