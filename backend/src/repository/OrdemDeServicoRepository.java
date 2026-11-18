package repository;
import model.OrdemDeServico;
import org.bson.Document;
import java.time.Instant;
import java.util.Date;
import org.bson.types.ObjectId;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.UpdateResult;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.ne;

public class OrdemDeServicoRepository {
    private final MongoCollection<Document> colecao;

    public OrdemDeServicoRepository() {
        MongoDatabase banco = ConexaoMongo.getDatabase();
        this.colecao = banco.getCollection("ordens_servico");
    }

    // Insere uma nova ordem de servico no banco.
    public void salvar(OrdemDeServico ordem){
        if (ordem == null){
            throw new IllegalArgumentException("A ordem de serviço não pode ser nula.");
        }

        if (ordem.getOrdemServicoId() == null){
            throw new IllegalArgumentException("A ordem de serviço precisa possuir um identificador.");
        }

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

        Document documento = converterParaDocumento(ordem);

        // Campos que nao devem ser alterados em uma atualização (por isso foram removidos).
        documento.remove("_id");
        documento.remove("dataCriacao");

        UpdateResult resultado = colecao.updateOne(
            and(eq("_id", ordem.getOrdemServicoId()), ne("status", "Concluída")), new Document("$set", documento));
        
        if (resultado.getMatchedCount() == 0){
            throw new IllegalStateException("Não foi possível atualizar: ordem de serviço não encontrada ou já concluída.");
        }

    }


    // Prepara os dados de uma ordem de servico para o MongoDB.
    private Document converterParaDocumento(OrdemDeServico ordem) {
        Document documento = new Document();

        documento.append("_id", ordem.getOrdemServicoId());
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
            instanteConclusao);
    }

}