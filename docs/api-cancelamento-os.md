# Cancelamento de ordem de serviço com motivo obrigatório

Autoria: Marialvo Corrêa de Freitas Junior — Pessoa 5.

## Comportamento

O funcionário pode cancelar uma OS **Aberta** ou **Em andamento** do município da sua conta. Deve informar o motivo do cancelamento. A tela apresenta um formulário nos detalhes da OS; confirmar o formulário envia o pedido uma única vez enquanto a operação está em andamento.

O motivo deve conter texto e ter no máximo **1.000 caracteres**. Espaços externos são removidos; quebras de linha internas são preservadas. O servidor Socket valida esse conteúdo antes de o backend solicitar qualquer gravação. A checagem da tela ajuda no preenchimento, mas a regra também vale para chamadas diretas à API.

O repositório mantém a transação existente: grava status, motivo e data de atualização juntos e libera a equipe quando ela não possui outra OS ativa. O campo `observacoes` permanece separado do motivo.

Ordens já concluídas ou canceladas não aceitam novo cancelamento. Um pedido repetido não substitui a justificativa registrada. O detalhe da OS cancelada apresenta o motivo apenas para consulta.

## Requisição

`PATCH /api/ordens-servico/{id}/status`

Exige sessão autenticada de funcionário. O município é obtido da conta; não é escolhido pelo corpo da requisição.

```json
{
  "status": "Cancelada",
  "motivoCancelamento": "Solicitação duplicada; o atendimento seguirá pela OS já existente."
}
```

O identificador da rota deve ser um ObjectId válido. O corpo deve ser um objeto JSON, o status deve ser exatamente `Cancelada` e o motivo deve ser texto. Números, objetos, listas e booleanos não são convertidos em justificativa.

## Resposta e persistência

Em caso de sucesso, a API responde **200** com `{ "ordem": { ... } }`. O objeto da ordem contém `status: "Cancelada"`, `motivoCancelamento` com o texto aprovado e `dataAtualizacao` com o instante da alteração. O campo `motivoCancelamento` também é devolvido na listagem e na consulta por identificador.

O MongoDB armazena o campo `motivoCancelamento` como string em `ordens_servico`. Não há migração ou preenchimento automático de justificativas antigas. Campo ausente ou nulo é lido como `null`; a tela apresenta **Motivo não registrado.** para essas ordens canceladas.

| HTTP | Situação |
| --- | --- |
| 200 | Cancelamento confirmado com motivo. |
| 400 | JSON ou identificador inválido; status incorreto; motivo com tipo inválido, ausente, vazio ou acima do limite. |
| 401 | Ausência de sessão autenticada. |
| 403 | Conta sem autorização de funcionário ou sem município válido. |
| 404 | OS não encontrada no município da conta. |
| 409 | OS em estado final ou alteração concorrente que impede o cancelamento. |
| 503 | Validação Socket indisponível ou resposta incompatível; a gravação não é solicitada. |
| 500 | Falha inesperada; consultar novamente a OS antes de repetir o pedido. |

Mensagens da regra de conteúdo:

- `O motivo do cancelamento deve ser informado.`
- `O motivo do cancelamento deve ter no máximo 1000 caracteres.`

## Atualização dos processos

As duas cópias do protocolo Java precisam permanecer iguais. Após aplicar a alteração, reinicie o processo **servidor** e, em seguida, o **backend**. O backend usa a operação `CANCELAMENTO` do protocolo; um servidor antigo não oferece essa operação.

Chamadas antigas que enviam somente `{ "status": "Cancelada" }` passam a ser rejeitadas. A interface atualizada já envia o novo campo. Atualize a página com `Ctrl+F5` após reiniciar os processos.

## Verificação automatizada

Na raiz do projeto, execute:

```powershell
.\gradlew.bat :servidor:compileJava :backend:compileJava :servidor:test
```

```powershell
.\gradlew.bat :backend:test --tests service.ValidadorOrdemDeServicoRemotoTest --tests controller.CancelamentoOrdemDeServicoJsonTest --tests model.OrdemDeServicoCancelamentoTest
```

```powershell
node .\scripts\testar-cancelamento-os.cjs
```

Os testes cobrem a validação de conteúdo, a troca real de mensagens pelo Socket em ambiente local de teste, o contrato JSON, o modelo e o JavaScript isolado. Não usam o banco compartilhado do projeto.

Os testes de repositório `repository.CancelamentoOrdemDeServicoIntegracaoTest` e `repository.AtribuicaoEquipeOrdemDeServicoIntegracaoTest` exigem `MONGODB_TEST_URI` apontando para um ambiente de teste exclusivo com suporte a transações. Sem essa variável, são ignorados. Não configure a URI do banco compartilhado para executá-los.

## Conferência pela interface

1. Abra uma OS de teste em estado **Aberta** ou **Em andamento** e escolha **Cancelar ordem de serviço**.
2. Tente confirmar sem motivo e depois somente com espaços: a ordem deve permanecer ativa.
3. Informe um motivo identificável, por exemplo `[TESTE MJ] Cancelamento com justificativa`, e confirme uma vez.
4. Confira o status **Cancelada** e o motivo nos detalhes. Atualize a página e abra a mesma OS para conferir a persistência.
5. Verifique que as observações originais continuam presentes e que uma OS cancelada não oferece novo cancelamento.
6. Abra uma das ordens antigas canceladas sem motivo e confira **Motivo não registrado.**.

Essa rodada altera somente a OS escolhida e, quando aplicável, a disponibilidade da equipe. Use um registro de teste acordado com o grupo. Os testes isolados não substituem a confirmação do resultado no MongoDB e na interface em execução.
