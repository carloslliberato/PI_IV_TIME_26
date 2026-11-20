# Cadastro de ordens de serviço

## Validação no servidor Socket

Os campos de cadastro, conclusão e atribuição de equipe são validados em `servidor/src/service/ValidadorOrdemDeServico.java`. O backend envia um pedido pelo Socket e utiliza os dados normalizados da resposta antes de reservar o código ou gravar. Sessão, município, existência de referências e regras transacionais permanecem no backend.

Após atualizar este bloco, reinicie os dois processos: primeiro `:servidor:run`, depois `:backend:run`. Reprovação dos dados retorna HTTP 400; indisponibilidade, timeout ou resposta incompatível retorna HTTP 503 antes de qualquer gravação da operação. A espera pela resposta da validação de OS é de até 5 segundos. Depois de uma falha de comunicação, a conexão é encerrada; com o servidor disponível, reinicie o backend para restabelecê-la.

Os testes puros antigos de cadastro, conclusão e equipe foram reunidos em `servidor/test/service/ValidadorOrdemDeServicoTest.java`. `OrdemDeServicoSocketTest` exercita a comunicação real em porta temporária e `ValidadorOrdemDeServicoRemotoTest` confere o adaptador no backend. Esses testes não gravam no MongoDB.


## Aplicação

Base: main `39c23c0` (PR31). Copiar as pastas do pacote para a raiz `PI_IV_TIME_26`, preservando subpastas e substituindo apenas arquivos correspondentes. Rotas e imports necessários já estão incluídos. Reiniciar o backend e atualizar o navegador com Ctrl+F5.

## Regras do cadastro

- Exige funcionário autenticado com município vinculado à conta.
- O município da OS é obtido pela conta no backend.
- Título, descrição e árvore são obrigatórios. Título até 160 caracteres, descrição até 4000, observações opcionais até 4000 e prioridade opcional até 40.
- A nova OS começa Aberta, sem equipe. A atribuição posterior usa a operação já existente na tela.
- O código de acompanhamento é gerado pelo sistema no formato OS + ano com cinco dígitos + sequencial anual (por exemplo OS020261). O ObjectId continua sendo a identidade interna.
- A ocorrência é opcional. Seus dados podem preencher o formulário para ajudar o usuário, mas os valores finais de título, descrição, árvore e prioridade podem ser editados. O backend valida e preserva os valores enviados.
- A árvore e a ocorrência selecionadas devem existir no mesmo município. Uma árvore explicitamente arquivada não pode ser usada em nova OS.
- O contador reserva números; falhas de criação podem deixar lacunas. Não se exige sequência sem lacunas.

## Referências entre módulos — dependência atual

O contrato para as coleções `arvores` e `ocorrencias` exige `_id` BSON ObjectId e `municipioId` BSON ObjectId igual ao município da conta. As respostas HTTP apresentam esses identificadores como texto hexadecimal. Na ocorrência, `arvoreId` serve como indicação para preencher o formulário; o usuário pode selecionar outra árvore válida do mesmo município antes de salvar.

No baseline 39c23c0, o módulo de árvores ainda gera String UUID e o de ocorrências usa String `oco_...` e município textual. Esses fluxos não produzem as referências canônicas exigidas pela OS. O pacote não converte, não migra e não altera esses cadastros.

A lista de opções inclui somente referências compatíveis. A criação com dados reais depende de os respectivos módulos gravarem e consultarem os ObjectIds combinados, inclusive nas operações de busca e atualização. Não inserir manualmente documentos com tipos diferentes no banco compartilhado para forçar um teste: o leitor antigo de árvores espera município String e pode falhar.

O aviso de incompatibilidade cobre documentos com município ObjectId ou a sua representação hexadecimal exata. Ele não associa apelidos como campinas a municípios; a ausência de aviso não comprova que todos os dados legados estejam alinhados.

## Consultar opções

`GET /api/ordens-servico/opcoes-cadastro`

Resposta 200:

```json
{
  "municipioId": "ObjectId em hexadecimal",
  "arvores": [{"id":"ObjectId em hexadecimal","nome":"Nome da árvore","endereco":"Endereço","bairro":"Bairro"}],
  "ocorrencias": [{"id":"ObjectId em hexadecimal","codigo":"Código de exibição","titulo":"Título","descricao":"Descrição","arvoreId":null,"prioridade":null}],
  "referenciasIncompativeis": false,
  "avisos": []
}
```

Esse endpoint é somente leitura. O município não é escolhido livremente pelo cliente.

## Criar OS

`POST /api/ordens-servico`

Cabeçalho `Content-Type: application/json`.

```json
{
  "titulo": "Inspecionar árvore na praça",
  "descricao": "Verificar as condições da copa e registrar o resultado.",
  "arvoreId": "ObjectId da árvore real em hexadecimal",
  "ocorrenciaId": null,
  "prioridade": "Baixa",
  "observacoes": null
}
```

Resposta 201: `{"ordem":{...}}`, com o id, código gerado e os dados persistidos. Nenhum código é digitado pelo usuário. IDs do município, status e datas são determinados pelo servidor.

Erros usam `{"erro":"mensagem"}`: entrada inválida 400, ausência de sessão 401, perfil ou conta sem autorização 403, referência inexistente ou fora do município 404, conflito de estado/código 409 e falha interna 500.

## Teste inicial

```powershell
.\gradlew.bat :servidor:compileJava :backend:compileJava :servidor:test
.\gradlew.bat :backend:test --tests service.ValidadorOrdemDeServicoRemotoTest
```

Com referências canônicas disponíveis, verificar pela tela: criar OS sem ocorrência, consultar o código persistido; selecionar ocorrência e preencher dados, editar a descrição antes de salvar e confirmar o texto final; recusar campos obrigatórios vazios; atribuir equipe à nova OS e confirmar as operações existentes.

Os testes de integração usam somente banco temporário exclusivo com URI `MONGODB_TEST_URI`. Não utilizar a conexão compartilhada do projeto.

## Evidências

Verificação em 20/11/2026:

- 72 fontes Java de produção e testes compilados com fonte/alvo 18.
- 16 testes de serviço aprovados: 6 de cadastro, 2 de equipe e 8 de conclusão.
- 15 testes de integração com MongoDB interrompidos por pré-condição, pois `MONGODB_TEST_URI` não estava configurada; não contam como aprovados. São 6 de cadastro, 5 de equipes e 4 de conclusão. O servidor MongoDB isolado não iniciou neste ambiente. Nenhuma conexão foi feita ao banco compartilhado do projeto.
- JavaScript aprovado em `node --check`.
- Três fluxos de teste JavaScript em VM passaram (27 asserções): opções inválidas/vazias; preenchimento manual com preservação das edições; envio único e recuperação de resposta incerta.
- A validação visual e a persistência no ambiente do projeto ainda dependem das referências canônicas descritas acima.

O formulário não repete automaticamente um POST de resultado incerto. Conserva os dados, solicita conferência da listagem e exige uma ação explícita antes de permitir novo envio. Após criação confirmada, uma consulta inicial atrasada não remove a nova OS da tabela.
