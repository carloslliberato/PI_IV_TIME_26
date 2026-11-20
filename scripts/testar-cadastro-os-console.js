/*
 * Cole este arquivo inteiro no Console do DevTools da página Ordens de serviço.
 * Não exige Node.js. Única requisição real: GET do próprio JavaScript da tela.
 * O restante usa cópias em memória, DOM fictício e respostas de rede fictícias.
 * Não troca window.fetch, não modifica a página e não chama API de dados.
 */
(async () => {
  const scriptResponse = await fetch("/perfil_profissional/ordens-servico.js", {
    method: "GET", credentials: "same-origin", cache: "no-store"
  });
  if (!scriptResponse.ok) throw new Error(`Não foi possível ler o JavaScript da tela (HTTP ${scriptResponse.status}).`);
  const originalSource = await scriptResponse.text();
  const initialization = /initializeServiceOrdersPage\(\);\s*$/;
  if (!initialization.test(originalSource)) throw new Error("O JavaScript recebido não corresponde à inicialização esperada da tela de OS.");
  const source = originalSource.replace(initialization, "");
  let checks = 0;
  const assert = {
    equal(actual, expected){ checks++; if (!Object.is(actual, expected)) throw new Error(`Verificação ${checks}: esperado ${JSON.stringify(expected)}, recebido ${JSON.stringify(actual)}.`); },
    ok(value){ checks++; if (!value) throw new Error(`Verificação ${checks}: condição não atendida.`); },
    deepEqual(actual, expected){ checks++; if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Verificação ${checks}: sequência diferente da esperada.`); },
    match(value, pattern){ checks++; if (!pattern.test(value)) throw new Error(`Verificação ${checks}: mensagem diferente da esperada.`); }
  };
  // As variáveis e funções da aplicação ficam dentro desta cópia local.
  const factory = new Function("document", "window", "fetch", "console", source + `
    renderServiceOrdersTable = () => {};
    return {
      state: serviceOrderCreationState, orders: serviceOrdersState,
      renderServiceOrderCreation, loadServiceOrderCreationOptions,
      submitServiceOrderCreation, saveServiceOrderCreationDraft,
      prefillServiceOrderFromOccurrence, closeCreateServiceOrderModal
    };
  `);
const treeId = '000000000000000000000001';
const otherTreeId = '000000000000000000000002';
const occurrenceId = '000000000000000000000003';
const orderId = '000000000000000000000004';
const options = {
  municipioId: '6ae666a7680e8a4330a1ab66',
  arvores: [{id:treeId,nome:'Árvore A',endereco:'Rua A',bairro:'Centro'}, {id:otherTreeId,nome:'Árvore B',endereco:'Rua B',bairro:'Centro'}],
  ocorrencias: [{id:occurrenceId,codigo:'OC020261',titulo:'Sugestão da ocorrência',descricao:'Descrição da ocorrência',arvoreId:treeId,prioridade:'Alta'}],
  referenciasIncompativeis:false, avisos:[]
};
const body = (status, data) => ({status,ok:status >= 200 && status < 300,json:async()=>data});
function env(){
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {
      id,hidden:false,value:'',disabled:false,innerHTML:'',textContent:'',isConnected:true,
      focus(){},insertAdjacentHTML(_, value){this.innerHTML += value;},
      classList:{toggle(){},add(){},remove(){}},querySelector(){return null;},querySelectorAll(){return [];}
    });
    return nodes.get(id);
  };
  const fields = Object.fromEntries(Object.entries({titulo:'Title',descricao:'Description',arvoreId:'Tree',ocorrenciaId:'Occurrence',prioridade:'Priority',observacoes:'Notes'})
    .map(([name,suffix])=>[name,node('createServiceOrder'+suffix)]));
  node('createServiceOrderForm').elements = {namedItem:name=>fields[name]};
  node('createServiceOrderForm').reportValidity = ()=>true;
  node('serviceOrderModal').hidden = true;
  const context = {fetch:async()=>{throw new Error('Requisição sem resposta de teste definida.');}};
  const fakeDocument = {getElementById:node,activeElement:node('focus'),body:{classList:{add(){},remove(){}}}};
  const api = factory(fakeDocument, {confirm:()=>true}, (...args)=>context.fetch(...args), console);
  api.orders.loading = false;
  return {context,api,state:api.state,orders:api.orders,fields,node};
}
function draft(e){
  Object.assign(e.state.draft,{titulo:'Serviço',descricao:'Executar serviço',arvoreId:treeId,ocorrenciaId:'',prioridade:'Baixa',observacoes:''});
  e.api.renderServiceOrderCreation();
}
await (async()=>{
  // 1. Opções inválidas e lista sem árvore nunca permitem um POST.
  let e=env(), calls=[];
  e.context.fetch=async(url,init={})=>{calls.push(init.method||'GET');return body(200,{...options,arvores:[{id:'uuid-invalido',nome:'Legada'}]});};
  await e.api.loadServiceOrderCreationOptions();
  assert.equal(e.state.options,null); assert.ok(e.node('saveCreateServiceOrder').disabled);
  await e.api.submitServiceOrderCreation(); assert.deepEqual(calls,['GET']);
  e.context.fetch=async(url,init={})=>{calls.push(init.method||'GET');return body(200,{...options,arvores:[]});};
  await e.api.loadServiceOrderCreationOptions(); draft(e);
  assert.ok(e.node('saveCreateServiceOrder').disabled);
  assert.match(e.node('createServiceOrderOptionsStatus').textContent,/Nenhuma árvore disponível/);
  await e.api.submitServiceOrderCreation(); assert.equal(calls.filter(method=>method==='POST').length,0);

  console.log('OK 1/3: opções inválidas ou sem árvores impedem o cadastro.');

  // 2. Consulta tardia não apaga digitação; ocorrência preenche apenas por ação explícita.
  e=env(); let resolveOptions;
  e.context.fetch=()=>new Promise(resolve=>{resolveOptions=resolve;});
  const loading=e.api.loadServiceOrderCreationOptions();
  e.fields.titulo.value='Digitado durante a consulta';
  resolveOptions(body(200,options)); await loading;
  assert.equal(e.fields.titulo.value,'Digitado durante a consulta');
  e.fields.ocorrenciaId.value=occurrenceId; e.api.saveServiceOrderCreationDraft();
  assert.equal(e.fields.titulo.value,'Digitado durante a consulta');
  e.api.prefillServiceOrderFromOccurrence();
  assert.equal(e.fields.titulo.value,'Sugestão da ocorrência'); assert.equal(e.fields.arvoreId.value,treeId);
  e.fields.titulo.value='Título editado pelo funcionário'; e.fields.descricao.value='Descrição editada';
  e.fields.arvoreId.value=otherTreeId; e.fields.prioridade.value='Prioridade própria';
  let posted;
  e.context.fetch=async(url,init)=>{posted=JSON.parse(init.body);return body(201,{ordem:{id:orderId,codigo:'OS020261',status:'Aberta',...posted}});};
  await e.api.submitServiceOrderCreation();
  assert.equal(posted.titulo,'Título editado pelo funcionário'); assert.equal(posted.descricao,'Descrição editada');
  assert.equal(posted.arvoreId,otherTreeId); assert.equal(posted.ocorrenciaId,occurrenceId); assert.equal(posted.prioridade,'Prioridade própria');
  assert.ok(!('equipeId' in posted)); assert.equal(e.state.phase,'saved'); assert.equal(e.orders.orders[0].id,orderId);

  console.log('OK 2/3: edição é preservada; a ocorrência só preenche por ação explícita e o POST usa os campos editados.');

  // 3. Dois submits disparam um POST; resultado incerto mantém dados e não reenvia.
  e=env(); e.state.options=options; draft(e); let failPost; calls=[];
  e.context.fetch=(url,init={})=>{calls.push(init.method||'GET');return new Promise((resolve,reject)=>{failPost=reject;});};
  const sending=e.api.submitServiceOrderCreation();
  await e.api.submitServiceOrderCreation(); assert.deepEqual(calls,['POST']);
  e.api.closeCreateServiceOrderModal(); assert.equal(e.state.phase,'sending'); assert.equal(e.state.draft.titulo,'Serviço');
  failPost(new TypeError('network')); await sending;
  assert.equal(e.state.phase,'unknown'); assert.equal(e.state.draft.titulo,'Serviço'); assert.equal(e.state.draft.arvoreId,treeId);
  await e.api.submitServiceOrderCreation(); assert.deepEqual(calls,['POST']); assert.ok(e.node('saveCreateServiceOrder').disabled);
  assert.match(e.state.feedback,/Confira a listagem/);
  console.log('OK 3/3: duplo envio é bloqueado; resposta incerta mantém os dados e não repete o POST.');
  console.log(`Aprovado: 3 testes isolados de contrato, com ${checks} verificações.`);
  console.log('Somente o JavaScript da página foi lido. Nenhuma API de dados foi chamada e nenhum dado real foi alterado.');
  console.log('A integração real ainda depende dos cadastros com ObjectId. Este teste não valida o visual da tela.');
})();

})().catch(error => console.error("Falha no teste isolado de cadastro de OS:", error));
