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
| preferenciasNotificacao | Array de String | Não | Categorias de notificações selecionadas pelo cidadão. |
| dataCadastro | Date | Sim | Data e horário de criação da conta. |
| dataAtualizacao | Date | Não | Data e horário da última atualização dos dados da conta. |

### 2. Equipe
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