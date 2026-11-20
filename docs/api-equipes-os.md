# Atribuição de equipes a ordens de serviço

## Instalação

Extraia o conteúdo do pacote na **raiz do repositório `PI_IV_TIME_26`**, onde estão `gradlew.bat`, `backend`, `frontend`, `docs` e `bd`. Preserve as subpastas do pacote. Os arquivos devem chegar aos caminhos correspondentes, por exemplo `frontend/perfil_profissional/ordens-servico.js`; não crie uma pasta adicional com o nome do ZIP dentro do projeto.

Pacote preparado sobre o commit `63a1930`, já sincronizado na branch `MJ.branch`. As rotas e os imports necessários já estão incluídos. Depois de copiar os arquivos, compile, execute os testes e reinicie o backend. No navegador, use Ctrl+F5 para carregar o JavaScript novo.

## Regras

- Exige sessão autenticada com perfil de funcionário ativo e município vinculado.
- A equipe pode ter sido criada por **qualquer funcionário do mesmo município** da OS. O criador da equipe não limita sua seleção neste fluxo.
- Uma equipe pode atender **uma OS ativa por vez**. OS ativas são as de status `Aberta` ou `Em andamento`.
- Atribuição e troca são permitidas somente em OS `Aberta` ou `Em andamento`.
- A atribuição bem-sucedida grava `equipeId` como ObjectId e deixa a OS `Em andamento`.
- Concluir ou cancelar a OS libera a equipe para outra OS. Trocar a equipe libera a anterior e ocupa a escolhida.
- Enviar a equipe que já está vinculada à mesma OS em andamento não altera suas datas. Se a OS ainda estiver aberta, a atribuição a coloca em andamento.
- A equipe deve existir e pertencer ao mesmo município. O backend verifica a disponibilidade novamente ao salvar; uma opção exibida como disponível pode ter sido ocupada por outra requisição.
- O histórico conserva o vínculo com a equipe nas OS finalizadas. A liberação considera o status da OS; não depende de apagar esse vínculo.

## Listar opções

`GET /api/ordens-servico/{id}/equipes`

`id` é o ObjectId hexadecimal da OS. O município é determinado no backend pela conta autenticada e pela OS, sem aceitar um município livre do formulário.

Resposta HTTP 200:

```json
{
  "equipes": [
    {
      "id": "000000000000000000000099",
      "nome": "Equipe de exemplo",
      "regiaoAtuacao": "Região Norte",
      "disponivel": true,
      "atual": false
    }
  ]
}
```

O identificador acima ilustra o formato e não deve ser usado como equipe de teste. Se não houver equipes no município, a resposta é `{"equipes":[]}`.

`atual` identifica a equipe já vinculada a esta OS. A tela mantém essa opção selecionável. As outras opções com `disponivel:false` aparecem como ocupadas e ficam desabilitadas.

A tela usa este endpoint dedicado. Não utiliza `GET /api/equipes` para calcular as opções de atribuição.

## Atribuir ou trocar equipe

`PATCH /api/ordens-servico/{id}/equipe`

Cabeçalho: `Content-Type: application/json`.

Corpo:

```json
{
  "equipeId": "OBJECTID_HEXADECIMAL_DA_EQUIPE_REAL"
}
```

Substitua o valor pelo `id` de uma equipe real retornada na listagem de opções. Não envie nome, região, usuário ou município como identificador.

Resposta HTTP 200: `{"ordem":{...}}`, contendo os campos atuais da OS, seu `equipeId` e o status `Em andamento`. A identidade interna `id` e o código de acompanhamento `codigo` continuam separados.

Falhas esperadas conforme a situação: 400 para entrada inválida; 401 sem autenticação; 403 sem perfil autorizado; 404 para registro inexistente ou fora do escopo municipal; 409 para conflito de disponibilidade ou estado da OS. As respostas de erro usam o campo `erro`.

## Comportamento da interface

Nos detalhes de uma OS ativa, use **Atribuir equipe** ou **Trocar equipe**. O seletor mostra nome, região e as indicações **Atual** e **Ocupada**. **Atualizar equipes** consulta novamente a disponibilidade.

Sem equipes cadastradas, a própria seção orienta abrir a página **Equipes**, cadastrar uma equipe real vinculada ao município da conta e retornar para atualizar as opções.

