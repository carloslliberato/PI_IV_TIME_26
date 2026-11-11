db.arvores.updateOne(
  { _id: "10234" },
  {
    $set: {
      nomePopular: "Ipê-amarelo",
      nomeCientifico: "Handroanthus chrysotrichus",
      especie: "Árvore nativa",
      municipioId: "campinas",
      endereco: "R. Dr. Alberto Sarmento, 123",
      bairro: "Taquaral",
      idade: "20 anos",
      alturaMetros: 8,
      diametroCm: 35,
      estado: "Saudável",
      risco: "Médio",
      caracteristicas: {
        frutifera: false,
        manutencao: false,
        floracao: true,
        alertaClimatico: false
      },
      localizacao: {
        type: "Point",
        coordinates: [-47.0594, -22.8768]
      },
      ultimaPoda: ISODate("2023-08-10T12:00:00Z"),
      ultimaInspecao: ISODate("2024-03-15T12:00:00Z"),
      proximaManutencao: ISODate("2025-08-10T12:00:00Z"),
      fotos: [
        {
          url: "https://images.unsplash.com/photo-1599557626384-36efbcd7f77a?auto=format&fit=crop&w=1000&q=85",
          origem: "Cadastro demonstrativo"
        }
      ],
      historico: [
        {
          data: ISODate("2024-03-15T12:00:00Z"),
          tipo: "Vistoria",
          descricao: "Vistoria de rotina. Árvore saudável.",
          responsavel: "Equipe de arborização"
        },
        {
          data: ISODate("2023-08-10T12:00:00Z"),
          tipo: "Poda",
          descricao: "Poda de manutenção.",
          responsavel: "Equipe de manejo"
        }
      ],
      documentos: [
        {
          data: ISODate("2024-03-15T12:00:00Z"),
          tipo: "Laudo de vistoria",
          descricao: "Relatório de inspeção da árvore.",
          status: "Disponível"
        }
      ]
    }
  },
  { upsert: true }
);
