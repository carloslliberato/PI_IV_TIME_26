# Conclusão de ordens de serviço

Base do pacote: main `d4b766f5b8d86906eda95e0b414d2e4d4eba25aa`.

## Aplicação

Copie as pastas `backend`, `frontend`, `docs` e `bd` que estão na raiz do ZIP para dentro de `PI_IV_TIME_26`, mesclando as pastas e substituindo os arquivos de mesmo nome. Não crie uma segunda pasta `PI_IV_TIME_26` dentro do projeto.

O pacote inclui backend, tela e testes da conclusão. `ConfiguracaoPaginas.java` e `sidebar-profissional.js` voltam ao estado da main, retirando o acesso à tela de alertas. `ConfiguracaoRotas.java` contém as rotas publicadas e a nova conclusão de OS. Os arquivos novos de alertas já presentes no computador não são apagados nem incluídos nesta entrega.

Execute na raiz do projeto:

```powershell
.\gradlew.bat :servidor:compileJava :backend:compileJava :servidor:test
.\gradlew.bat :backend:test --tests service.ValidadorOrdemDeServicoRemotoTest
git diff --check
git status --short --branch
```

Depois, reinicie o backend e atualize a página de ordens com Ctrl+F5.

## Fluxo disponível

Abra uma OS Aberta ou Em andamento, clique em **Concluir serviço**, informe o registro da execução e confirme. A OS passa a Concluída; o registro permanece nos detalhes e no histórico de intervenções da árvore.

A interface aceita tipo, descrição, data/hora de execução e links opcionais de fotos. As fotos são referências a arquivos já publicados; este pacote não implementa upload de arquivos. A data digitada usa o fuso do dispositivo e é enviada como instante UTC.

OS Concluída ou Cancelada não apresenta ações de conclusão/cancelamento. Uma nova tentativa de concluir uma OS terminal recebe conflito, sem criar outro registro. A tela consulta a OS após uma resposta incerta e não repete o POST automaticamente.

## API

### POST /api/ordens-servico/{id}/conclusao

Exige sessão com perfil ativo FUNCIONARIO e conta com esse perfil e município. O município é obtido da conta; o usuário vem da sessão. Árvore, equipe e vínculo de OS são copiados da ordem consultada dentro da transação. IDs enviados no corpo não são usados.

```json
{
  "tipo": "Inspeção",
  "descricao": "Inspeção realizada. Foram registrados os resultados do serviço.",
  "dataExecucao": "2026-11-20T10:00:00-03:00",
  "fotos": []
}
```

| Campo | Regra |
|---|---|
| tipo | Obrigatório; até 80 caracteres após remover espaços externos. |
| descricao | Obrigatória; até 4.000 caracteres após remover espaços externos. |
| dataExecucao | Opcional. Ausente/null usa o horário do servidor; informada exige ISO com offset ou Z, ano de 1 a 9999 e instante não futuro. Texto vazio é inválido. |
| fotos | Opcional; até 10 URLs HTTP/HTTPS absolutas, com host, sem credenciais, até 2.048 caracteres por URL. |

Resposta 200: `{"ordem": {...}}`, com os campos anteriores da OS e os campos novos:

- `intervencaoConclusaoId`: ObjectId do registro em hexadecimal.
- `intervencaoConclusao`: objeto com `id`, `municipioId`, `arvoreId`, `ordemServicoId`, `equipeId`, `usuarioId`, `tipo`, `descricao`, `fotos`, `dataExecucao` e `dataCriacao`.

GET `/api/ordens-servico/{id}` também retorna o registro aninhado. Para registros antigos sem vínculo, o valor é null. A listagem de OS inclui somente o identificador do registro, evitando consultar cada intervenção durante a listagem.

| HTTP | Situação |
|---|---|
| 200 | OS concluída e intervenção gravada. |
| 400 | ID, JSON, campos ou data inválidos. |
| 401 | Sem sessão. |
| 403 | Perfil ou município da conta incompatível. |
| 404 | OS inexistente ou de outro município. |
| 409 | OS em estado que não permite conclusão, inclusive repetição. |
| 500 | Não foi possível confirmar a operação; consultar a OS antes de reenviar. |

