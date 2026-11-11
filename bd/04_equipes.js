db.equipes.updateOne(
  { _id: "EQ-001" },
  {
    $set: {
      nome: "Equipe Norte",
      regiao: "Taquaral e região Norte",
      status: "Indisponível",
      municipioId: "campinas",
      gestor: {
        nome: "Mariana Costa"
      },
      profissionalIds: ["FUN-001"]
    }
  },
  { upsert: true }
);