Durante um envio, atribuição, conclusão e cancelamento da mesma OS ficam bloqueados. Após falha de rede ou resposta incerta, a tela consulta a OS para confirmar o resultado, sem repetir automaticamente o PATCH. Se essa consulta também falhar, **Consultar situação** ou a reabertura dos detalhes permite tentar novamente a leitura; as alterações permanecem bloqueadas até haver confirmação.

## Dados para teste manual

O arquivo `bd/os_equipes_mj.json` contém duas OS, A e B, inicialmente abertas, no município `6ae666a7680e8a4330a1ab66`.

- Importar como array JSON na coleção `ordens_servico`, usando os tipos BSON do Extended JSON.
- Os documentos não incluem `_id`: o MongoDB gera um identificador para cada OS importada.
- Importar uma única vez para evitar registros duplicados.
- O `arvoreId` é fictício e está identificado na descrição dos documentos. O arquivo não cria árvores, equipes nem ocorrências.
- Não alterar a coleção de equipes para fabricar disponibilidade. Escolher uma equipe real do mesmo município ou cadastrá-la pela tela **Equipes**.

Roteiro:

1. Atribuir uma equipe disponível à OS A. Confirmar `Em andamento` e a persistência após reabrir os detalhes.
2. Abrir as opções da OS B. A equipe usada na A deve aparecer ocupada e não ser selecionável.
3. Se houver uma segunda equipe disponível, trocar a equipe da OS A e verificar que a anterior volta a estar disponível para a OS B.
4. Concluir ou cancelar a OS que ocupa a equipe. Atualizar as opções da outra OS e verificar a liberação.
5. Verificar que uma equipe criada por outro funcionário do mesmo município aparece nas opções, quando houver esse cadastro para testar.
6. Confirmar que uma OS finalizada não oferece atribuição ou troca e que registros de outro município não podem ser vinculados.

## Testes automatizados

Executar na raiz do projeto, no PowerShell:

```powershell
.\gradlew.bat :backend:compileJava :backend:test --tests service.OrdemDeServicoEquipeServiceTest --tests service.OrdemDeServicoConclusaoServiceTest
```

## Evidências de validação

Verificação do pacote em 20/11/2026:

- Compilação central dos fontes Java de produção e dos testes deste bloco e da conclusão: aprovada, com fonte/alvo Java 18.
- Testes de serviço: **10 aprovados**, abrangendo validação de equipe e validação da conclusão existente.
- Verificação de sintaxe de `ordens-servico.js` com `node --check`: aprovada.
- Testes de integração MongoDB: incluídos, **não executados**. O servidor MongoDB de teste não iniciou no ambiente de preparação; não houve conexão ao banco do projeto.
- Validação da interface e da persistência no ambiente do projeto: pendente do roteiro manual acima.

### Integração em banco exclusivo de testes

Os testes de repositório exigem `MONGODB_TEST_URI` apontando para um replica set ou cluster exclusivo de testes. A configuração aceita banco ausente na URI ou nome começando com `arboriza_test`. Cada teste cria seu próprio banco temporário e o remove ao terminar. Não utilizar a conexão do banco compartilhado do projeto.

Depois de configurar essa variável no ambiente de teste, executar:

```powershell
.\gradlew.bat :backend:test --tests repository.AtribuicaoEquipeOrdemDeServicoIntegracaoTest --tests repository.ConclusaoOrdemDeServicoIntegracaoTest
```

Sem essa variável, os testes de integração são interrompidos por pré-condição, não contam como aprovados.

## Persistência e disponibilidade

A primeira atribuição cria um índice único parcial em `equipeId` para OS com status `Aberta` ou `Em andamento` e referência ObjectId. Se já houver equipe vinculada a múltiplas OS ativas, a API retorna um conflito explicando a necessidade de regularizar os registros.

Atribuição, troca, cancelamento e conclusão atualizam os documentos envolvidos em transações. O cancelamento e a conclusão conservam `equipeId` no histórico e liberam o cadastro da equipe quando não há outra OS ativa.

`EquipeRepository` passa a calcular a disponibilidade da listagem com base nas OS ativas. OS concluídas ou canceladas deixam de manter equipes ocupadas nessa listagem. As regras existentes de autoria para editar cadastros de equipes e a proteção contra excluir equipes com histórico são preservadas.
