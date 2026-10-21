package backend.src.model;

public class Arvore {

    private int id;
    private String especie;
    private double latitude;
    private double longitude;
    private Risco risco;

    public Arvore(int id, String especie, double latitude, double longitude, Risco risco) {
        this.id = id;
        this.especie = especie;
        this.latitude = latitude;
        this.longitude = longitude;
        this.risco = risco;
    }

    public int getId() {
        return this.id;
    }

    public String getEspecie() {
        return this.especie;
    }

    public double getLatitude() {
        return this.latitude;
    }

    public double getLongitude() {
        return this.longitude;
    }

    public Risco getRisco() {
        return this.risco;
    }
}