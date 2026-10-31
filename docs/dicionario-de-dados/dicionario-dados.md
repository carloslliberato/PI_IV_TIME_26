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