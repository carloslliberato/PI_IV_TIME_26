# Dicionário de Dados do sistema "Arboriza: Gestão Preventiva da Arborização Urbana"

### 1. Conta
Descrição: Armazena as informações de identificação, autenticação e os dados específicos dos perfis de cidadãos e funcionários do sistema Arboriza.

Atributos:

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador único da conta. |
| nome | String | Sim | Nome completo do usuário. |
| email | String | Sim | Endereço de e-mail utilizado para identificação e login. Deve ser único. |
| senhaHash | String | Sim | Senha do usuário armazenada em formato de hash. |
| telefone | String | Sim | Telefone de contato do usuário. |
| perfis | Array de String | Sim | Perfis associados à conta, podendo conter cidadao, funcionario ou ambos. |
| municipioId | ObjectId | Sim | Identificador do município ao qual a conta está vinculada. |
| setorId | ObjectId | Condicional | Identificador do setor ao qual o funcionário pertence. Obrigatório para contas com perfil funcionario. |
| cargo | String | Condicional | Cargo ocupado pelo funcionário. Obrigatório para contas com perfil funcionario. |
| dataCadastro | Date | Sim | Data e horário de criação da conta. |
| dataAtualizacao | Date | Não | Data e horário da última atualização dos dados da conta. |

### 2. Ocorrência
Descrição: Armazena chamados de cidadãos relacionados à arborização urbana.

Atributos principais:

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador interno BSON atribuído na criação e usado nas referências entre coleções. |
| id | String | Sim | Identificador personalizado da ocorrência, usado pelas telas e rotas da API. |
| protocolo | String | Sim | Código de acompanhamento apresentado ao cidadão. |
| municipioId | ObjectId | Sim | Identificador do documento do município associado. |
| cidadaoId | String | Sim | Identificador do cidadão associado ou valor anônimo. |
| tipoProblema | String | Sim | Categoria do problema informado. |
| descricao | String | Sim | Descrição do problema. |
| localizacao | String | Sim | Nome da rua informado para o local. |
| numero | String | Sim | Número do imóvel ou referência informado para o local. |
| bairro | String | Sim | Bairro informado para o local. |
| urgencia | String | Sim | Prioridade da ocorrência. |
| status | String | Sim | Situação atual do chamado. |

As ordens de serviço referenciam a ocorrência pelo ObjectId armazenado em `_id`, no campo `ocorrenciaId` da ordem.

### 3. Árvore
Descrição: Armazena o inventário de árvores do município, incluindo identificação, localização, características físicas, condição, risco e datas de manejo. Os dados são persistidos na coleção `arvores` do MongoDB.

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador interno BSON. É usado em referências como `arvoreId` nas ordens de serviço. Gerado pelo backend. |
| codigoArv | String | Sim | Código legível e único da árvore, gerado em sequência no formato `AR-00001`. |
| municipioId | ObjectId | Sim | Identificador do município associado. |
| nomePopular | String | Sim | Nome popular da árvore. Obrigatório no cadastro. |
| nomeCientifico | String | Não | Nome científico da espécie. |
| especie | String | Sim | Espécie ou classificação da árvore. Obrigatória no cadastro. |
| endereco | String | Não | Endereço textual da árvore. |
| bairro | String | Não | Bairro onde a árvore está localizada; também pode ser usado como filtro. |
| idade | String | Não | Idade informada da árvore, armazenada como texto (por exemplo, `20 anos`). |
| alturaMetros | Double | Não | Altura estimada em metros. Deve ser um número finito não negativo. |
| diametroCm | Double | Não | Diâmetro do tronco em centímetros. Deve ser um número finito não negativo. |
| estado | String | Não | Condição ou estado de conservação informado. |
| risco | String | Sim | Nível de risco. Valores do modelo: `Baixo`, `Médio`, `Alto` ou `Crítico`. |
| ativa | Boolean | Sim | Indica se a árvore está ativa no inventário. Inicia como `true`; pode ser alterada para arquivar ou reativar o registro. |
| caracteristicas | Documento | Sim | Agrupa características booleanas da árvore (detalhadas abaixo). |
| localizacao | Documento GeoJSON | Sim | Ponto geográfico no formato GeoJSON (detalhado abaixo), usado para buscas por proximidade. |
| ultimaPoda | Date | Não | Data e horário da poda mais recente. |
| ultimaInspecao | Date | Não | Data e horário da inspeção mais recente. |
| proximaManutencao | Date | Não | Data e horário previstos para a próxima manutenção. |
| fotos | Array de documentos | Sim | Fotos associadas ao registro. O cadastro inicial cria o array vazio; campos internos dependem dos dados anexados. |
| historico | Array de documentos | Sim | Eventos e intervenções registrados para a árvore. O cadastro inicial cria o array vazio; campos internos dependem dos eventos anexados. |
| documentos | Array de documentos | Sim | Documentos associados à árvore. O cadastro inicial cria o array vazio; campos internos dependem dos documentos anexados. |