### Histórico

A intervenção gerada já aparece no GET existente:

```text
/api/intervencoes?arvoreId=ID_DA_ARVORE
```

A consulta continua limitada ao município da sessão. Nenhuma estrutura de árvores, ocorrências, contas ou equipes é alterada.

## Persistência e concorrência

O repositório abre uma ClientSession pelo cliente Mongo existente. `withTransaction` engloba a leitura municipal da OS, a atualização de status/datas/vínculo e a inserção da intervenção. A atualização escreve somente os campos da conclusão. O resultado relê as datas BSON antes do commit, preservando sua precisão em milissegundos.

A transação exige replica set ou cluster sharded. Não há alternativa com duas gravações independentes. Cancelamento e conclusão concorrentes disputam o mesmo documento da OS; apenas uma transição terminal pode ser confirmada. A sessão é passada a todas as operações participantes.

Referência: [Transações no MongoDB Java Sync Driver](https://www.mongodb.com/docs/drivers/java/sync/current/crud/transactions/).

Os antigos métodos que concluíam somente a OS foram substituídos. A gravação genérica do repositório não aceita marcar uma OS como Concluída sem esse fluxo.

## Verificação no ambiente local

1. Use uma OS de teste Aberta/Em andamento do município da conta. Se não houver, importe `bd/os_conclusao_mj.json` em `arboriza_db.ordens_servico`. É um registro novo, sem `_id` informado; o MongoDB gera seu ID. Importe uma única vez.
2. Abra a OS `[TESTE MJ] Conclusão de OS pela tela`, preencha tipo e descrição, confira a data de execução e confirme.
3. Confira status Concluída e registro de execução no modal. Feche, reabra e atualize a página: o relatório deve permanecer.
4. Consulte `/api/intervencoes?arvoreId=000000000000000000000001` e localize a intervenção cujo `ordemServicoId` é o ID dessa OS.
5. A OS deve ter `intervencaoConclusaoId` igual ao `_id` da intervenção. Não deve existir mais de um registro de conclusão para essa OS.

O arquivo de demonstração usa uma referência fictícia de árvore, como os testes anteriores. Ele valida exclusivamente conclusão e histórico em coleções da Pessoa 5; não comprova o cadastro integrado a uma árvore real.

## Testes automatizados

`service.ValidadorOrdemDeServicoTest`, em `servidor/test`: preserva os 8 cenários de conclusão (campos, datas, links e cópia imutável), além das validações de cadastro e equipe. Não conecta ao MongoDB.

`repository.ConclusaoOrdemDeServicoIntegracaoTest`: 4 testes reais de persistência, rollback após rejeição da segunda gravação, isolamento municipal e estados finais. Exige `MONGODB_TEST_URI` de um MongoDB exclusivo de testes com transações. Cada teste cria e remove somente um banco temporário `arboriza_test_conclusao_<UUID>`. Não usa a conexão ou o banco da aplicação. Sem a variável, a execução é abortada por condição de teste; isso não é prova de atomicidade.

```powershell
# Somente com MONGODB_TEST_URI configurada para um ambiente de testes:
.\gradlew.bat :backend:test --tests repository.ConclusaoOrdemDeServicoIntegracaoTest
```

Verificações realizadas na preparação: compilação dos 66 arquivos Java do snapshot e dos testes com dependências do projeto, Java source/target 18; 8 testes unitários aprovados; sintaxe JavaScript aprovada e 8 verificações isoladas de fluxo no frontend. Os 4 testes MongoDB foram abortados por ausência da URI de testes. O fluxo completo na aplicação do usuário permanece pendente até a execução local.

## Próxima etapa da entrega

O pacote fecha o fluxo de conclusão de uma OS existente. Criação de OS, seleção/atribuição de equipe e vínculo real com árvore/ocorrência ainda precisam ser integrados. A main consultada continua com identificadores String em árvores e ocorrências, enquanto OS usa ObjectId; não há conversão artificial de referências neste pacote.
