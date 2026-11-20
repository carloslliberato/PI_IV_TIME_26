# Relatório municipal de ordens de serviço

## Endpoint

`GET /api/relatorios/ordens-servico`

Exemplo com ano escolhido: `GET /api/relatorios/ordens-servico?ano=2026`.

O relatório consulta a coleção `ordens_servico` e agrupa os dados no backend. A consulta não altera documentos nem cria índices.

## Autenticação e município

- Exige sessão com `usuarioId` e `perfilAtivo` igual a `FUNCIONARIO`.
- Consulta a conta atual para confirmar o perfil `FUNCIONARIO` e o município vinculado.
- O filtro municipal usa o `ObjectId` da conta. Um parâmetro `municipioId` enviado pelo cliente não define o município do relatório.
- A autorização acontece antes da validação do ano.

## Parâmetro opcional

| Parâmetro | Regra |
| --- | --- |
| `ano` | De um a quatro algarismos, representando um ano entre 1 e 9999. |

Quando `ano` está ausente, o serviço usa o ano atual no fuso `America/Sao_Paulo`. Valor vazio, espaços, sinais, decimais, texto ou valor fora da faixa retornam HTTP 400. O parâmetro não altera os agrupamentos históricos: ele seleciona somente o ano de `totalNoAno`, `porMes` e `porSemestre`.

## Resposta de sucesso

HTTP 200, no envelope `{"relatorio": {...}}`.

| Campo de `relatorio` | Conteúdo |
| --- | --- |
| `municipioId` | Identificador hexadecimal do município autorizado. |
| `anoSelecionado` | Ano aplicado às séries mensais e semestrais. |
| `fusoHorario` | `America/Sao_Paulo`. |
| `totalOrdens` | Quantidade histórica de OS do município, incluindo todos os status e registros sem data válida. |
| `totalNoAno` | Quantidade com data de criação válida no ano selecionado. |
| `ordensSemDataValida` | Quantidade sem `dataCriacao` no tipo BSON Date esperado. |
| `porStatus` | Contagens históricas por status. |
| `porAno` | Contagens históricas por ano de criação, em ordem crescente. |
| `porMes` | Doze contagens, de janeiro a dezembro, no ano selecionado. |
| `porSemestre` | Duas contagens, primeiro e segundo semestre, no ano selecionado. |

Cada linha dos agrupamentos usa o mesmo formato:

```json
{
  "grupo": "Novembro",
  "quantidade": 3
}
```

Em `porAno`, `grupo` é o ano em texto, por exemplo `"2026"`. Em `porSemestre`, os rótulos são `"1º semestre"` e `"2º semestre"`.

### Status e dados incompletos

Os quatro status conhecidos aparecem mesmo com quantidade zero: `Aberta`, `Em andamento`, `Concluída` e `Cancelada`. Outros textos de status são preservados como grupos próprios, removendo espaços externos. Status ausente, vazio ou não textual é contabilizado como `Não informado`.

Datas ausentes ou armazenadas em outro tipo, inclusive texto, são contabilizadas em `ordensSemDataValida`. Essas ordens continuam no total e nos status, mas ficam fora das séries temporais. O relatório não corrige os documentos armazenados.

A conversão para São Paulo acontece antes da extração do ano e do mês. Por exemplo, `2026-01-01T02:00:00Z` pertence a dezembro de 2025 nesse fuso.

### Consistência das contagens

- Soma de `porStatus` = `totalOrdens`.
- Soma de `porAno` + `ordensSemDataValida` = `totalOrdens`.
- Soma de `porMes` = soma de `porSemestre` = `totalNoAno`.

Sem registros, os totais são zero, `porAno` é vazio, os quatro status têm zero, e os doze meses e dois semestres também têm zero. Um ano sem registros mantém os agrupamentos históricos e zera somente as séries desse ano.

## Respostas de erro

Formato: `{"erro":"mensagem"}`.

