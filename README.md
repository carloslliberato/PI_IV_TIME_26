# Arboriza — Gestão Preventiva da Arborização Urbana

> Projeto Integrador IV — Engenharia de Software · PUC Campinas
> 2026 · Turma T1 · Grupo G26
> Professora: Renata Antonia Tadeu Arantes

---

## Descrição

O **Arboriza** é uma aplicação acadêmica para apoiar a gestão municipal da arborização urbana. O sistema reúne o inventário de árvores, o registro de ocorrências feitas por cidadãos e o planejamento do atendimento por equipes e ordens de serviço.

A aplicação possui um portal público para cidadãos e um painel profissional para funcionários municipais. Os dados são armazenados no MongoDB; o backend disponibiliza páginas e API HTTP e se comunica com um servidor Java via Socket para validações.

---

## Funcionalidades

### Portal do cidadão

- Cadastro, login e acompanhamento de chamados.
- Abertura de ocorrências relacionadas a árvores, com localização, descrição, prioridade e contato para notificações.
- Consulta do protocolo de acompanhamento da ocorrência.

### Gestão profissional

- Cadastro e consulta de árvores, com localização geográfica, espécie, estado, nível de risco e histórico.
- Visualização de árvores e ocorrências no mapa, além de filtros e busca.
- Cadastro de equipes municipais, códigos personalizados, colaboradores, região de atuação e disponibilidade.
- Consulta e atualização de ocorrências, incluindo status e nível de risco.
- Criação, atribuição, acompanhamento, conclusão e cancelamento de ordens de serviço.
- Registro e consulta de intervenções e relatórios de árvores, ocorrências, equipes e ordens de serviço.

### Identificadores

Os documentos MongoDB mantêm seus ObjectIds para uso interno e em referências entre coleções. O sistema também possui códigos legíveis separados, como `AR-00001` para árvores, `EQ-000001` para equipes, `OC-000001` para ocorrências e códigos `OS-...` para ordens de serviço. O protocolo `CH-...` permanece separado do identificador personalizado da ocorrência.

---

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Java 17 ou superior | Backend HTTP e servidor Socket |
| Gradle Wrapper 9.2 | Compilação, dependências, testes e execução |
| Javalin 6.3 | Servidor HTTP e API REST |
| MongoDB Java Driver 5.2 | Persistência e consultas ao MongoDB |
| HTML, CSS e JavaScript | Portais público e profissional |
| Java Object Serialization / Socket | Comunicação entre backend e servidor de validação |
| Gson, Jackson e jBCrypt | JSON e operações de apoio do backend |
| JUnit 5 | Testes automatizados |

---

## Estrutura do projeto

```text
PI_IV_TIME_26/
├── backend/
│   ├── src/
│   │   ├── config/          # Rotas HTTP e configuração das páginas
│   │   ├── controller/      # Endpoints e respostas da API
│   │   ├── dto/              # Objetos de entrada e saída
│   │   ├── model/            # Entidades do domínio
│   │   ├── protocolo/        # Mensagens trocadas via Socket
│   │   ├── repository/       # Persistência MongoDB
│   │   └── service/          # Regras de negócio e integração
│   └── test/                 # Testes do backend
├── servidor/
│   ├── src/                  # Servidor Socket e validadores
│   └── test/                 # Testes do servidor
├── frontend/
│   ├── cadastro_funcionario/
│   ├── login/
│   ├── perfil_profissional/
│   └── perfil_publico/
├── bd/                       # Scripts e consultas de referência MongoDB
├── docs/                     # Arquitetura, APIs e dicionário de dados
├── scripts/                  # Scripts auxiliares de teste e verificação
├── gradle/wrapper/           # Gradle Wrapper
├── build.gradle
├── settings.gradle
├── gradlew
└── gradlew.bat
```

---

## Pré-requisitos

- JDK 17 ou superior.
- MongoDB acessível (local ou Atlas), configurado para o backend.
- Git para clonar o repositório.

O banco usado pela aplicação é `arboriza_db`. Antes de executar em outro ambiente, ajuste a conexão do backend para apontar a uma instância MongoDB acessível. O Gradle Wrapper está incluído; não é necessário instalar o Gradle separadamente. Não publique nem adicione credenciais do banco à documentação ou ao controle de versão.

