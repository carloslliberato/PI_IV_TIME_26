db.ocorrencias.updateOne(
  { _id: "OC-2026-0241" },
  {
    $set: {
      municipioId: "campinas",
      cidadaoId: "CID-001",
      arvoreId: "10234",
      tipo: "galho-quebrado",
      tipoDescricao: "Galho quebrado",
      data: ISODate("2026-10-17T12:00:00Z"),
      endereco: "R. Dr. Alberto Sarmento, 123",
      bairro: "Taquaral",
      descricao: "Morador relata galhos tocando os cabos durante períodos de vento. Solicita avaliação e poda preventiva.",
      prioridade: "Alta",
      risco: "Alto",
      status: "Em atendimento",
      origem: "Portal do cidadão",
      receberNotificacoes: true,
      contatoSolicitante: {
        nome: "Ana Exemplo",
        email: "ana.exemplo@example.com",
        telefone: "(19) 90000-0001"
      },
      imagem: null
    }
  },
  { upsert: true }
);
