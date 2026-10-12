# 1. O que cada pasta em backend representa?
    - src/ Reúne o código-fonte Java do backend
    - controller/ Recebe e interpreta as requisições feitas à API
    - service/ Contém as regras de negócios, como as validações para cadastrar uma árvore.
    - repository/ Responsável pelo acesso e pela persistência dos dados no MongoDB.
    - model/ Representa os objetos principais do domínio, como uma árvore ou uma ocorrência
    - dto/ Define os dados usados para receber requisições e devolver respostas pela API

# 2. Como compilar os arquivos Java

Os arquivos Java estão organizados da seguinte forma:

```text
PI_IV_TIME_26/
├── backend/
│   ├── bin/ 
│   └── src/
│       ├── Main.java
│       └── service/
│           └── ConexaoServidor.java
└── servidor/
    └── ...
```

- `src/`: contém os arquivos-fonte Java.
- `bin/`: recebe os arquivos `.class` gerados durante a compilação.
- `Main.java`: contém o método `main`, responsável por iniciar a aplicação e configurar os parâmetros da conexão.
- `service/ConexaoServidor.java`: implementa o estabelecimento e o encerramento da conexão com o servidor.

-> Compilação

Abra o terminal na pasta `backend` e execute:

```bash
javac -d bin src\Main.java src\service\ConexaoServidor.java
```

O comando compila os dois arquivos Java e grava os arquivos compilados no diretório `bin/`, respeitando a estrutura definida pelos pacotes (`package`) das classes.

Caso existam erros de compilação, eles deverão ser corrigidos antes de executar a aplicação.

##Para compilar todos os arquivos Java do backend de uma vez, abra o terminal na pasta `backend` e execute:

```powershell
javac -d bin (Get-ChildItem -Recurse -Filter *.java src).FullName
```

Esse comando procura todos os arquivos `.java` dentro da pasta `src` e de suas subpastas, compilando-os de uma só vez. Os arquivos compilados (`.class`) serão salvos na pasta `bin`, respeitando a organização dos pacotes definidos no código.

Após a compilação, execute a aplicação com:

```powershell
java -cp bin backend.src.Main
```

Sempre que houver alterações nos arquivos `.java`, é necessário compilar novamente antes de executar a aplicação.

A pasta `bin` contém apenas os arquivos gerados durante a compilação e não precisa ser enviada ao GitHub. Os arquivos `.class` também devem ser ignorados pelo `.gitignore`.

-> Execução

Ainda na pasta `backend`, execute:

```bash
java -cp bin backend.src.Main
```

O comando utiliza `bin/` como caminho para localizar as classes compiladas e inicia a classe `Main`, identificada pelo pacote `backend.src`.

Por padrão, a aplicação tenta se conectar ao servidor em `localhost`, na porta `3000`.

Também é possível informar o endereço do servidor e a porta como argumentos:

```bash
java -cp bin backend.src.Main localhost 3000
```

A ordem dos argumentos é:

1. Endereço ou host do servidor.
2. Porta em que o servidor está aguardando conexões.

Ambos são opcionais, desde que sejam informados na ordem correta. Se nenhum argumento for fornecido, serão utilizados os valores padrão definidos em `Main.java`.

### Ordem de inicialização

1. Iniciar o servidor Java do projeto, que ficará aguardando conexões na porta configurada.
2. Compilar os arquivos do backend.
3. Executar a classe `Main`.
4. Verificar se a conexão com o servidor foi estabelecida.

**Importante:** o servidor deve estar em execução antes de iniciar o backend. Caso contrário, a conexão poderá falhar.

Sempre que houver alterações nos arquivos `.java`, é necessário recompilar o código antes de executar novamente a aplicação.