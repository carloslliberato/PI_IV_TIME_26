package model;

import java.time.Instant;

import org.bson.types.ObjectId;

// Representa um colaborador salvo dentro do documento de sua equipe.
public class Colaborador {

    private final ObjectId id;
    private final String nomeCompleto;
    private final String funcao;
    private final String email;
    private final String regiaoAtuacao;
    private final boolean disponivel;
    private final Instant dataCadastro;

    // Cria um novo colaborador disponível e define seu identificador e data.
    public Colaborador(
            String nomeCompleto,
            String funcao,
            String email,
            String regiaoAtuacao) {
        this(
                new ObjectId(),
                nomeCompleto,
                funcao,
                email,
                regiaoAtuacao,
                true,
                Instant.now());
    }

    // Reconstitui um colaborador lido do documento MongoDB.
    public Colaborador(
            ObjectId id,
            String nomeCompleto,
            String funcao,
            String email,
            String regiaoAtuacao,
            boolean disponivel,
            Instant dataCadastro) {
        if (id == null || dataCadastro == null) {
            throw new IllegalArgumentException(
                    "ID e data de cadastro do colaborador são obrigatórios.");
        }

        this.id = id;
        this.nomeCompleto = validar(nomeCompleto, "O nome do colaborador é obrigatório.");
        this.funcao = validar(funcao, "A função do colaborador é obrigatória.");
        this.email = validar(email, "O e-mail do colaborador é obrigatório.");
        this.regiaoAtuacao = validar(
                regiaoAtuacao,
                "A região de atuação do colaborador é obrigatória.");
        this.disponivel = disponivel;
        this.dataCadastro = dataCadastro;
    }

    // Valida e normaliza os textos antes de mantê-los no objeto.
    private String validar(String valor, String mensagem) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(mensagem);
        }

        return valor.trim();
    }

    // Retorna o ID usado para identificar o elemento dentro do array colaboradores.
    public ObjectId getId() {
        return id;
    }

    // Retorna o nome completo do colaborador.
    public String getNomeCompleto() {
        return nomeCompleto;
    }

    // Retorna a função exercida na equipe.
    public String getFuncao() {
        return funcao;
    }

    // Retorna o e-mail informado no cadastro.
    public String getEmail() {
        return email;
    }

    // Retorna a região herdada da equipe.
    public String getRegiaoAtuacao() {
        return regiaoAtuacao;
    }

    // Retorna a disponibilidade inicial do colaborador.
    public boolean isDisponivel() {
        return disponivel;
    }

    // Retorna a data de inclusão no documento da equipe.
    public Instant getDataCadastro() {
        return dataCadastro;
    }
}
