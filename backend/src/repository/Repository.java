package repository;

import org.bson.types.ObjectId;
import java.util.Optional;

public interface Repository<T> {

    public void salvar(T objeto); // recebe um objeto e salva no banco

    // a classe Optional<T> representa um resultado que pode ou não existir
    public Optional<T> buscarPorId(ObjectId id); // busca um registro pelo identificador

    public boolean excluir(ObjectId id);  // tenta excluir o registro e informa se conseguiu
}