package repository;
import model.OrdemDeServico;
import model.Intervencao;
import model.ConclusaoOrdemDeServico;
import org.bson.Document;
import java.time.Instant;
import java.util.Date;
import org.bson.types.ObjectId;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.function.Supplier;
import com.mongodb.ReadConcern;
import com.mongodb.ReadPreference;
import com.mongodb.TransactionOptions;
import com.mongodb.WriteConcern;
import com.mongodb.client.ClientSession;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.ReturnDocument;
import static com.mongodb.client.model.Indexes.ascending;
import static com.mongodb.client.model.Updates.inc;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.nin;
import static com.mongodb.client.model.Filters.in;

public class OrdemDeServicoRepository {
    private final MongoCollection<Document> colecao;
    private final MongoCollection<Document> sequencias;
    private final IntervencaoRepository intervencaoRepository;
    private final Supplier<ClientSession> abrirSessao;

    public OrdemDeServicoRepository(){
        this(ConexaoMongo.getDatabase(), ConexaoMongo::abrirSessao);
    }

    // O banco e a sessão devem pertencer ao mesmo MongoClient.
    // A injeção permite testes reais em um banco exclusivo, sem usar a conexão da aplicação.
    public OrdemDeServicoRepository(MongoDatabase banco, Supplier<ClientSession> abrirSessao){
        Objects.requireNonNull(banco, "O banco de OS não pode ser nulo.");
        this.abrirSessao = Objects.requireNonNull(abrirSessao, "A abertura de sessão não pode ser nula.");

        this.colecao = banco.getCollection("ordens_servico");
        this.sequencias = banco.getCollection("sequencias_ordens_servico");
        this.intervencaoRepository = new IntervencaoRepository(banco);

        // Garante a existência de apenas um contador para cada ano.
        this.sequencias.createIndex(ascending("ano"), new IndexOptions().unique(true));
    }

    // Reserva e retorna o próximo número da sequência de OS do ano informado.
    public long gerarProximoNumero(int ano){
        if (ano <= 0){
            throw new IllegalArgumentException("O ano deve ser válido.");
        }

        Document contador = sequencias.findOneAndUpdate(
                eq("ano", ano),
                inc("sequencia", 1L),
                new FindOneAndUpdateOptions().upsert(true).returnDocument(ReturnDocument.AFTER));

        if (contador == null){
            throw new IllegalStateException("Não foi possível gerar o número sequencial da OS.");
        }

        return contador.getLong("sequencia");
    }

    // Insere uma nova ordem de servico no banco.
    public void salvar(OrdemDeServico ordem){
        if (ordem == null){
            throw new IllegalArgumentException("A ordem de serviço não pode ser nula.");
        }

        if (ordem.getOrdemServicoId() == null){
            throw new IllegalArgumentException("A ordem de serviço precisa possuir um identificador.");
        }

        rejeitarConclusaoForaDaTransacao(ordem);

        Document documento = converterParaDocumento(ordem);
        colecao.insertOne(documento);
    }

    // Busca uma ordem de servico pelo identificador.
    public Optional<OrdemDeServico> buscarPorId(ObjectId id){
        if (id == null) {
            throw new IllegalArgumentException("O identificador da ordem de serviço não pode ser nulo.");
        }

        Document documento = colecao.find(eq("_id", id)).first();

        if (documento == null) return Optional.empty();

        return Optional.of(converterParaOrdemDeServico(documento));
    }

    // Lista as ordens de servico de um municipio.
    public List<OrdemDeServico> listarPorMunicipio(ObjectId municipioId){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        List<OrdemDeServico> ordens = new ArrayList<>();

        try (MongoCursor<Document> cursor = colecao.find(eq("municipioId", municipioId)).iterator()) {
                while (cursor.hasNext()){
                    Document documento = cursor.next();
                    OrdemDeServico ordem = converterParaOrdemDeServico(documento);
                    ordens.add(ordem);
                }
            }

        return ordens;
    }

