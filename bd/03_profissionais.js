db.profissionais.updateOne(
  { _id: "FUN-001" },
  {
    $set: {
      nomeCompleto: "Rafael Almeida",
      telefone: "(19) 98821-3401",
      email: "rafael.almeida@example.com",
      municipioId: "campinas",
      setor: "Departamento de Arborização Urbana",
      outroSetor: null,
      cargo: "Engenheiro florestal",
      declaracaoAutorizacao: true,
      situacaoCadastro: "Pendente de aprovação",
      equipeId: "EQ-001",
      funcao: "Engenheiro florestal",
      contato: "(19) 98821-3401",
      regiaoAtuacao: "Taquaral e região Norte",
      disponivel: false
    }
  },
  { upsert: true }
);
