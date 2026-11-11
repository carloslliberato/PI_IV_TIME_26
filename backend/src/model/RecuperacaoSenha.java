
package model;

import java.time.Instant;
import java.util.Objects;

import org.bson.types.ObjectId;

public class RecuperacaoSenha {

    private final ObjectId _id;
    private final ObjectId contaId;

    private String codigoHash;
    private Instant dataExpiracao;
    private int tentativas;
    private boolean utilizado;

    // Construtor para criar uma nova recuperação
    public RecuperacaoSenha(
            ObjectId contaId,
            String codigoHash,
            Instant dataExpiracao) {

        if (contaId == null) {
            throw new IllegalArgumentException("A conta é obrigatória.");
        }

        if (codigoHash == null || codigoHash.isBlank()) {
            throw new IllegalArgumentException("O hash do código é obrigatório.");
        }

        if (dataExpiracao == null) {
            throw new IllegalArgumentException("A data de expiração é obrigatória.");
        }

        this._id = new ObjectId();
        this.contaId = contaId;
        this.codigoHash = codigoHash;
        this.dataExpiracao = dataExpiracao;
        this.tentativas = 0;
        this.utilizado = false;
    }

    // Construtor para recuperar uma recuperação existente do MongoDB
    public RecuperacaoSenha(
            ObjectId id,
            ObjectId contaId,
            String codigoHash,
            Instant dataExpiracao,
            int tentativas,
            boolean utilizado) {

        this._id = id;
        this.contaId = contaId;
        this.codigoHash = codigoHash;
        this.dataExpiracao = dataExpiracao;
        this.tentativas = tentativas;
        this.utilizado = utilizado;
    }

    public ObjectId getId() {
        return _id;
    }

    public ObjectId getContaId() {
        return contaId;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public Instant getDataExpiracao() {
        return dataExpiracao;
    }

    public int getTentativas() {
        return tentativas;
    }

    public boolean isUtilizado() {
        return utilizado;
    }

    public void incrementarTentativas() {
        this.tentativas++;
    }

    public void marcarComoUtilizado() {
        this.utilizado = true;
    }

    public boolean estaExpirado() {
        return Instant.now().isAfter(dataExpiracao);
    }

    @Override
    public boolean equals(Object objeto) {
        if (this == objeto) {
            return true;
        }

        if (!(objeto instanceof RecuperacaoSenha)) {
            return false;
        }

        RecuperacaoSenha outra = (RecuperacaoSenha) objeto;

        return Objects.equals(_id, outra._id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(_id);
    }
}
