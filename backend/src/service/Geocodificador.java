// Autor: Gabrielle Mota

package service;

import java.util.Optional;

// Contrato para converter um endereço em coordenadas sem acoplar os serviços
// a um provedor específico de geocodificação.
public interface Geocodificador {
    // Retorna coordenadas quando o endereço pode ser localizado; caso contrário,
    // retorna Optional.empty() para permitir que o cadastro continue sem marcador.
    Optional<Coordenadas> geocodificar(
            String endereco,
            String numero,
            String bairro,
            String municipio);

    // Par de coordenadas geográficas no formato latitude/longitude.
    record Coordenadas(double latitude, double longitude) {}
}
