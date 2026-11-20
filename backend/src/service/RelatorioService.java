package service;

import java.time.Year;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import org.bson.Document;
import org.bson.types.ObjectId;
import model.Conta;
import repository.ContaRepository;
import repository.RelatorioRepository;

public class RelatorioService{
    private static final ZoneId FUSO_HORARIO = ZoneId.of("America/Sao_Paulo");
    private static final List<String> STATUS_CONHECIDOS = List.of("Aberta", "Em andamento", "Concluída", "Cancelada");
    private static final List<String> NOMES_MESES = List.of("Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro");

    private final RelatorioRepository relatorioRepository;
    private final ContaRepository contaRepository;

    // Recebe os repositórios utilizados na autorização e na consulta do relatório.
    public RelatorioService(
            RelatorioRepository relatorioRepository,
            ContaRepository contaRepository){
        if (relatorioRepository == null){
            throw new IllegalArgumentException("O repositório de relatórios não pode ser nulo.");
        }

        if (contaRepository == null){
            throw new IllegalArgumentException("O repositório de contas não pode ser nulo.");
        }

        this.relatorioRepository = relatorioRepository;
        this.contaRepository = contaRepository;
    }

    // Obtém o município da conta atual do funcionário identificado pela sessão.
    public ObjectId obterMunicipioDoFuncionario(String usuarioId){
        if (usuarioId == null || !ObjectId.isValid(usuarioId)){
            throw new SecurityException("A sessão não contém um usuário válido.");
        }

        Optional<Conta> resultado = contaRepository.buscarPorId(new ObjectId(usuarioId));

        if (resultado.isEmpty()){
            throw new SecurityException("Usuário da sessão não encontrado.");
        }

        Conta funcionario = resultado.get();

        if (funcionario.getPerfis() == null || !funcionario.getPerfis().contains("FUNCIONARIO")){
            throw new SecurityException("Somente funcionários podem consultar relatórios.");
        }

        if (funcionario.getMunicipioId() == null){
            throw new SecurityException("O funcionário não possui um município vinculado.");
        }

        return funcionario.getMunicipioId();
    }

    // Consulta somente o município autorizado e monta o relatório de suas ordens.
    public Map<String, Object> consultarOrdensDeServico(ObjectId municipioId, String anoInformado){
        if (municipioId == null){
            throw new IllegalArgumentException("O identificador do município não pode ser nulo.");
        }

        int anoSelecionado = selecionarAno(anoInformado);
        List<Document> ordens = relatorioRepository.listarDadosDasOrdens(municipioId);

        return agruparOrdens(ordens, municipioId, anoSelecionado);
    }

    // Usa o ano atual no fuso do sistema quando o parâmetro não foi informado.
    static int selecionarAno(String anoInformado){
        if (anoInformado == null) {
            return Year.now(FUSO_HORARIO).getValue();
        }

        if (!anoInformado.matches("[0-9]{1,4}")){
            throw new IllegalArgumentException("Informe um ano entre 1 e 9999.");
        }

        int ano = Integer.parseInt(anoInformado);

        if (ano < 1 || ano > 9999){
            throw new IllegalArgumentException("Informe um ano entre 1 e 9999.");
        }

        return ano;
    }

    // Agrupa os dados já filtrados pelo repositório; este cálculo não acessa o banco.
    static Map<String, Object> agruparOrdens(
            List<Document> ordens, ObjectId municipioId, int anoSelecionado){
        Map<String, Long> contagemStatus = new LinkedHashMap<>();
        Map<Integer, Long> contagemAnos = new TreeMap<>();
        long[] contagemMeses = new long[12];
        long[] contagemSemestres = new long[2];
        long totalNoAno = 0;
        long ordensSemDataValida = 0;

        for (String status : STATUS_CONHECIDOS){
            contagemStatus.put(status, 0L);
        }

        for (Document ordem : ordens){
            // Toda ordem participa da contagem por status, mesmo com dados incompletos.
            Object valorStatus = ordem.get("status");
            String status = valorStatus instanceof String texto ? texto.strip() : "";

            if (status.isBlank()){
                status = "Não informado";
            }

            contagemStatus.merge(status, 1L, Long::sum);

            // Datas ausentes ou fora do tipo BSON Date não entram nas séries temporais.
            Object valorData = ordem.get("dataCriacao");

            if (!(valorData instanceof Date dataCriacao)){
                ordensSemDataValida++;
                continue;
            }

            ZonedDateTime dataLocal = dataCriacao.toInstant().atZone(FUSO_HORARIO);
            int ano = dataLocal.getYear();
            int mes = dataLocal.getMonthValue();

            contagemAnos.merge(ano, 1L, Long::sum);

            if (ano == anoSelecionado){
                totalNoAno++;
                contagemMeses[mes - 1]++;
                contagemSemestres[(mes - 1) / 6]++;
            }
        }

        List<Map<String, Object>> porStatus = new ArrayList<>();
        for (Map.Entry<String, Long> entrada : contagemStatus.entrySet()){
            porStatus.add(criarGrupo(entrada.getKey(), entrada.getValue()));
        }

        List<Map<String, Object>> porAno = new ArrayList<>();
        for (Map.Entry<Integer, Long> entrada : contagemAnos.entrySet()){
            porAno.add(criarGrupo(Integer.toString(entrada.getKey()), entrada.getValue()));
        }

        List<Map<String, Object>> porMes = new ArrayList<>();
        for (int indice = 0; indice < NOMES_MESES.size(); indice++){
            porMes.add(criarGrupo(NOMES_MESES.get(indice), contagemMeses[indice]));
        }

        List<Map<String, Object>> porSemestre = List.of(criarGrupo("1º semestre", contagemSemestres[0]),
                criarGrupo("2º semestre", contagemSemestres[1]));

        // Os totais por status e ano representam todo o histórico do município.
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

    // Mantém o mesmo formato de linha para gráfico, tabela e exportação.
    private static Map<String, Object> criarGrupo(String grupo, long quantidade){
        return Map.of("grupo", grupo, "quantidade", quantidade);
    }
}
