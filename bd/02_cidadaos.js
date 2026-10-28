db.cidadaos.updateOne(
  { _id: "CID-001" },
  {
    $set: {
      nomeCompleto: "Ana Exemplo",
      email: "ana.exemplo@example.com",
      telefone: "(19) 90000-0001",
      municipioId: "campinas",
      receberNotificacoes: true,
      preferencias: ["arvores-risco", "podas-programadas"],
      dataCadastro: ISODate("2026-10-20T12:00:00Z")
    }
  },
  { upsert: true }
);
