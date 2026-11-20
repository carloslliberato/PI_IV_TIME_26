# Integração do cadastro de ordens de serviço

## Escopo da entrega

O cadastro de OS foi implementado no módulo de ordens de serviço. As alterações de produção desta etapa ficam no controller, service e repository de OS, na sua página e nas duas rotas de cadastro. O código de Árvores, Ocorrências, Contas e painel inicial permanece sob responsabilidade dos respectivos módulos.

## Contrato combinado

| Referência no MongoDB | Tipo esperado | Regra |
| --- | --- | --- |
| `arvores._id` | BSON ObjectId | Identificador interno da árvore existente. |
| `arvores.municipioId` | BSON ObjectId | Mesmo município da conta do funcionário. |
| `arvores.ativa` | Boolean | Uma árvore explicitamente arquivada (`false`) não pode receber nova OS. |
| `ocorrencias._id` | BSON ObjectId | Identificador interno da ocorrência, quando selecionada. |
| `ocorrencias.municipioId` | BSON ObjectId | Mesmo município da conta do funcionário. |
| `ocorrencias.arvoreId` | BSON ObjectId ou ausente | Sugestão de árvore para o formulário; o funcionário pode selecionar outra árvore válida do município. |

Nas respostas HTTP, os ObjectIds são representados por strings hexadecimais de 24 caracteres. Os códigos de acompanhamento são campos separados e não substituem os identificadores internos.

Título, descrição e árvore são obrigatórios para criar a OS. A ocorrência é opcional. Seus dados podem ser copiados como sugestão, mas os valores finais editados pelo funcionário são preservados no cadastro. Criar uma OS não modifica a ocorrência de origem.

## Como avançar antes da integração

1. Validar as regras de cadastro, equipes e conclusão com os testes Java sem conexão com o banco.
2. Validar a lógica do formulário com respostas simuladas exclusivamente dentro do teste.
3. Quando existir ambiente MongoDB exclusivo de testes, executar `repository.CadastroOrdemDeServicoIntegracaoTest`. O teste cria referências próprias nesse ambiente e verifica a persistência.
4. Após o alinhamento dos módulos responsáveis, executar o fluxo completo pela interface com referências reais do município.

Não é necessário alterar o código dos colegas nem inserir referências fictícias nas coleções compartilhadas para executar os testes isolados. As validações de produção continuam exigindo referências existentes e compatíveis.

## Comandos dos testes isolados

Na raiz do projeto:

```powershell
.\gradlew.bat :backend:compileJava :backend:test --tests service.OrdemDeServicoCadastroServiceTest --tests service.OrdemDeServicoEquipeServiceTest --tests service.OrdemDeServicoConclusaoServiceTest
```

Teste do JavaScript, quando Node.js estiver disponível (não requer dependências adicionais):

```powershell
node scripts/testar-cadastro-os.cjs
```

O teste JavaScript usa DOM e respostas HTTP simulados em memória, sem API real e sem gravação no MongoDB. Verifica opções inválidas/vazias, preservação da digitação durante consulta, preenchimento explícito pela ocorrência, preservação das edições, envio único e recuperação de resposta incerta.

Alternativa sem Node.js: abrir Ordens de serviço no navegador e colar o conteúdo de `scripts/testar-cadastro-os-console.js` no Console do DevTools. A única requisição real lê o arquivo JavaScript da página. O restante executa uma cópia isolada com respostas e elementos simulados; não substitui o `fetch` global nem modifica a interface real. O resultado esperado é `Aprovado: 3 testes isolados de contrato, com 27 verificações.`

Verificação local em 20/11/2026: o pacote original de OS compilou com 72 fontes Java, 16 testes de serviço passaram e os três cenários JavaScript passaram. Essa verificação exclui integralmente o complemento de Árvores que foi retirado do escopo.

## Integração MongoDB

`repository.CadastroOrdemDeServicoIntegracaoTest` usa `MONGODB_TEST_URI` e exige suporte a transações. Não utiliza `ConexaoMongo` nem a configuração do banco da aplicação. Cada caso cria e remove seu próprio banco `arboriza_test_cadastro_<UUID>`.

A variável deve apontar para um ambiente exclusivo de testes. A proteção do teste verifica o nome do banco, mas não garante que o host ou cluster sejam exclusivos. Sem a variável, a integração é interrompida por pré-condição e não conta como teste aprovado.

Os seis casos de integração cobrem criação com e sem ocorrência, preservação do documento da ocorrência, contadores por ano, rejeição de referências inválidas ou de outro município, unicidade do código e filtragem das opções.

## Situação da entrega

Cadastro de OS implementado e testado isoladamente. A confirmação do fluxo completo com os cadastros reais depende do alinhamento dos identificadores pelos responsáveis por Árvores e Ocorrências. A simulação não é evidência de persistência nem de autenticação HTTP.