    public void atualizar(OrdemDeServico ordem){
        if (ordem == null){
            throw new IllegalArgumentException("A ordem de serviço não pode ser nula.");
        }

        if (ordem.getOrdemServicoId() == null){
            throw new IllegalArgumentException("A ordem de serviço precisa possuir um identificador.");
        }

        rejeitarConclusaoForaDaTransacao(ordem);

        Document documento = converterParaDocumento(ordem);

        // Campos que devem ser preservados no banco durante uma atualização.
        documento.remove("_id");
        documento.remove("dataCriacao");
        documento.remove("codigo");
        documento.remove("intervencaoConclusaoId");

        UpdateResult resultado = colecao.updateOne(
                and(eq("_id", ordem.getOrdemServicoId()),nin("status", "Concluída", "Cancelada")),
                new Document("$set", documento));

        if (resultado.getMatchedCount() == 0){
            throw new IllegalStateException("Não foi possível atualizar: ordem de serviço não encontrada, concluída ou cancelada.");
        }

    }

    // Conclui a OS e registra a execução como uma única unidade de persistência.
    // O callback pode ser repetido pelo driver: não produz efeitos fora da transação.
    public ConclusaoOrdemDeServico concluirComIntervencao(
            ObjectId id, ObjectId municipioId, ObjectId usuarioId,
            String tipo, String descricao, List<String> fotos,
            Instant dataExecucao, Instant dataConclusao){
        if (id == null || municipioId == null || usuarioId == null){
            throw new IllegalArgumentException("Os identificadores da conclusão são obrigatórios.");
        }
        Objects.requireNonNull(dataExecucao, "A data de execução é obrigatória.");
        Objects.requireNonNull(dataConclusao, "A data de conclusão é obrigatória.");

        ObjectId intervencaoId = new ObjectId();
        TransactionOptions opcoes = TransactionOptions.builder()
                .readConcern(ReadConcern.SNAPSHOT)
                .writeConcern(WriteConcern.MAJORITY)
                .readPreference(ReadPreference.primary())
                .build();

        try (ClientSession sessao = Objects.requireNonNull(abrirSessao.get())){
            return sessao.withTransaction(() -> {
                Document documento = colecao.find(sessao, and(
                        eq("_id", id), eq("municipioId", municipioId))).first();
                if (documento == null){
                    throw new NoSuchElementException("OS não encontrada nesse município.");
                }

                OrdemDeServico ordem = converterParaOrdemDeServico(documento);
                if (!"Aberta".equals(ordem.getStatus()) && !"Em andamento".equals(ordem.getStatus())){
                    throw new IllegalStateException("Somente ordens abertas ou em andamento podem ser concluídas.");
                }

                Intervencao intervencao = new Intervencao(
                        intervencaoId, ordem.getMunicipioId(), ordem.getArvoreId(),
                        ordem.getOrdemServicoId(), ordem.getEquipeId(), usuarioId,
                        tipo, descricao, fotos, dataExecucao, dataConclusao);

                Document camposFinais = new Document("status", "Concluída")
                        .append("dataConclusao", Date.from(dataConclusao))
                        .append("dataAtualizacao", Date.from(dataConclusao))
                        .append("intervencaoConclusaoId", intervencaoId);
                UpdateResult resultado = colecao.updateOne(sessao,
                        and(eq("_id", id), eq("municipioId", municipioId),
                                in("status", "Aberta", "Em andamento")),
                        new Document("$set", camposFinais));
                if (resultado.getMatchedCount() != 1){
                    throw new IllegalStateException("A OS foi alterada. Consulte seus dados antes de concluir.");
                }

                intervencaoRepository.salvar(sessao, intervencao);

                // Lê o que foi persistido, incluindo a precisão de milissegundos das datas BSON.
                Document documentoAtualizado = colecao.find(sessao, and(
                        eq("_id", id), eq("municipioId", municipioId))).first();
                if (documentoAtualizado == null){
                    throw new RuntimeException("Não foi possível confirmar a OS na transação.");
                }
                Intervencao registro = intervencaoRepository.buscarConclusao(
                        sessao, intervencaoId, id, municipioId)
                        .orElseThrow(() -> new RuntimeException("Não foi possível confirmar a intervenção na transação."));

                return new ConclusaoOrdemDeServico(converterParaOrdemDeServico(documentoAtualizado), registro);
            }, opcoes);
        }
    }

