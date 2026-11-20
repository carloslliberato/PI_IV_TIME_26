
package service;

import java.time.Year;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import org.bson.Document;
import org.bson.types.ObjectId;
import model.Conta;
import repository.ContaRepository;
import repository.MunicipioRepository;
import repository.RelatorioRepository;

public class RelatorioService {
    private static final ZoneId FUSO_HORARIO = ZoneId.of("America/Sao_Paulo");
    private static final List<String> STATUS_CONHECIDOS = List.of("Aberta", "Em andamento", "Concluída", "Cancelada");
    private static final List<String> NOMES_MESES = List.of("Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro");

    private final RelatorioRepository relatorioRepository;
    private final ContaRepository contaRepository;
    private final MunicipioRepository municipioRepository;

    public RelatorioService(
            RelatorioRepository relatorioRepository,
            ContaRepository contaRepository) {
        this(relatorioRepository, contaRepository, new MunicipioRepository());
    }

    public RelatorioService(
            RelatorioRepository relatorioRepository,
            ContaRepository contaRepository,
            MunicipioRepository municipioRepository) {
        if (relatorioRepository == null) {
            throw new IllegalArgumentException("O repositório de relatórios não pode ser nulo.");
        }

        if (contaRepository == null) {
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }

        if (municipioRepository == null) {
            throw new IllegalArgumentException("O repositório de municípios não pode ser nulo.");
        }

        this.relatorioRepository = relatorioRepository;
        this.contaRepository = contaRepository;
        this.municipioRepository = municipioRepository;
    }

    public ObjectId obterMunicipioDoFuncionario(String usuarioId) {
        if (usuarioId == null || !ObjectId.isValid(usuarioId)) {
            throw new SecurityException("A sessão não contém um usuário válido.");
        }

        Optional<Conta> resultado = contaRepository.buscarPorId(new ObjectId(usuarioId));

        if (resultado.isEmpty()) {
            throw new SecurityException("Usuário da sessão não encontrado.");
        }

        Conta funcionario = resultado.get();

        if (funcionario.getPerfis() == null || !funcionario.getPerfis().contains("FUNCIONARIO")) {
            throw new SecurityException("Somente funcionários podem consultar relatórios.");
        }

        if (funcionario.getMunicipioId() == null) {
            throw new SecurityException("O funcionário não possui um município vinculado.");
        }

        return funcionario.getMunicipioId();
    }

    public String obterNomeMunicipio(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        return municipioRepository.buscarNomePorId(municipioId)
                .orElseThrow(() -> new IllegalArgumentException("Município não encontrado."));
    }

    public Map<String, Object> consultarOrdensDeServico(ObjectId municipioId, String anoInformado) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        int anoSelecionado = selecionarAno(anoInformado);
        List<Document> ordens = relatorioRepository.listarDadosDasOrdens(municipioId);
        Map<String, Object> relatorio = agruparOrdens(ordens, municipioId, anoSelecionado);

        relatorio.put("municipioNome", obterNomeMunicipio(municipioId));

