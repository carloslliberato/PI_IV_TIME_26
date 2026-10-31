# Estrutura e execução do projeto Arboriza

## 1. Organização do Backend

O backend está organizado em pacotes, cada um com uma responsabilidade específica:

- **src/**: reúne os arquivos-fonte Java do backend.
- **controller/**: recebe e interpreta as requisições HTTP feitas à API, encaminhando as operações para a camada de serviço.
- **service/**: contém as regras de negócio da aplicação, como validações e operações relacionadas ao cadastro de árvores e ocorrências.
- **repository/**: é responsável pelo acesso e pela persistência dos dados no MongoDB.
- **model/**: representa as entidades e os objetos principais do sistema, como árvores e ocorrências.
- **dto/**: define os objetos utilizados para transportar dados entre o cliente e o backend, tanto no recebimento de requisições quanto no envio de respostas.

## 2. Organização do projeto com Gradle

O projeto utiliza o Gradle para gerenciar a compilação, as dependências e a execução dos módulos.

A estrutura principal é composta por:

```text
PI_IV_TIME_26/
├── backend/
│   └── src/
│       └── ...
├── servidor/
│   └── src/
│       └── ...
├── frontend/
│   └── ...
├── gradlew
├── gradlew.bat
├── settings.gradle
└── build.gradle
```

- **backend/**: contém a aplicação Java responsável pelas funcionalidades do sistema, pela conexão com o MongoDB e pelo servidor HTTP Javalin.
- **servidor/**: contém a implementação do servidor Java desenvolvido pelo professor, responsável por aceitar as conexões dos clientes.
- **frontend/**: contém as páginas HTML, folhas de estilo CSS, scripts JavaScript e demais recursos visuais da aplicação.
- **gradlew / gradlew.bat**: são os arquivos do Gradle Wrapper, utilizados para executar tarefas do Gradle sem precisar instalar uma versão específica manualmente.
- **settings.gradle**: configura os módulos que fazem parte do projeto.
- **build.gradle**: contém as configurações de compilação, dependências e tarefas do Gradle.

## 3. Como executar o projeto

A execução é realizada pelo Gradle Wrapper, que automatiza a compilação e a inicialização das aplicações.

**Importante:** abra o terminal na pasta raiz do projeto (`PI_IV_TIME_26`), onde estão localizados os arquivos `gradlew` e `gradlew.bat`.

### 3.1. Iniciar o servidor

Abra o primeiro terminal e execute:

```powershell
.\gradlew.bat :servidor:run
```

Esse comando inicia o servidor Java do projeto, que ficará aguardando conexões na porta configurada.

Mantenha esse terminal aberto enquanto estiver utilizando a aplicação.

### 3.2. Iniciar o backend

Abra um segundo terminal, também na pasta raiz do projeto, e execute:

```powershell
.\gradlew.bat :backend:run
```

Esse comando executa o backend e realiza automaticamente as etapas necessárias de compilação.

Durante a inicialização, o backend:

1. Estabelece uma conexão com o servidor Java do projeto.
2. Conecta-se ao MongoDB.
3. Inicia o servidor HTTP utilizando o Javalin.

Após a inicialização, o servidor HTTP ficará disponível na porta **8080**.

### 3.3. Acessar a aplicação

Com o backend em execução, abra o navegador e acesse:

```text
http://localhost:8080/
```

As demais páginas podem ser acessadas por suas respectivas rotas, como:

- `http://localhost:8080/login`
- `http://localhost:8080/abrir-chamado`
- `http://localhost:8080/perfil-profissional`

O Javalin é responsável por disponibilizar as páginas HTML e os arquivos estáticos do frontend, como CSS, JavaScript e imagens.

## 4. Compilação e atualização do projeto

Não é necessário realizar a compilação manualmente com `javac`.

O Gradle executa automaticamente a compilação necessária ao iniciar as tarefas de execução dos módulos.

Caso queira apenas compilar e verificar se os módulos estão compilando corretamente, execute na raiz do projeto:

```powershell
.\gradlew.bat build
```

Sempre que houver alterações nos arquivos Java, basta executar novamente a tarefa correspondente ao módulo para iniciar a aplicação com as alterações.

## 5. Ordem de inicialização

Para executar o projeto corretamente, siga esta ordem:

1. Iniciar o servidor Java utilizando `:servidor:run`.
2. Iniciar o backend utilizando `:backend:run`.
3. Acessar a aplicação pelo navegador em `http://localhost:8080/`.

**Observação:** os dois primeiros comandos devem permanecer em execução em terminais separados. O servidor precisa estar ativo para que o backend consiga estabelecer a conexão com ele.