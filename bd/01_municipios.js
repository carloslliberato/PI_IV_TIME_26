// Autor: Carlos Luciano

[
  {
    _id: "campinas",
    nome: "Campinas",
    estado: "SP",
    ativo: true,
    localizacao: {
      type: "Point",
      coordinates: [-47.0608, -22.9056]
    },
    zoomMapa: 13,
    idsAlternativosFrontend: ["campinas-demo", "Campinas - SP", "Campinas"]
  },
  {
    _id: "hortolandia",
    nome: "Hortolândia",
    estado: "SP",
    ativo: true,
    localizacao: {
      type: "Point",
      coordinates: [-47.22, -22.8583]
    },
    zoomMapa: 13,
    idsAlternativosFrontend: ["Hortolândia - SP", "Hortolândia"]
  },
  {
    _id: "sumare",
    nome: "Sumaré",
    estado: "SP",
    ativo: true,
    localizacao: {
      type: "Point",
      coordinates: [-47.266, -22.8214]
    },
    zoomMapa: 13,
    idsAlternativosFrontend: ["Sumaré - SP", "Sumaré"]
  },
  {
    _id: ObjectId("6b0382ed251d742536f8cd10"),
    nome: "Valinhos",
    estado: "SP",
    ativo: true,
    localizacao: { type: "Point", coordinates: [-46.9978148, -22.9702933] },
    zoomMapa: 13,
    idsAlternativosFrontend: ["Valinhos - SP", "Valinhos"]
  },
  {
    _id: ObjectId("6b0382ed251d742536f8cd11"),
    nome: "Vinhedo",
    estado: "SP",
    ativo: true,
    localizacao: { type: "Point", coordinates: [-46.9753, -23.0297] },
    zoomMapa: 13,
    idsAlternativosFrontend: ["Vinhedo - SP", "Vinhedo"]
  }
].forEach(municipio => {
  const municipioId = municipio._id;
  delete municipio._id;
  db.municipios.updateOne(
    { _id: municipioId },
    { $set: municipio },
    { upsert: true }
  );
});
