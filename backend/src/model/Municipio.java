// Autor: Carlos Luciano

package model;

import org.bson.types.ObjectId;

// Classe que representa um município
public class Municipio {
    private ObjectId municipioId;
    private String nome;

    public Municipio(ObjectId municipioId, String nome) {
        this.municipioId = municipioId;
        this.nome = nome;
    }
    
    // Getters e Setters
    public ObjectId getMunicipioId() {
        return municipioId;
    }
    public void setMunicipioId(ObjectId municipioId) {
        this.municipioId = municipioId;
    }
    public String getNome() {
        return nome;
    }
    public void setNome(String nome) {
        this.nome = nome;
    }

    
}