O diretório `bd/` contém scripts de exemplo e consultas MongoDB. Eles não são executados automaticamente e podem refletir formatos de dados anteriores; revise-os antes de executá-los em um banco real.

---

## Como executar

### 1. Clonar o repositório

```bash
git clone https://github.com/carloslliberato/PI_IV_TIME_26.git
cd PI_IV_TIME_26
```

### 2. Iniciar o servidor Socket

Em um primeiro terminal, na raiz do projeto:

```bash
# Windows
.\gradlew.bat :servidor:run

# Linux ou macOS
./gradlew :servidor:run
```

O servidor fica aguardando conexões na porta `3000`. Mantenha o terminal aberto.

### 3. Iniciar o backend

Em um segundo terminal, também na raiz:

```bash
# Windows
.\gradlew.bat :backend:run

# Linux ou macOS
./gradlew :backend:run
```

O backend conecta-se ao servidor Socket em `localhost:3000`, acessa o MongoDB e inicia o servidor HTTP na porta `8080`. A inicialização exige que as duas dependências estejam acessíveis.

### 4. Acessar a aplicação

Abra `http://localhost:8080/`. Algumas rotas disponíveis são:

| Rota | Área |
| --- | --- |
| `/` | Portal público |
| `/abrir-chamado` | Abertura de ocorrência |
| `/acompanhar-chamado` | Acompanhamento de chamado |
| `/cadastro-cidadao` | Cadastro de cidadão |
| `/ocorrencias-cidadao` | Consulta de ocorrências do cidadão |
| `/login` | Autenticação |
| `/cadastro-funcionario` | Cadastro de funcionário |
| `/perfil-profissional` | Início do painel profissional |
| `/arvores` | Inventário de árvores |
| `/mapa-profissional` | Mapa profissional |
| `/ocorrencias` | Gestão de ocorrências |
| `/equipes` | Gestão de equipes |
| `/ordens-servico` | Ordens de serviço |
| `/relatorio` | Relatórios |

As páginas profissionais requerem uma sessão autenticada de funcionário.

---

## Compilação e testes

Para compilar os dois módulos:

```bash
.\gradlew.bat :backend:build :servidor:build
```

Para executar os testes:

```bash
.\gradlew.bat :backend:test :servidor:test
```

Use `./gradlew` no Linux ou macOS. Alguns testes de integração precisam de `MONGODB_TEST_URI` apontando para um banco exclusivo de testes; os testes que dependem dessa variável são ignorados quando ela não está configurada. Os testes de transações MongoDB também exigem um replica set ou cluster compatível.

---

## API e documentação

A API HTTP está organizada por recursos, incluindo contas, árvores, equipes, ocorrências, ordens de serviço, intervenções e relatórios. As rotas estão registradas em `backend/src/config/ConfiguracaoRotas.java`.

Documentação complementar:

- [Arquitetura e execução](./docs/arquitetura.md)
- [Dicionário de dados](./docs/dicionario-de-dados/dicionario-dados.md)
- [Integração de equipes e ordens de serviço](./docs/api-equipes-os.md)
- [Cadastro de ordens de serviço](./docs/api-cadastro-os.md)
- [Conclusão de ordens de serviço](./docs/api-conclusao-os.md)
- [Cancelamento de ordens de serviço](./docs/api-cancelamento-os.md)
- [Relatórios de ordens de serviço](./docs/api-relatorios-os.md)
- [Intervenções](./docs/api-intervencoes.md)

---

## Dados e segurança

O banco de dados contém dados pessoais de contas e cidadãos. Utilize dados de teste, proteja as credenciais do MongoDB e não publique informações pessoais ou configurações privadas. Antes de atualizar uma base existente, faça backup: algumas migrações de códigos personalizados são executadas na inicialização do backend.

---

## Integrantes

| Nome |
| --- |
| Carlos Luciano da Silva Liberato |
| Gabrielle Mota de Souza Pinto |
| Guilherme Mascarenhas Plácido Corrêa |
| Marialvo Corrêa de Freitas Junior |
| Sophia Victória Martins Fernandes |

---

## Licença

Projeto acadêmico desenvolvido para fins educacionais — PUC Campinas, 2026.