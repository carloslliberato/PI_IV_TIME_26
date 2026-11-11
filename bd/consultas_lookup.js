// Equipe com município, perfis dos profissionais e ordens relacionadas.
// Cada ordem inclui sua ocorrência, cidadão solicitante, árvore e município.
db.equipes.aggregate([
  {
    $lookup: {
      from: "municipios",
      localField: "municipioId",
      foreignField: "_id",
      as: "municipio"
    }
  },
  { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "profissionais",
      localField: "profissionalIds",
      foreignField: "_id",
      pipeline: [
        {
          $lookup: {
            from: "municipios",
            localField: "municipioId",
            foreignField: "_id",
            as: "municipio"
          }
        },
        { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } }
      ],
      as: "profissionais"
    }
  },
  {
    $lookup: {
      from: "ordens_servico",
      localField: "_id",
      foreignField: "equipeId",
      pipeline: [
        {
          $lookup: {
            from: "ocorrencias",
            localField: "ocorrenciaId",
            foreignField: "_id",
            pipeline: [
              {
                $lookup: {
                  from: "cidadaos",
                  localField: "cidadaoId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $lookup: {
                        from: "municipios",
                        localField: "municipioId",
                        foreignField: "_id",
                        as: "municipio"
                      }
                    },
                    { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } }
                  ],
                  as: "cidadao"
                }
              },
              { $unwind: { path: "$cidadao", preserveNullAndEmptyArrays: true } }
            ],
            as: "ocorrencia"
          }
        },
        { $unwind: { path: "$ocorrencia", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "arvores",
            localField: "arvoreId",
            foreignField: "_id",
            pipeline: [
              {
                $lookup: {
                  from: "municipios",
                  localField: "municipioId",
                  foreignField: "_id",
                  as: "municipio"
                }
              },
              { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } }
            ],
            as: "arvore"
          }
        },
        { $unwind: { path: "$arvore", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "municipios",
            localField: "municipioId",
            foreignField: "_id",
            as: "municipio"
          }
        },
        { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } }
      ],
      as: "ordensServico"
    }
  },
  {
    $project: {
      _id: 1,
      nome: 1,
      regiao: 1,
      status: 1,
      gestor: 1,
      municipio: {
        _id: "$municipio._id",
        nome: "$municipio.nome",
        estado: "$municipio.estado"
      },
      profissionais: {
        $map: {
          input: "$profissionais",
          as: "profissional",
          in: {
            _id: "$$profissional._id",
            nomeCompleto: "$$profissional.nomeCompleto",
            telefone: "$$profissional.telefone",
            email: "$$profissional.email",
            setor: "$$profissional.setor",
            outroSetor: "$$profissional.outroSetor",
            cargo: "$$profissional.cargo",
            declaracaoAutorizacao: "$$profissional.declaracaoAutorizacao",
            situacaoCadastro: "$$profissional.situacaoCadastro",
            funcao: "$$profissional.funcao",
            contato: "$$profissional.contato",
            regiaoAtuacao: "$$profissional.regiaoAtuacao",
            disponivel: "$$profissional.disponivel",
            municipio: {
              _id: "$$profissional.municipio._id",
              nome: "$$profissional.municipio.nome",
              estado: "$$profissional.municipio.estado"
            }
          }
        }
      },
      ordensServico: {
        $map: {
          input: "$ordensServico",
          as: "ordem",
          in: {
            _id: "$$ordem._id",
            tipo: "$$ordem.tipo",
            status: "$$ordem.status",
            risco: "$$ordem.risco",
            dataCriacao: "$$ordem.dataCriacao",
            dataInicio: "$$ordem.dataInicio",
            dataConclusao: "$$ordem.dataConclusao",
            comentarioConclusao: "$$ordem.comentarioConclusao",
            ocorrencia: {
              _id: "$$ordem.ocorrencia._id",
              tipo: "$$ordem.ocorrencia.tipo",
              tipoDescricao: "$$ordem.ocorrencia.tipoDescricao",
              status: "$$ordem.ocorrencia.status",
              prioridade: "$$ordem.ocorrencia.prioridade",
              descricao: "$$ordem.ocorrencia.descricao",
              cidadao: {
                _id: "$$ordem.ocorrencia.cidadao._id",
                nomeCompleto: "$$ordem.ocorrencia.cidadao.nomeCompleto",
                email: "$$ordem.ocorrencia.cidadao.email",
                telefone: "$$ordem.ocorrencia.cidadao.telefone",
                municipio: {
                  _id: "$$ordem.ocorrencia.cidadao.municipio._id",
                  nome: "$$ordem.ocorrencia.cidadao.municipio.nome",
                  estado: "$$ordem.ocorrencia.cidadao.municipio.estado"
                }
              }
            },
            arvore: {
              _id: "$$ordem.arvore._id",
              nomePopular: "$$ordem.arvore.nomePopular",
              nomeCientifico: "$$ordem.arvore.nomeCientifico",
              endereco: "$$ordem.arvore.endereco",
              bairro: "$$ordem.arvore.bairro",
              risco: "$$ordem.arvore.risco",
              localizacao: "$$ordem.arvore.localizacao",
              municipio: {
                _id: "$$ordem.arvore.municipio._id",
                nome: "$$ordem.arvore.municipio.nome",
                estado: "$$ordem.arvore.municipio.estado"
              }
            },
            municipio: {
              _id: "$$ordem.municipio._id",
              nome: "$$ordem.municipio.nome",
              estado: "$$ordem.municipio.estado"
            }
          }
        }
      }
    }
  }
]);

// Ocorrências com cidadão, árvore, município e ordens de serviço relacionadas.
db.ocorrencias.aggregate([
  {
    $lookup: {
      from: "cidadaos",
      localField: "cidadaoId",
      foreignField: "_id",
      as: "cidadao"
    }
  },
  { $unwind: { path: "$cidadao", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "arvores",
      localField: "arvoreId",
      foreignField: "_id",
      as: "arvore"
    }
  },
  { $unwind: { path: "$arvore", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "municipios",
      localField: "municipioId",
      foreignField: "_id",
      as: "municipio"
    }
  },
  { $unwind: { path: "$municipio", preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: "ordens_servico",
      localField: "_id",
      foreignField: "ocorrenciaId",
      as: "ordensServico"
    }
  }
]);
