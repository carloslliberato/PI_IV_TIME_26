package model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.bson.types.ObjectId;

// Representa uma equipe criada e vinculada a um município e funcionário.
public class Equipe {

    private final ObjectId id;
    private final String nome;
    private final String regiaoAtuacao;
    private final String gestor;
    private final String status;
    private final ObjectId municipioId;
    private final String municipioNome;
    private final ObjectId usuarioId;
    private final String usuarioNome;
    private final Instant dataCadastro;
    private final List<Colaborador> colaboradores;

    // Cria e valida uma equipe antes de encaminhá-la para persistência.
    public Equipe(
            String nome,
            String regiaoAtuacao,
            String gestor,
            ObjectId municipioId,
            String municipioNome,
            ObjectId usuarioId,
            String usuarioNome) {

        this(
                new ObjectId(),
                nome,
                regiaoAtuacao,
                gestor,
                "Disponível",
                municipioId,
                municipioNome,
                usuarioId,
                usuarioNome,
                Instant.now(),
                List.of());
    }

    // Recupera uma equipe já persistida, preservando seus valores do MongoDB.
    public Equipe(
            ObjectId id,
            String nome,
            String regiaoAtuacao,
            String gestor,
            String status,
            ObjectId municipioId,
            String municipioNome,
            ObjectId usuarioId,
            String usuarioNome,
            Instant dataCadastro) {
        this(
                id,
                nome,
                regiaoAtuacao,
                gestor,
                status,
                municipioId,
                municipioNome,
                usuarioId,
                usuarioNome,
                dataCadastro,
                List.of());
    }

    // Recupera a equipe e seus colaboradores embutidos no mesmo documento.
    public Equipe(
            ObjectId id,
            String nome,
            String regiaoAtuacao,
            String gestor,
            String status,
            ObjectId municipioId,
            String municipioNome,
            ObjectId usuarioId,
            String usuarioNome,
            Instant dataCadastro,
            List<Colaborador> colaboradores) {

        if (id == null || municipioId == null || usuarioId == null) {
            throw new IllegalArgumentException(
                    "ID, município e usuário da equipe são obrigatórios.");
        }

        if (dataCadastro == null) {
            throw new IllegalArgumentException(
                    "A data de cadastro da equipe é obrigatória.");
        }

        this.id = id;
        this.nome = validarTexto(nome, "O nome da equipe é obrigatório.");
        this.regiaoAtuacao = validarTexto(
                regiaoAtuacao,
                "A região de atuação é obrigatória.");
        this.gestor = validarTexto(
                gestor,
                "O gestor responsável é obrigatório.");
        this.status = validarTexto(status, "O status da equipe é obrigatório.");
        this.municipioId = municipioId;
        this.municipioNome = municipioNome;
        this.usuarioId = usuarioId;
        this.usuarioNome = usuarioNome;
        this.dataCadastro = dataCadastro;
        this.colaboradores = colaboradores == null
                ? new ArrayList<>()
                : new ArrayList<>(colaboradores);
    }

    // Impede que campos obrigatórios de texto sejam salvos vazios.
    private String validarTexto(String valor, String mensagem) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(mensagem);
        }

        return valor.trim();
    }

    // Getters usados pelo repositório e pela resposta da API.
    public ObjectId getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getRegiaoAtuacao() {
        return regiaoAtuacao;
    }

    public String getGestor() {
        return gestor;
    }

    public String getStatus() {
        return status;
    }

    public ObjectId getMunicipioId() {
        return municipioId;
    }

    public String getMunicipioNome() {
        return municipioNome;
    }

    public ObjectId getUsuarioId() {
        return usuarioId;
    }

    public String getUsuarioNome() {
        return usuarioNome;
    }

    public Instant getDataCadastro() {
        return dataCadastro;
    }

    // Devolve uma cópia da lista embutida para impedir alterações externas.
    public List<Colaborador> getColaboradores() {
        return new ArrayList<>(colaboradores);
    }
}
