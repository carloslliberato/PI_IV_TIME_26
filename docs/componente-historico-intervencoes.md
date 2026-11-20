# Componente de histórico de intervenções

## Entrega e responsabilidade

Este componente consulta o histórico de uma árvore usando a API de intervenções já publicada na main. Foi criado em arquivos novos; não altera o módulo de Árvores, login, painel, menu nem configurações de rotas.

O responsável pela ficha da árvore pode integrá-lo ao abrir os detalhes de um registro. Essa ligação à tela existente é uma etapa separada e não foi realizada neste pacote.

## Arquivos

- `frontend/perfil_profissional/historico-intervencoes.js`: componente reutilizável.
- `frontend/perfil_profissional/historico-intervencoes.css`: estilos restritos ao componente.
- `scripts/verificar-historico-intervencoes-console.js`: verificação visual temporária, somente leitura, na página autenticada.
- `scripts/testar-historico-intervencoes.cjs`: testes isolados do componente, sem rede real.

## Contrato da API

O componente sempre consulta `GET /api/intervencoes?arvoreId=<ObjectId hexadecimal>` com a sessão da mesma origem. Não oferece criação, alteração ou exclusão de registros.

A API deriva o município da conta autenticada e combina esse município com o identificador da árvore. Retorna `{"intervencoes":[...]}`, ordenado por data de execução e data de criação, ambas decrescentes. Uma lista vazia significa que não foram encontradas intervenções correspondentes no município; não comprova inexistência da árvore.

O componente utiliza tipo, descrição, datas de execução/criação e links de fotos. A resposta atual não fornece nomes de usuário/equipe nem códigos de exibição dessas referências. Esses dados não são inventados a partir dos ObjectIds.

Os horários são apresentados no fuso `America/Sao_Paulo`. Textos são inseridos como texto, e fotos são apresentadas somente como links HTTP/HTTPS válidos, sem carregamento automático de imagens externas.

## Integração pelo responsável pela tela

Carregar o script e fornecer um elemento exclusivo para o histórico. O componente carrega sua folha de estilos automaticamente uma vez.

```html
<div id="historicoDaArvore"></div>
<script src="/perfil_profissional/historico-intervencoes.js"></script>
```

Ao abrir os detalhes da árvore:

```javascript
const historico = HistoricoIntervencoes.montar(
  document.getElementById("historicoDaArvore"),
  { arvoreId: arvore.id }
);
await historico.pronto;
```

Atualização manual:

```javascript
await historico.atualizar();
```

Ao fechar ou substituir a ficha:

```javascript
historico.destruir();
```

O identificador deve ser um ObjectId hexadecimal. Um UUID legado não é convertido para ObjectId pelo componente.

## Verificação visual sem editar a tela de Árvores

1. Copiar as pastas deste pacote para a raiz do projeto, preservando os caminhos.
2. Manter o backend em execução e entrar como funcionário na página de Ordens de serviço.
3. Na raiz do projeto, copiar o script de verificação com a codificação explícita:

```powershell
Get-Content -Path .\scripts\verificar-historico-intervencoes-console.js -Raw -Encoding UTF8 | Set-Clipboard
```

4. Colar e executar no Console do DevTools. Será aberto um painel temporário de verificação.
5. Informar o identificador da árvore e clicar em Consultar. O valor inicial é a árvore de teste `000000000000000000000001`, que já foi usada nos testes de intervenções; nenhum documento é criado por este script.
6. Conferir o histórico e clicar em Fechar. Somente o painel temporário é removido.

Esse procedimento lê os arquivos do componente e chama a API existente. Não cria, cancela ou conclui OS, não muda intervenções e não modifica arquivos da página. Sessão expirada ou perfil incorreto são apresentados como erro de consulta.

O backend bloqueia arquivos HTML estáticos. Por isso o teste não adiciona página nem altera essa proteção; utiliza a página autenticada já existente para montar o componente temporariamente.

## Testes isolados

Quando Node.js estiver disponível, executar na raiz do projeto:

```powershell
node scripts/testar-historico-intervencoes.cjs
```

Esse teste não requer bibliotecas adicionais nem MongoDB e não substitui a conferência visual com a API do projeto.

## Limites da entrega

O componente está separado da ficha da árvore. Sua existência no repositório não significa que já esteja conectado àquela tela. A integração deve ser feita pelo responsável, usando a chamada documentada acima.

A API atual não possui paginação. Este componente apresenta os registros devolvidos pela API; paginação e enriquecimento com nomes/códigos não fazem parte desta entrega.
