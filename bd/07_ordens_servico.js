db.ordens_servico.updateOne(
  { _id: "OS-2026-0381" },
  {
    $set: {
      municipioId: "campinas",
      ocorrenciaId: "OC-2026-0241",
      arvoreId: "10234",
      equipeId: "EQ-001",
      tipo: "Poda preventiva",
      descricao: "Executar poda preventiva dos galhos em contato com a rede elétrica e registrar as condições da copa após o serviço.",
      status: "Em andamento",
      risco: "Alto",
      dataCriacao: ISODate("2026-10-16T12:00:00Z"),
      dataInicio: ISODate("2026-10-17T12:00:00Z"),
      dataConclusao: null,
      comentarioConclusao: ""
    }
  },
  { upsert: true }
);
