/*
 * Testes isolados do contrato de cadastro de OS.
 * Requer Node.js; utiliza somente módulos nativos, sem npm.
 * Não altera o frontend, não abre navegador e não acessa API ou MongoDB.
 * DOM, respostas de rede e identificadores abaixo existem somente em memória.
 * Valida lógica e contrato da interface; não substitui teste visual nem integração real.
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
const path = require('path');
// Uso na raiz do projeto: node scripts/testar-cadastro-os.cjs
// Opcional: um segundo argumento indica outro arquivo JS local para revisão.
const frontendPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', 'frontend', 'perfil_profissional', 'ordens-servico.js');
if (!fs.existsSync(frontendPath)) {
  console.error('Arquivo de OS não encontrado: ' + frontendPath);
  console.error('Mantenha este script em scripts/ na raiz do projeto, ao lado de frontend/.');
  process.exit(1);
}
const originalSource = fs.readFileSync(frontendPath, 'utf8');
const initialization = /initializeServiceOrdersPage\(\);\s*$/;
if (!initialization.test(originalSource)) {
  console.error('A inicialização esperada da tela de OS não foi encontrada. Revise a compatibilidade do teste com esse arquivo.');
  process.exit(1);
}
// A inicialização da página é removida somente desta cópia em memória.
const source = originalSource.replace(initialization, '');
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
  const context = vm.createContext({console,URL,Date,fetch:async()=>{throw new Error('Requisição sem resposta de teste definida.');},window:{confirm:()=>true},document:{getElementById:node,activeElement:node('focus'),body:{classList:{add(){},remove(){}}}}});
  vm.runInContext(source, context);
  vm.runInContext('renderServiceOrdersTable = () => {};', context);
  const state = vm.runInContext('serviceOrderCreationState',context);
  const orders = vm.runInContext('serviceOrdersState',context);
  orders.loading = false;
  return {context,state,orders,fields,node,run:expression=>vm.runInContext(expression,context)};
}
function draft(e){
  Object.assign(e.state.draft,{titulo:'Serviço',descricao:'Executar serviço',arvoreId:treeId,ocorrenciaId:'',prioridade:'Baixa',observacoes:''});
  e.run('renderServiceOrderCreation()');
}
(async()=>{
  // 1. Opções inválidas e lista sem árvore nunca permitem um POST.
  let e=env(), calls=[];
  e.context.fetch=async(url,init={})=>{calls.push(init.method||'GET');return body(200,{...options,arvores:[{id:'uuid-invalido',nome:'Legada'}]});};
  await e.run('loadServiceOrderCreationOptions()');
  assert.equal(e.state.options,null); assert.ok(e.node('saveCreateServiceOrder').disabled);
  await e.run('submitServiceOrderCreation()'); assert.deepEqual(calls,['GET']);
  e.context.fetch=async(url,init={})=>{calls.push(init.method||'GET');return body(200,{...options,arvores:[]});};
  await e.run('loadServiceOrderCreationOptions()'); draft(e);
  assert.ok(e.node('saveCreateServiceOrder').disabled);
  assert.match(e.node('createServiceOrderOptionsStatus').textContent,/Nenhuma árvore disponível/);
  await e.run('submitServiceOrderCreation()'); assert.equal(calls.filter(method=>method==='POST').length,0);

  console.log('OK 1/3: opções inválidas ou sem árvores impedem o cadastro.');

  // 2. Consulta tardia não apaga digitação; ocorrência preenche apenas por ação explícita.
  e=env(); let resolveOptions;
  e.context.fetch=()=>new Promise(resolve=>{resolveOptions=resolve;});
  const loading=e.run('loadServiceOrderCreationOptions()');
  e.fields.titulo.value='Digitado durante a consulta';
  resolveOptions(body(200,options)); await loading;
  assert.equal(e.fields.titulo.value,'Digitado durante a consulta');
  e.fields.ocorrenciaId.value=occurrenceId; e.run('saveServiceOrderCreationDraft()');
  assert.equal(e.fields.titulo.value,'Digitado durante a consulta');
  e.run('prefillServiceOrderFromOccurrence()');
  assert.equal(e.fields.titulo.value,'Sugestão da ocorrência'); assert.equal(e.fields.arvoreId.value,treeId);
  e.fields.titulo.value='Título editado pelo funcionário'; e.fields.descricao.value='Descrição editada';
  e.fields.arvoreId.value=otherTreeId; e.fields.prioridade.value='Prioridade própria';
  let posted;
  e.context.fetch=async(url,init)=>{posted=JSON.parse(init.body);return body(201,{ordem:{id:orderId,codigo:'OS020261',status:'Aberta',...posted}});};
  await e.run('submitServiceOrderCreation()');
  assert.equal(posted.titulo,'Título editado pelo funcionário'); assert.equal(posted.descricao,'Descrição editada');
  assert.equal(posted.arvoreId,otherTreeId); assert.equal(posted.ocorrenciaId,occurrenceId); assert.equal(posted.prioridade,'Prioridade própria');
  assert.ok(!('equipeId' in posted)); assert.equal(e.state.phase,'saved'); assert.equal(e.orders.orders[0].id,orderId);

  console.log('OK 2/3: edição é preservada; a ocorrência só preenche por ação explícita e o POST usa os campos editados.');

  // 3. Dois submits disparam um POST; resultado incerto mantém dados e não reenvia.
  e=env(); e.state.options=options; draft(e); let failPost; calls=[];
  e.context.fetch=(url,init={})=>{calls.push(init.method||'GET');return new Promise((resolve,reject)=>{failPost=reject;});};
  const sending=e.run('submitServiceOrderCreation()');
  await e.run('submitServiceOrderCreation()'); assert.deepEqual(calls,['POST']);
  e.run('closeCreateServiceOrderModal()'); assert.equal(e.state.phase,'sending'); assert.equal(e.state.draft.titulo,'Serviço');
  failPost(new TypeError('network')); await sending;
  assert.equal(e.state.phase,'unknown'); assert.equal(e.state.draft.titulo,'Serviço'); assert.equal(e.state.draft.arvoreId,treeId);
  await e.run('submitServiceOrderCreation()'); assert.deepEqual(calls,['POST']); assert.ok(e.node('saveCreateServiceOrder').disabled);
  assert.match(e.state.feedback,/Confira a listagem/);
  console.log('OK 3/3: duplo envio é bloqueado; resposta incerta mantém os dados e não repete o POST.');
  console.log('Aprovado: 3 testes isolados de contrato, com 27 verificações.');
  console.log('Nenhuma requisição real ou gravação foi realizada. Integração com os cadastros reais ainda depende do contrato ObjectId.');
})().catch(error=>{console.error(error);process.exitCode=1;});