    public Optional<Intervencao> buscarIntervencaoConclusao(OrdemDeServico ordem){
        Objects.requireNonNull(ordem, "A OS não pode ser nula.");
        if (ordem.getIntervencaoConclusaoId() == null){
            return Optional.empty();
        }
        return intervencaoRepository.buscarConclusao(ordem.getIntervencaoConclusaoId(),
                ordem.getOrdemServicoId(), ordem.getMunicipioId());
    }

    // Impede usar a gravação genérica para concluir sem a intervenção correspondente.
    private void rejeitarConclusaoForaDaTransacao(OrdemDeServico ordem){
        if ("Concluída".equals(ordem.getStatus())){
            throw new IllegalStateException("A conclusão deve ser registrada junto com a intervenção.");
        }
    }

    // Prepara os dados de uma ordem de servico para o MongoDB.
    private Document converterParaDocumento(OrdemDeServico ordem) {
        Document documento = new Document();

        documento.append("_id", ordem.getOrdemServicoId());
        documento.append("codigo", ordem.getCodigo());
        documento.append("intervencaoConclusaoId", ordem.getIntervencaoConclusaoId());
        documento.append("municipioId", ordem.getMunicipioId());
        documento.append("arvoreId", ordem.getArvoreId());
        documento.append("ocorrenciaId", ordem.getOcorrenciaId());
        documento.append("equipeId", ordem.getEquipeId());
        documento.append("titulo", ordem.getTitulo());
        documento.append("descricao", ordem.getDescricao());
        documento.append("status", ordem.getStatus());
        documento.append("prioridade", ordem.getPrioridade());
        documento.append("observacoes", ordem.getObservacoes());

        if (ordem.getDataCriacao() != null) {
            documento.append("dataCriacao", Date.from(ordem.getDataCriacao()));
        }

        if (ordem.getDataAtualizacao() != null) {
            documento.append("dataAtualizacao", Date.from(ordem.getDataAtualizacao()));
        }

        if (ordem.getDataConclusao() != null) {
            documento.append("dataConclusao", Date.from(ordem.getDataConclusao()));
        }
        return documento;
    }

    // Reconstroi o objeto Java usando os dados de um documento.
    private OrdemDeServico converterParaOrdemDeServico(Document documento) {
        Date dataCriacao = documento.getDate("dataCriacao");
        Date dataAtualizacao = documento.getDate("dataAtualizacao");
        Date dataConclusao = documento.getDate("dataConclusao");

        Instant instanteCriacao = dataCriacao == null ? null : dataCriacao.toInstant();
        Instant instanteAtualizacao = dataAtualizacao == null ? null : dataAtualizacao.toInstant();
        Instant instanteConclusao = dataConclusao == null ? null : dataConclusao.toInstant();

        return new OrdemDeServico(
            documento.getObjectId("_id"),
            documento.getObjectId("municipioId"),
            documento.getObjectId("arvoreId"),
            documento.getObjectId("ocorrenciaId"),
            documento.getObjectId("equipeId"),
            documento.getString("titulo"),
            documento.getString("descricao"),
            documento.getString("status"),
            documento.getString("prioridade"),
            documento.getString("observacoes"),
            instanteCriacao,
            instanteAtualizacao,
            instanteConclusao,
            documento.getString("codigo"),
            documento.getObjectId("intervencaoConclusaoId"));
    }

}