O documento `caracteristicas` contém:

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| frutifera | Boolean | Sim | Indica se a árvore é frutífera. |
| manutencao | Boolean | Sim | Indica se há manutenção sinalizada para a árvore. |
| floracao | Boolean | Sim | Indica se a árvore está relacionada a floração. |
| alertaClimatico | Boolean | Sim | Indica se há alerta climático associado. |

O documento `localizacao` segue a estrutura GeoJSON `{"type":"Point","coordinates":[longitude, latitude]}`. As coordenadas são gravadas nessa ordem; longitude deve estar entre -180 e 180 e latitude entre -90 e 90. Ambas são obrigatórias no cadastro.

As medidas `alturaMetros` e `diametroCm` são opcionais. A geração do código, a validação do município e as regras de risco são aplicadas pelo backend. Os arrays `fotos`, `historico` e `documentos` são inicializados vazios e preservados durante atualizações do cadastro.

### 4. Ordem de Serviço
Descrição: Registra o serviço de manejo ou manutenção a ser executado em uma árvore, normalmente associado a uma ocorrência e, opcionalmente, atribuído a uma equipe. Os documentos são armazenados na coleção `ordens_servico`.

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador interno da ordem, gerado pelo sistema. No modelo Java é exposto como `ordemServicoId`. |
| codigo | String | Sim | Código sequencial legível da ordem, gerado pelo sistema e único entre as ordens que possuem código. |
| municipioId | ObjectId | Sim | Município ao qual a ordem pertence, obtido do contexto do funcionário autenticado. |
| arvoreId | ObjectId | Sim | Identificador da árvore relacionada à ordem. |
| ocorrenciaId | ObjectId | Sim | Identificador da ocorrência que originou ou está relacionada à ordem. |
| equipeId | ObjectId | Não | Identificador da equipe responsável. Ausente ou nulo enquanto não atribuída; ao atribuir, a ordem passa para `Em andamento`. |
| titulo | String | Sim | Título resumido do serviço. |
| descricao | String | Sim | Descrição do serviço a executar. |
| status | String | Sim | Situação da ordem. Valores de fluxo utilizados: `Aberta`, `Em andamento`, `Concluída` e `Cancelada`. Nova ordem sem equipe começa `Aberta`; com equipe começa `Em andamento`. |
| prioridade | String | Sim | Prioridade informada para o serviço. |
| observacoes | String | Não | Observações complementares sobre a execução. |
| motivoCancelamento | String | Condicional | Motivo obrigatório ao cancelar uma ordem nova. Pode estar ausente em registros antigos; é mantido separado de `observacoes`. |
| intervencaoConclusaoId | ObjectId | Condicional | Identificador da intervenção criada para registrar a conclusão da ordem. Vinculado quando a conclusão é persistida. |
| dataCriacao | Date | Sim | Data e horário de criação, armazenados como BSON Date (instante UTC). |
| dataAtualizacao | Date | Sim | Data e horário da última atualização, armazenados como BSON Date. Atualizado quando a ordem é alterada. |
| dataConclusao | Date | Condicional | Data e horário em que a ordem foi concluída; nulo/ausente antes da conclusão. |