| HTTP | Situação |
| --- | --- |
| 400 | Ano informado inválido. |
| 401 | Sessão ausente ou sem `usuarioId`. |
| 403 | Perfil ativo incorreto, usuário inválido/inexistente, conta sem perfil de funcionário ou sem município. |
| 500 | Falha interna ao consultar ou montar o relatório. |

Falha de consulta retorna erro; não é substituída por um relatório com totais zero.

## Como validar

Os testes de cálculo em `backend/test/service/RelatorioServiceTest.java` usam documentos em memória. Não abrem conexão nem escrevem no MongoDB. Cobrem lista vazia, viradas de ano/mês/semestre no fuso escolhido, dados incompletos, ano sem registros e ano inválido.

```powershell
.\gradlew.bat :backend:compileJava :backend:test --tests service.RelatorioServiceTest
```

Para validar a integração com a aplicação em execução, conferir a resposta com a listagem de `GET /api/ordens-servico`, testar HTTP 401 sem enviar a sessão e HTTP 400 com `ano=abc` e `ano=`. A comparação entre as duas consultas deve ser feita sem alterações simultâneas nos registros.

## Validações executadas em 19/11/2026

| Verificação | Resultado observado |
| --- | --- |
| `:backend:compileJava :backend:test --tests service.RelatorioServiceTest` | `BUILD SUCCESSFUL`, com três tarefas executadas no ambiente do projeto. |
| Relatório autenticado e listagem de OS | HTTP 200 nas duas consultas; totais e agrupamentos correspondentes. |
| Consulta sem enviar a sessão | HTTP 401. |
| Ano informado como `abc` | HTTP 400. |
| Ano informado vazio | HTTP 400. |
| Parâmetro extra com identificador de outro município | HTTP 200, preservando município e total autorizados pela conta. |
| Tela de relatório por ano | Ano 2026 com três OS, total de três e participação de 100%. |
| Tela de relatório por status | Aberta, Em andamento e Concluída com zero; Cancelada com três OS e participação de 100%. |
| CSV de status aberto no Google Sheets | Quatro grupos, quantidades e percentuais correspondentes à tela; cabeçalhos e acentos legíveis. |
| Indicador de OS no painel inicial | Três OS, correspondente ao total do relatório. |

O script de verificação comparou a resposta do relatório com a listagem existente de OS, incluindo status, anos, meses, semestres, fuso, datas ausentes e consistência das somas. A execução terminou com a mensagem de sucesso de todas as verificações. Os retornos HTTP 403 e 500 não foram provocados nessa rodada de integração.

## Integração da tela

A aba Ordens de serviço da página `/relatorio` usa esta API nos agrupamentos Ano, Mês, Semestre e Status. Os totais do cartão são a soma do agrupamento mostrado. A tabela e o CSV usam o mesmo conjunto de valores.

Durante carregamento ou falha, a tela não exibe contagens anteriores e bloqueia a exportação. Resposta válida com zero tem mensagem de ausência de registros. Os agrupamentos temporais informam quando há ordens sem data válida. Os demais assuntos da página continuam identificados como dados de demonstração.

O indicador de OS em `/perfil-profissional` usa `relatorio.totalOrdens`. Falha ou resposta inválida mostra indisponibilidade do indicador, sem apresentar zero como se fosse ausência de registros.

A sintaxe dos dois arquivos JavaScript foi verificada localmente. Testes locais com DOM e respostas simuladas verificaram carregamento, vazio, falha, troca de assunto durante a consulta, agrupamentos, CSV e o contador do painel. A conferência visual no navegador do usuário validou os agrupamentos Ano e Status, a exportação CSV de Status e o total de OS no painel inicial, conforme os resultados registrados acima. Mês e Semestre foram conferidos na comparação das respostas da API e nos testes locais; não há registro de conferência visual desses dois agrupamentos nesta rodada.