        return relatorio;
    }

    public Map<String, Object> consultarArvores(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Document dados = relatorioRepository.listarDadosDasArvores(municipioId);

        List<Map<String, Object>> porBairro = converterGrupos(dados, "porBairro");
        List<Map<String, Object>> porEspecie = converterGrupos(dados, "porEspecie");
        List<Map<String, Object>> porRisco = converterGrupos(dados, "porRisco");

        long totalArvores = porBairro.stream()
                .mapToLong(grupo -> ((Number) grupo.get("quantidade")).longValue())
                .sum();

        Map<String, Object> relatorio = new LinkedHashMap<>();
        relatorio.put("municipioId", municipioId.toHexString());
        relatorio.put("municipioNome", obterNomeMunicipio(municipioId));
        relatorio.put("totalArvores", totalArvores);
        relatorio.put("porBairro", porBairro);
        relatorio.put("porEspecie", porEspecie);
        relatorio.put("porRisco", porRisco);

        return relatorio;
    }

    public Map<String, Object> consultarOcorrencias(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Document dados = relatorioRepository.listarDadosDasOcorrencias(municipioId);

        List<Map<String, Object>> porStatus = converterGrupos(dados, "porStatus");
        List<Map<String, Object>> porBairro = converterGrupos(dados, "porBairro");
        List<Map<String, Object>> porUrgencia = converterGrupos(dados, "porUrgencia");

        long totalOcorrencias = porStatus.stream()
                .mapToLong(grupo -> ((Number) grupo.get("quantidade")).longValue())
                .sum();

        Map<String, Object> relatorio = new LinkedHashMap<>();
        relatorio.put("municipioId", municipioId.toHexString());
        relatorio.put("municipioNome", obterNomeMunicipio(municipioId));
        relatorio.put("totalOcorrencias", totalOcorrencias);
        relatorio.put("porStatus", porStatus);
        relatorio.put("porBairro", porBairro);
        relatorio.put("porUrgencia", porUrgencia);

        return relatorio;
    }

    public Map<String, Object> consultarEquipes(ObjectId municipioId) {
        if (municipioId == null) {
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        Document dados = relatorioRepository.listarDadosDasEquipes(municipioId);

        return agruparEquipes(
                dados,
                municipioId,
                Year.now(FUSO_HORARIO).getValue(),
                obterNomeMunicipio(municipioId));
    }

    static Map<String, Object> agruparEquipes(
            Document dados,
            ObjectId municipioId,
            int anoSelecionado,
            String municipioNome) {

        if (dados == null || municipioId == null || municipioNome == null || municipioNome.isBlank()) {
            throw new IllegalArgumentException("Dados de equipes ou município inválidos.");
        }

        List<Document> equipes = dados.getList("equipes", Document.class);
        List<Document> ordens = dados.getList("ordens", Document.class);

        if (equipes == null || ordens == null) {
            throw new IllegalArgumentException("O relatório não contém as listas de equipes e ordens.");
        }

        Map<String, Document> equipesPorId = new LinkedHashMap<>();
        Map<String, Long> ordensPorEquipe = new HashMap<>();
        Map<String, long[]> mesesPorEquipe = new HashMap<>();
        Map<String, Map<Integer, Long>> anosPorEquipe = new HashMap<>();
        Set<String> equipesOcupadas = new HashSet<>();
        Map<Integer, Long> anos = new TreeMap<>();

        long[] meses = new long[12];
        long[] semestres = new long[2];

        long totalOrdensAtribuidas = 0;
        long totalNoAno = 0;
        long ordensSemDataValida = 0;

        for (Document equipe : equipes) {
            if (equipe.get("_id") instanceof ObjectId id) {
                String chave = id.toHexString();

                equipesPorId.put(chave, equipe);
                ordensPorEquipe.put(chave, 0L);
                mesesPorEquipe.put(chave, new long[12]);
                anosPorEquipe.put(chave, new TreeMap<>());
            }
        }

        for (Document ordem : ordens) {
            String equipeId = identificarEquipe(ordem.get("equipeId"));

            if (equipeId == null || !equipesPorId.containsKey(equipeId)) {
                continue;
            }

            totalOrdensAtribuidas++;
            ordensPorEquipe.merge(equipeId, 1L, Long::sum);

            String status = ordem.get("status") instanceof String texto
                    ? texto.trim()
                    : "";

            if ("Aberta".equals(status) || "Em andamento".equals(status)) {
                equipesOcupadas.add(equipeId);
            }

            if (!(ordem.get("dataCriacao") instanceof Date dataCriacao)) {
                ordensSemDataValida++;
                continue;
            }

            ZonedDateTime data = dataCriacao.toInstant().atZone(FUSO_HORARIO);
            int ano = data.getYear();
            int mes = data.getMonthValue();

            anos.merge(ano, 1L, Long::sum);
            anosPorEquipe.get(equipeId).merge(ano, 1L, Long::sum);

            if (ano == anoSelecionado) {
                totalNoAno++;
                meses[mes - 1]++;
                semestres[(mes - 1) / 6]++;
                mesesPorEquipe.get(equipeId)[mes - 1]++;
            }
        }

        Map<String, Long> status = new LinkedHashMap<>();
        status.put("Disponível", 0L);
        status.put("Indisponível", 0L);

        Map<String, Long> regioes = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

        List<Map<String, Object>> opcoesEquipes = new ArrayList<>();
        List<Map<String, Object>> porEquipe = new ArrayList<>();

        Map<String, List<Map<String, Object>>> porMesPorEquipe = new LinkedHashMap<>();
        Map<String, List<Map<String, Object>>> porSemestrePorEquipe = new LinkedHashMap<>();
        Map<String, List<Map<String, Object>>> porAnoPorEquipe = new LinkedHashMap<>();

        for (Map.Entry<String, Document> entrada : equipesPorId.entrySet()) {
            String id = entrada.getKey();
            Document equipe = entrada.getValue();

            String nome = textoOuPadrao(
                    equipe.get("nome"),
                    textoOuPadrao(equipe.get("nomeEquipe"), "Equipe " + id));

            String codigo = textoOuPadrao(equipe.get("codigo"), "");

            String regiao = textoOuPadrao(
                    equipe.get("regiao"),
                    textoOuPadrao(equipe.get("regiaoAtuacao"), "Não informado"));

            String situacao = equipesOcupadas.contains(id)
                    ? "Indisponível"
                    : "Disponível";

            String rotulo = codigo.isEmpty()
                    ? nome
                    : codigo + " - " + nome;

            status.merge(situacao, 1L, Long::sum);
            regioes.merge(regiao, 1L, Long::sum);

            Map<String, Object> opcao = new LinkedHashMap<>();
            opcao.put("id", id);
            opcao.put("codigo", codigo);
            opcao.put("nome", nome);
            opcao.put("regiao", regiao);
            opcao.put("status", situacao);

            opcoesEquipes.add(opcao);
            porEquipe.add(criarGrupo(rotulo, ordensPorEquipe.get(id)));

            long[] contagemMeses = mesesPorEquipe.get(id);

            porMesPorEquipe.put(id, criarMeses(contagemMeses));

            porSemestrePorEquipe.put(id, List.of(
                    criarGrupo("1º semestre", somarMeses(contagemMeses, 0, 6)),
                    criarGrupo("2º semestre", somarMeses(contagemMeses, 6, 12))));

            porAnoPorEquipe.put(id, criarAnos(anosPorEquipe.get(id)));
        }

        opcoesEquipes.sort(
                (a, b) -> ((String) a.get("nome"))
                        .compareToIgnoreCase((String) b.get("nome")));

        porEquipe.sort(
                (a, b) -> Long.compare(
                        ((Number) b.get("quantidade")).longValue(),
                        ((Number) a.get("quantidade")).longValue()));

        Map<String, Object> relatorio = new LinkedHashMap<>();
        relatorio.put("municipioId", municipioId.toHexString());
        relatorio.put("municipioNome", municipioNome);
        relatorio.put("anoSelecionado", anoSelecionado);
        relatorio.put("fusoHorario", FUSO_HORARIO.getId());
        relatorio.put("totalEquipes", (long) equipesPorId.size());
        relatorio.put("totalOrdensAtribuidas", totalOrdensAtribuidas);
        relatorio.put("totalNoAno", totalNoAno);
        relatorio.put("ordensSemDataValida", ordensSemDataValida);
        relatorio.put("equipes", opcoesEquipes);
        relatorio.put("porStatus", converterContagens(status));
        relatorio.put("porRegiao", converterContagens(regioes));
        relatorio.put("porEquipe", porEquipe);
        relatorio.put("porMes", criarMeses(meses));
        relatorio.put("porSemestre", List.of(
                criarGrupo("1º semestre", semestres[0]),
                criarGrupo("2º semestre", semestres[1])));
        relatorio.put("porAno", criarAnos(anos));
        relatorio.put("porMesPorEquipe", porMesPorEquipe);
        relatorio.put("porSemestrePorEquipe", porSemestrePorEquipe);
        relatorio.put("porAnoPorEquipe", porAnoPorEquipe);

        return relatorio;
    }

    private static String identificarEquipe(Object valor) {
        if (valor instanceof ObjectId id) {
            return id.toHexString();
        }

        if (valor instanceof String texto && ObjectId.isValid(texto)) {
            return texto.toLowerCase(java.util.Locale.ROOT);
        }

        return null;
    }

    private static String textoOuPadrao(Object valor, String padrao) {
        return valor instanceof String texto && !texto.isBlank()
                ? texto.trim()
                : padrao;
    }

    private static List<Map<String, Object>> converterContagens(
            Map<String, Long> contagens) {

        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Map.Entry<String, Long> entrada : contagens.entrySet()) {
            resultado.add(criarGrupo(entrada.getKey(), entrada.getValue()));
        }

        return resultado;
    }

    private static List<Map<String, Object>> criarMeses(long[] contagens) {
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (int indice = 0; indice < NOMES_MESES.size(); indice++) {
            resultado.add(criarGrupo(NOMES_MESES.get(indice), contagens[indice]));
        }

        return resultado;
    }

    private static List<Map<String, Object>> criarAnos(
            Map<Integer, Long> contagens) {

        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Map.Entry<Integer, Long> entrada : contagens.entrySet()) {
            resultado.add(criarGrupo(
                    Integer.toString(entrada.getKey()),
                    entrada.getValue()));
        }

        return resultado;
    }

    private static long somarMeses(
            long[] contagens,
            int inicio,
            int fim) {

        long total = 0;

        for (int indice = inicio; indice < fim; indice++) {
            total += contagens[indice];
        }

        return total;
    }

    private static List<Map<String, Object>> converterGrupos(
            Document dados,
            String campo) {

        List<Map<String, Object>> grupos = new ArrayList<>();

        if (dados == null) {
            return grupos;
        }

        List<Document> documentos = dados.getList(campo, Document.class);

        if (documentos == null) {
            return grupos;
        }

        for (Document documento : documentos) {
            Object valorGrupo = documento.get("grupo");
            Object valorQuantidade = documento.get("quantidade");

            String grupo = valorGrupo instanceof String texto
                    ? texto
                    : "Não informado";

            long quantidade = valorQuantidade instanceof Number numero
                    ? numero.longValue()
                    : 0L;

            grupos.add(criarGrupo(grupo, quantidade));
        }

        return grupos;
    }

    static int selecionarAno(String anoInformado) {
        if (anoInformado == null) {
            return Year.now(FUSO_HORARIO).getValue();
        }

        if (!anoInformado.matches("[0-9]{1,4}")) {
            throw new IllegalArgumentException("Informe um ano entre 1 e 9999.");
        }

        int ano = Integer.parseInt(anoInformado);

        if (ano < 1 || ano > 9999) {
            throw new IllegalArgumentException("Informe um ano entre 1 e 9999.");
        }

        return ano;
    }

    static Map<String, Object> agruparOrdens(
            List<Document> ordens,
            ObjectId municipioId,
            int anoSelecionado) {

        Map<String, Long> contagemStatus = new LinkedHashMap<>();
        Map<Integer, Long> contagemAnos = new TreeMap<>();

        long[] contagemMeses = new long[12];
        long[] contagemSemestres = new long[2];

        long totalNoAno = 0;
        long ordensSemDataValida = 0;

        for (String status : STATUS_CONHECIDOS) {
            contagemStatus.put(status, 0L);
        }

        for (Document ordem : ordens) {
            Object valorStatus = ordem.get("status");

            String status = valorStatus instanceof String texto
                    ? texto.strip()
                    : "";

            if (status.isBlank()) {
                status = "Não informado";
            }

            contagemStatus.merge(status, 1L, Long::sum);

            Object valorData = ordem.get("dataCriacao");

            if (!(valorData instanceof Date dataCriacao)) {
                ordensSemDataValida++;
                continue;
            }

            ZonedDateTime dataLocal = dataCriacao.toInstant().atZone(FUSO_HORARIO);
            int ano = dataLocal.getYear();
            int mes = dataLocal.getMonthValue();

            contagemAnos.merge(ano, 1L, Long::sum);

            if (ano == anoSelecionado) {
                totalNoAno++;
                contagemMeses[mes - 1]++;
                contagemSemestres[(mes - 1) / 6]++;
            }
        }

        List<Map<String, Object>> porStatus = new ArrayList<>();

        for (Map.Entry<String, Long> entrada : contagemStatus.entrySet()) {
            porStatus.add(criarGrupo(
                    entrada.getKey(),
                    entrada.getValue()));
        }

        List<Map<String, Object>> porAno = new ArrayList<>();

        for (Map.Entry<Integer, Long> entrada : contagemAnos.entrySet()) {
            porAno.add(criarGrupo(
                    Integer.toString(entrada.getKey()),
                    entrada.getValue()));
        }

        List<Map<String, Object>> porMes = new ArrayList<>();

        for (int indice = 0; indice < NOMES_MESES.size(); indice++) {
            porMes.add(criarGrupo(
                    NOMES_MESES.get(indice),
                    contagemMeses[indice]));
        }

        List<Map<String, Object>> porSemestre = List.of(
                criarGrupo("1º semestre", contagemSemestres[0]),
                criarGrupo("2º semestre", contagemSemestres[1])
        );

        Map<String, Object> relatorio = new LinkedHashMap<>();
        relatorio.put("municipioId", municipioId.toHexString());
        relatorio.put("anoSelecionado", anoSelecionado);
        relatorio.put("fusoHorario", FUSO_HORARIO.getId());
        relatorio.put("totalOrdens", (long) ordens.size());
        relatorio.put("totalNoAno", totalNoAno);
        relatorio.put("ordensSemDataValida", ordensSemDataValida);
        relatorio.put("porStatus", porStatus);
        relatorio.put("porAno", porAno);
        relatorio.put("porMes", porMes);
        relatorio.put("porSemestre", porSemestre);

        return relatorio;
    }

    private static Map<String, Object> criarGrupo(
            String grupo,
            long quantidade) {

        return Map.of(
                "grupo", grupo,
                "quantidade", quantidade);
    }
}