O cadastro recebe `arvoreId`, `ocorrenciaId`, `titulo`, `descricao` e `prioridade`; `equipeId` e `observacoes` são opcionais. Os identificadores externos chegam como texto na API e são convertidos para `ObjectId` pelo backend. Ordens concluídas ou canceladas não podem ser editadas; a conclusão é registrada junto à intervenção correspondente.

### 5. Equipe
Descrição: Armazena equipes municipais criadas por funcionários autenticados.

Atributos:

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador único da equipe. |
| nome | String | Sim | Nome da equipe. |
| regiao | String | Sim | Região de atuação informada no cadastro. |
| status | String | Sim | Situação inicial da equipe, definida como "Disponível". |
| municipioId | ObjectId | Sim | Município obtido da conta do funcionário autenticado. |
| municipioNome | String | Sim | Nome do município obtido do cadastro de municípios no banco. |
| usuarioId | ObjectId | Sim | Conta do funcionário autenticado que criou a equipe. |
| usuarioNome | String | Sim | Nome do funcionário obtido da conta autenticada no banco. |
| gestor | Documento | Sim | Nome do gestor responsável, armazenado no campo `gestor.nome`. |
| dataCadastro | Date | Sim | Data e horário de criação da equipe. |
| colaboradores | Array de documentos | Sim | Colaboradores armazenados dentro do próprio documento da equipe. O array começa vazio. Os nomes de equipe são únicos (sem diferenciar maiúsculas de minúsculas). |

Cada elemento de `colaboradores` contém:

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador do colaborador dentro da equipe. |
| nomeCompleto | String | Sim | Nome completo informado no cadastro. |
| funcao | String | Sim | Função exercida pelo colaborador. |
| contato | String | Sim | Telefone ou e-mail de contato. |
| regiaoAtuacao | String | Sim | Região herdada da equipe no momento do cadastro. |
| disponivel | Boolean | Sim | Disponibilidade inicial do colaborador. |
| dataCadastro | Date | Sim | Data e horário em que foi adicionado à equipe. |

### 6. Recuperação de Senha
Descrição: Armazena solicitações de redefinição de senha associadas a uma conta. Os documentos ficam na coleção `recuperacoes_senha`. O código enviado por e-mail não é armazenado em texto puro; somente seu hash é persistido.

| Nome | Tipo | Obrigatoriedade | Descrição |
| --- | --- | --- | --- |
| _id | ObjectId | Sim | Identificador único da solicitação de recuperação, gerado pelo sistema. |
| contaId | ObjectId | Sim | Identificador da conta que solicitou a recuperação. |
| codigoHash | String | Sim | Hash BCrypt do código numérico de recuperação enviado ao e-mail da conta. O código original não é armazenado neste campo. |
| dataExpiracao | Date | Sim | Data e horário após os quais o código deixa de ser válido, armazenados como BSON Date (instante UTC). A validade padrão é de 10 minutos após a solicitação. |
| tentativas | Integer | Sim | Quantidade de tentativas incorretas de validação. Inicia em `0`; a solicitação é invalidada ao atingir 5 tentativas incorretas. |
| utilizado | Boolean | Sim | Indica se a solicitação já foi consumida ou invalidada. Inicia como `false` e passa para `true` após uso, expiração, limite de tentativas, falha no envio do e-mail ou substituição por uma solicitação mais recente. |

Uma nova solicitação invalida as recuperações anteriores da mesma conta. O código pode ser usado uma única vez e somente antes da expiração e do limite de tentativas.
