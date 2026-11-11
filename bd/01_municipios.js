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
