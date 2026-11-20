# API de consulta de intervenções

## Endpoint

`GET /api/intervencoes`

Consulta o histórico de intervenções do município do funcionário autenticado. Os resultados são ordenados por `dataExecucao` decrescente e, em caso de empate, por `dataCriacao` decrescente.

## Autenticação e município

- Usa a sessão HTTP do sistema, com `usuarioId` e `perfilAtivo` igual a `FUNCIONARIO`.
- A conta é consultada novamente para verificar o perfil `FUNCIONARIO` e o município vinculado.
- O município usado na consulta vem da conta. A rota não usa um município enviado pelo cliente.
- As consultas gerais e por árvore incluem o filtro de município.

## Filtro opcional

| Parâmetro de consulta | Formato | Comportamento |
| --- | --- | --- |
| `arvoreId` | ObjectId em texto hexadecimal de 24 caracteres | Filtra o histórico da árvore dentro do município autorizado. |

Sem `arvoreId`, a rota consulta todas as intervenções do município. Se o parâmetro for informado vazio ou com formato inválido, retorna HTTP 400. Um identificador válido sem resultados, inclusive de árvore de outro município, retorna HTTP 200 com `{"intervencoes":[]}`.

## Resposta de sucesso

HTTP 200. Exemplo obtido com o registro de teste A:

```json
{
  "intervencoes": [
    {
      "id": "6aff7f70c7eaf9b90e000001",
      "municipioId": "6ae666a7680e8a4330a1ab66",
      "arvoreId": "000000000000000000000001",
      "ordemServicoId": null,
      "equipeId": null,
      "usuarioId": "000000000000000000000006",
      "tipo": "Poda",
      "descricao": "[TESTE MJ] Intervenção A - município dos testes de OS, árvore 1. IDs de árvore e usuário fictícios.",
      "fotos": [],
      "dataExecucao": "2026-11-18T15:00:00Z",
      "dataCriacao": "2026-11-19T23:00:00Z"
    }
  ]
}
```

Os identificadores são devolvidos como texto, as datas como texto ISO-8601 e as referências opcionais preservam `null`. `fotos` é uma lista de referências em texto; a ausência da lista no documento é representada como `[]`.

## Respostas de erro

Formato: `{"erro":"mensagem"}`.

| HTTP | Situação |
| --- | --- |
| 400 | `arvoreId` informado com formato inválido. |
| 401 | Sessão ausente ou sem `usuarioId`. |
| 403 | Perfil ativo incorreto, usuário da sessão inválido/inexistente, conta sem perfil `FUNCIONARIO` ou sem município. |
| 500 | Erro interno ao consultar as intervenções. |

## Dados de teste

O arquivo [intervencoes_consulta_mj.json](../bd/intervencoes_consulta_mj.json) contém três documentos em Extended JSON, identificados com `[TESTE MJ]`, para importação manual pelo MongoDB Compass na coleção `arboriza_db.intervencoes`.

As referências de árvore, OS, equipe e usuário são fictícias. Os registros A e B usam o município `6ae666a7680e8a4330a1ab66`. O registro C usa Hortolândia (`6ae7854cb9962492d01e6af6`). Esses dados verificam as consultas de forma isolada; não demonstram a validação de vínculos no cadastro de uma intervenção.

## Validação manual realizada

Verificada em 19/11/2026, usando uma sessão de funcionário do município `6ae666a7680e8a4330a1ab66`.

| Cenário executado | Resultado observado |
| --- | --- |
| Compilação com `:backend:compileJava` | `BUILD SUCCESSFUL`. |
| Consulta sem enviar a sessão | HTTP 401, `Usuário não autenticado.` |
| Consulta do município antes de importar os testes | HTTP 200, lista vazia. |
| Filtro `arvoreId=abc` | HTTP 400, `O identificador da árvore é inválido.` |
| Filtro com ObjectId válido antes da importação | HTTP 200, lista vazia. |
| Consulta geral após importar os testes | HTTP 200, registros B e A, nessa ordem. |
| Filtro `arvoreId=000000000000000000000001` | HTTP 200, somente A. |
| Filtro `arvoreId=000000000000000000000003` | HTTP 200, somente B. |
| Filtro `arvoreId=000000000000000000000002` | HTTP 200, lista vazia; C pertence a outro município. |

As respostas preservaram os identificadores, as datas, as listas de fotos vazias e as referências opcionais nulas. Os cenários de HTTP 403 e 500 constam do contrato acima, mas não foram executados nesta rodada de testes.

## Limite desta entrega

Esta entrega disponibiliza a consulta autenticada do histórico. O cadastro pela API (`POST /api/intervencoes`), sua integração com a conclusão de OS e a integração da tela de histórico serão tratados nas próximas etapas.
