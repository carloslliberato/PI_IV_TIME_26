// Autor: Marialvo Junior

package model;

import org.bson.types.ObjectId;

public record EquipeParaOrdemDeServico(ObjectId id, String nome,
        String regiaoAtuacao, boolean disponivel, boolean atual) {
}
