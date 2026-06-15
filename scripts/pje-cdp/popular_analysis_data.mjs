/**
 * Grava processos.analysis_data (formato-app + dossie v2) a partir dos
 * registros gerados pelo preparar-audiencias (registros/registro-<aud>.json).
 * Também seta analysis_status='completed' e analyzed_at=NOW().
 *
 * Uso: node scripts/pje-cdp/popular_analysis_data.mjs /tmp/registros-2026-06-11.json
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), {
  prepare: false, connect_timeout: 20, ssl: "require",
});
const items = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const hoje = new Date().toISOString().slice(0, 10);

function flatPerguntas(pe) {
  const out = [];
  for (const [alvo, qs] of Object.entries(pe ?? {})) {
    for (const q of qs ?? []) out.push(`[${alvo.replace(/_/g, " ")}] ${q}`);
  }
  return out;
}
function flatProvidencias(pv) {
  const out = [];
  for (const [fase, its] of Object.entries(pv ?? {})) {
    for (const it of its ?? []) out.push(`[${fase.replace(/_/g, " ")}] ${it}`);
  }
  return out;
}

let ok = 0;
for (const item of items) {
  const p = item.analise_cowork?.payload ?? {};
  const ra = item.registro_audiencia ?? {};
  const deps = p.depoentes ?? ra.depoentes ?? [];
  const interrogando = deps.find(d => d.tipo === "interrogando") ?? null;
  const ofendida = deps.find(d => d.tipo === "ofendida") ?? null;
  const relatoAssistido = p.relato_assistido ?? ra.relato_assistido ?? null;
  const intimResumo = deps.map(d =>
    `${d.nome} (${(d.tipo ?? "").replace(/_/g, " ")}): ${(d.intimacao ?? "desconhecido")}${d.observacao ? " — " + d.observacao : ""}`).join(" · ");

  const teses = (p.teses ?? []).map(t => ({
    nome: t.nome, nivel: t.viabilidade ?? "", fundamento: t.fundamento ?? "",
  }));

  const analysisData = {
    fonte: "preparar-audiencias-cdp-v2",
    schema_version: "2.0",
    gerado_em: hoje,
    imputacao: p.imputacao?.principal ?? ra.imputacao?.principal ?? null,
    resumo_executivo: (p.resumo_executivo ?? []).join("\n\n") || null,
    narrativa_denuncia: (p.resumo_executivo ?? [])[0] ?? null,
    // Trecho literal "DOS FATOS" da denúncia (régua de adstrição/correlação na instrução)
    narrativa_denuncia_literal: p.narrativa_denuncia_literal ?? ra.narrativa_denuncia_literal ?? null,
    teses_defesa: (p.teses ?? []).map(t => `${t.nome} — ${t.viabilidade ?? ""}${t.fundamento ? " · " + t.fundamento : ""}`),
    vulnerabilidades_acusacao: p.pontos_criticos ?? ra.pontos_criticos ?? [],
    pendencias: p.pendencias ?? ra.pendencias ?? [],
    perguntas_estrategicas: p.perguntas_estrategicas ?? ra.perguntas_estrategicas ?? {},
    testemunhas_acusacao: deps.filter(d => ["ofendida", "testemunha_acusacao", "informante"].includes(d.tipo)).map(d => ({
      nome: d.nome, vinculo: d.tipo, intimacao: d.intimacao, observacao: d.observacao ?? "",
      versaoDelegacia: d.depoimento_ip ?? null, versaoJuizo: d.depoimento_juizo ?? (d.ja_ouvido?.resumo_breve ?? null),
      perguntasSugeridas: (p.perguntas_estrategicas?.[d.tipo] ?? p.perguntas_estrategicas?.ofendida ?? []).join("\n") || null,
    })),
    testemunhas_defesa: deps.filter(d => d.tipo === "testemunha_defesa").map(d => ({
      nome: d.nome, vinculo: d.tipo, intimacao: d.intimacao, observacao: d.observacao ?? "",
      versaoDelegacia: d.depoimento_ip ?? null, versaoJuizo: d.depoimento_juizo ?? (d.ja_ouvido?.resumo_breve ?? null),
    })),
    orientacao_assistido: p.orientacao_assistido ?? ra.orientacao_assistido ?? null,
    medidas_protetivas_vigentes: p.medidas_mpu ?? [],
    // Medidas estruturadas (parse art. 22) quando o dossiê as forneceu
    medidas_protetivas: p.medidas_protetivas ?? ra.medidas_protetivas ?? null,
    // Justificação (MPU): por que a audiência foi designada + relato da ofendida/representação
    motivo_designacao: p.motivo_designacao ?? ra.motivo_designacao ?? null,
    relato_vitima: p.relato_vitima ?? ra.relato_vitima ?? (ofendida?.depoimento_ip ?? null),
    // Relato do assistido: atendimento (DPE) × interrogatório policial × judicial
    relato_assistido: relatoAssistido ?? (interrogando ? {
      atendimento: null,
      interrogatorio_policial: interrogando.depoimento_ip ?? null,
      interrogatorio_judicial: interrogando.depoimento_juizo ?? null,
    } : null),
    // Alimenta a seção "Relato do assistido" (reusa o slot versao_delegacia/juizo existente)
    versao_delegacia: relatoAssistido?.interrogatorio_policial ?? interrogando?.depoimento_ip ?? null,
    versao_juizo: relatoAssistido?.interrogatorio_judicial ?? interrogando?.depoimento_juizo ?? null,
    // Síntese processual (ato + data) p/ aferir adstrição/correlação na instrução
    cronologia: (p.cronologia ?? []).map(e => ({
      data: e.data ?? null, evento: e.evento ?? "", marcador: e.marcador ?? "⚪",
    })),
    // Depoentes ricos (intimação/motivo/comparecimento/já ouvido) — alimenta painel de status
    depoentes_detalhe: deps.map(d => ({
      nome: d.nome, tipo: d.tipo, intimacao: d.intimacao ?? "desconhecido",
      motivo_nao_intimacao: d.motivo_nao_intimacao ?? null,
      comparecimento: d.comparecimento ?? "nao_verificado",
      ja_ouvido: d.ja_ouvido ?? null, forma: d.forma ?? null, observacao: d.observacao ?? "",
      depoimento_ip: d.depoimento_ip ?? null, depoimento_juizo: d.depoimento_juizo ?? null,
    })),
    documentos_relevantes: p.documentos_relevantes ?? ra.documentos_relevantes ?? [],
    dossie: {
      ato: `${p.audiencia?.tipo ?? ""} ${p.audiencia?.horario ?? ""} — 11/06/2026`.trim(),
      gerado_em: hoje,
      resumo: p.resumo_executivo ?? [],
      teses,
      fragilidades: p.pontos_criticos ?? [],
      perguntas: flatPerguntas(p.perguntas_estrategicas),
      providencias: flatProvidencias(p.providencias),
      versao_defendido: p.narrativa ?? null,
      intimacao: intimResumo || null,
      fonte: "preparar-audiencias-cdp-v2",
      versao: "2.0",
    },
  };

  const r = await sql`
    UPDATE processos
    SET analysis_data = ${analysisData},
        analysis_status = 'completed',
        analysis_version = 2,
        analyzed_at = NOW(),
        updated_at = NOW()
    WHERE id = ${item.processo_id}
    RETURNING id`;
  if (r.length) { console.log(`proc #${item.processo_id} (aud ${item.audiencia_id}) ✓`); ok++; }
  else console.warn(`proc #${item.processo_id} NÃO ENCONTRADO`);

  // Cautelares estruturadas (prisão / diversas da prisão) → tabela cautelares_decisao.
  // Idempotente: substitui apenas as linhas origem='claude' deste processo
  // (preserva parser/manual). O painel "Cautelares" da audiência lê esta tabela.
  const cautelares = p.cautelares ?? ra.cautelares ?? [];
  if (Array.isArray(cautelares) && cautelares.length && r.length) {
    await sql`DELETE FROM cautelares_decisao WHERE processo_id = ${item.processo_id} AND origem = 'claude'`;
    for (const c of cautelares) {
      if (!c?.codigo || !c?.especie) continue;
      const params = {};
      if (c.periodicidade) params.periodicidade = c.periodicidade;
      if (c.valorFianca) params.valorFianca = c.valorFianca;
      if (c.horario) params.horario = c.horario;
      if (typeof c.distanciaMetros === "number") params.distanciaMetros = c.distanciaMetros;
      if (Array.isArray(c.pessoas) && c.pessoas.length) params.pessoas = c.pessoas;
      if (Array.isArray(c.lugares) && c.lugares.length) params.lugares = c.lugares;
      const dataDec = /^\d{4}-\d{2}-\d{2}$/.test(c.data ?? "") ? c.data : null;
      await sql`
        INSERT INTO cautelares_decisao
          (processo_id, codigo, especie, artigo, parametros, literal, data_decisao, status, origem)
        VALUES (${item.processo_id}, ${c.codigo}, ${c.especie}, ${c.artigo ?? null},
          ${Object.keys(params).length ? params : null}, ${c.literal ?? null}, ${dataDec},
          ${c.status ?? "ativa"}, 'claude')`;
    }
    console.log(`  ↳ ${cautelares.length} cautelar(es) → cautelares_decisao`);
  }

  // Prisão preventiva — stack dedicada (requisitos art.312 + fundamentos verbatim,
  // custódia, saúde, visitas, excesso de prazo). Idempotente por origem='claude'.
  const pv = p.prisao_preventiva ?? ra.prisao_preventiva ?? null;
  if (pv && typeof pv === "object" && r.length) {
    await sql`DELETE FROM prisao_preventiva WHERE processo_id = ${item.processo_id} AND origem = 'claude'`;
    const dataDec = /^\d{4}-\d{2}-\d{2}$/.test(pv.data_decreto ?? "") ? pv.data_decreto : null;
    await sql`
      INSERT INTO prisao_preventiva
        (processo_id, orgao_decisor, data_decreto, requisitos, pressupostos, contemporaneidade,
         local_custodia, historico_custodia, saude, seguranca, visitas, excesso_prazo,
         situacao, status, origem)
      VALUES (${item.processo_id}, ${pv.orgao_decisor ?? null}, ${dataDec},
        ${pv.requisitos ?? null}, ${pv.pressupostos ?? null}, ${pv.contemporaneidade ?? null},
        ${pv.local_custodia ?? null}, ${pv.historico_custodia ?? null}, ${pv.saude ?? null},
        ${pv.seguranca ?? null}, ${pv.visitas ?? null}, ${pv.excesso_prazo ?? null},
        ${pv.situacao ?? "preso"}, 'ativa', 'claude')`;
    console.log(`  ↳ prisão preventiva (${(pv.requisitos ?? []).length} requisitos) → prisao_preventiva`);
  }

  // Patrocínio: se a análise detectou advogado constituído nos autos, sobe
  // DEFENSORIA → PARTICULAR (nunca rebaixa automaticamente; nome manual vence).
  const advC = item.advogado_constituido ?? p.advogado_constituido ?? null;
  if (advC?.tem) {
    const upd = await sql`
      UPDATE processos
      SET tipo_patrocinio = 'PARTICULAR',
          advogado_particular = COALESCE(advogado_particular, ${advC.nomes ?? null}),
          updated_at = NOW()
      WHERE id = ${item.processo_id} AND tipo_patrocinio = 'DEFENSORIA'
      RETURNING id`;
    if (upd.length) console.log(`  ↳ patrocínio → PARTICULAR (${advC.nomes ?? "sem nome"})`);
  }
}
console.log(`Resumo: ${ok}/${items.length}`);
await sql.end();
