# Geocodificação de endereços

O backend geocodifica os endereços de árvores e ocorrências usando a API pública do
[Nominatim/OpenStreetMap](https://nominatim.openstreetmap.org/). Não é necessário instalar
um cliente ou informar uma chave de API.

## Configuração

- `NOMINATIM_SEARCH_ENDPOINT`: endpoint de busca. O padrão é
  `https://nominatim.openstreetmap.org/search`.
- `NOMINATIM_USER_AGENT`: identificação HTTP da aplicação. O backend usa uma identificação
  Arboriza padrão quando essa variável não está definida.

O serviço limita as consultas a uma por segundo e mantém uma cache em memória. Em implantações
com várias instâncias do backend, é necessário compartilhar a limitação e a cache entre elas.

## Fluxo e falhas

- Ao cadastrar ou editar uma árvore, o backend consulta o endereço, bairro e município e salva
  as coordenadas no ponto GeoJSON da árvore.
- Ao abrir uma ocorrência, o backend geocodifica o endereço do local e salva latitude e longitude.
- Uma OS não faz uma consulta própria: o mapa usa a localização da ocorrência vinculada ou,
  na ausência dela, da árvore vinculada.
- Se não houver correspondência ou o serviço estiver indisponível, o registro é salvo sem
  coordenadas. A interface avisa que ele não terá marcador até que haja coordenadas.
- Registros já existentes não são geocodificados em massa nem alterados automaticamente.

O mapa exibe os créditos do OpenStreetMap. A API pública tem capacidade limitada: não deve ser
usada para autocomplete ou consultas em lote, exige identificação da aplicação, cache e no máximo
uma requisição por segundo por aplicação. Não envie endereços privados ou dados pessoais ao serviço.
Consulte a [política oficial do Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
