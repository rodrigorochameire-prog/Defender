#!/usr/bin/env node
// Atualiza OMBUDS com análise VVD v2 — chamado pelos subagentes.
// Uso: node scripts/vvd_db_update.js <processo_id> <audiencia_id> <json_path>
//
// Lê o JSON da análise (schema v2) e:
// 1. processos.analysis_data ← chaves ricas no topo + vvd_analise_audiencia (backup) + flags
// 2. audiencias.resumo_defesa ← resumo_executivo + tese_principal (se atual estiver vazio)
// 3. audiencias.registro_audiencia.depoentes ← hidrata testemunhas (se atual estiver vazio)
// 4. analises_cowork ← novo registro

const { Client } = require('pg');
const fs = require('fs');

const DATABASE_URL =
  'postgresql://postgres.hxfvlaeqhkmelvyzgfqp:401bFr505%40%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

const RICH_KEYS = [
  'resumo_executivo', 'narrativa_denuncia', 'imputacao',
  'crimes_imputados', 'tipo_processo', 'medidas_protetivas_vigentes',
  'versao_delegacia',
  'laudos', 'vulnerabilidades_acusacao',
  'testemunhas_acusacao', 'testemunhas_defesa',
  'contradicoes', 'pendencias_diligencia_pre_aij',
  'teses_defesa',
  'tese_principal', 'viabilidade_tese_principal', 'teses_subsidiarias',
  'riscos_principais', 'urgencias', 'prescricao',
  'dinamica_relacional', 'historico_violencia',
];

function classificaTipo(vinculo) {
  const v = (vinculo || '').toLowerCase();
  if (v.includes('ofendid') || v.includes('vítima') || v.includes('vitima')) return 'vitima';
  if (v.includes('policial') || v.includes('pm') || v.includes('condutor') || v.includes('investigador')) return 'policial';
  if (v.includes('perit')) return 'perito';
  if (v.includes('informante')) return 'informante';
  return 'testemunha';
}

function mkDepoente(t, lado, idx) {
  if (typeof t === 'string') {
    const nome = t.trim();
    if (!nome) return null;
    return {
      id: `auto-${lado}-${idx}`,
      nome, tipo: 'testemunha', lado,
      intimado: false, presente: false, statusIntimacao: 'pendente',
      jaOuvido: 'nenhum',
      depoimentoDelegacia: '', depoimentoAnterior: '',
      pontosFortes: '', pontosFracos: '',
      estrategiaInquiricao: '', perguntasDefesa: '',
      depoimentoLiteral: '', analisePercepcoes: '',
    };
  }
  if (!t || typeof t !== 'object') return null;
  const nome = (t.nome || t.name || '').trim();
  if (!nome) return null;
  const vinculo = t.vinculo || t['vínculo'] || t.papel || '';
  const resumo = (t.resumo || '').trim();
  return {
    id: `auto-${lado}-${idx}`,
    nome,
    tipo: classificaTipo(vinculo),
    lado,
    intimado: false,
    presente: false,
    statusIntimacao: 'pendente',
    jaOuvido: resumo ? 'delegacia' : 'nenhum',
    depoimentoDelegacia: resumo,
    depoimentoAnterior: '',
    pontosFortes: (t.pontosFavoraveis || '').trim(),
    pontosFracos: (t.pontosDesfavoraveis || '').trim(),
    estrategiaInquiricao: (t.perguntasSugeridas || '').trim(),
    perguntasDefesa: '',
    depoimentoLiteral: '',
    analisePercepcoes: vinculo.trim(),
  };
}

function hidratarDepoentes(tac = [], tde = []) {
  const out = [];
  tac.forEach((t, i) => { const d = mkDepoente(t, 'acusacao', i); if (d) out.push(d); });
  tde.forEach((t, i) => { const d = mkDepoente(t, 'defesa', i); if (d) out.push(d); });
  return out;
}

async function main() {
  const [, , pidArg, audIdArg, jsonPath] = process.argv;
  if (!pidArg || !audIdArg || !jsonPath) {
    console.error('Uso: node scripts/vvd_db_update.js <processo_id> <audiencia_id> <json_path>');
    process.exit(2);
  }
  const pid = parseInt(pidArg, 10);
  const audId = parseInt(audIdArg, 10);

  const metadata = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  const analysisBackup = {
    schema_version: 2,
    tipo: 'vvd',
    source: 'claude_code_subagent',
    analyzed_at: new Date().toISOString(),
    ...metadata,
  };

  const c = new Client({ connectionString: DATABASE_URL });
  await c.connect();
  try {
    // Current state
    const cur = await c.query(
      'SELECT p.analysis_data, a.registro_audiencia, a.resumo_defesa FROM processos p JOIN audiencias a ON a.id=$2 WHERE p.id=$1',
      [pid, audId]
    );
    if (cur.rowCount === 0) throw new Error(`Processo/audiencia not found: pid=${pid}, aud=${audId}`);
    const row = cur.rows[0];

    // 1. processos.analysis_data
    const existingAd = row.analysis_data || {};
    const ad = typeof existingAd === 'string' ? JSON.parse(existingAd) : { ...existingAd };
    for (const k of RICH_KEYS) {
      const v = metadata[k];
      if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) {
        ad[k] = v;
      }
    }
    ad.vvd_analise_audiencia = analysisBackup;
    ad.vvd_analyzed_at = new Date().toISOString();

    await c.query(
      `UPDATE processos SET analysis_data=$1, analysis_status='completed', analyzed_at=NOW(),
       classe_processual=COALESCE($2, classe_processual), updated_at=NOW() WHERE id=$3`,
      [JSON.stringify(ad), metadata.tipo_processo || null, pid]
    );

    // 2. audiencias.resumo_defesa + registro_audiencia.depoentes
    const aud_updates = [];
    const aud_values = [];
    let idx = 1;

    if (!row.resumo_defesa) {
      const resumoExec = (metadata.resumo_executivo || '').trim();
      const teseP = (metadata.tese_principal || '').trim();
      let txt = '';
      if (resumoExec && teseP) txt = resumoExec + '\n\n' + teseP;
      else txt = resumoExec || teseP;
      if (txt) {
        aud_updates.push(`resumo_defesa=$${idx++}`);
        aud_values.push(txt.slice(0, 4000));
      }
    }

    const existingReg = row.registro_audiencia || {};
    const reg = typeof existingReg === 'string' ? JSON.parse(existingReg) : { ...existingReg };
    const hasDepoentes = Array.isArray(reg.depoentes) && reg.depoentes.length > 0;
    if (!hasDepoentes) {
      const dep = hidratarDepoentes(metadata.testemunhas_acusacao, metadata.testemunhas_defesa);
      if (dep.length > 0) {
        reg.depoentes = dep;
        aud_updates.push(`registro_audiencia=$${idx++}`);
        aud_values.push(JSON.stringify(reg));
      }
    }

    if (aud_updates.length > 0) {
      aud_updates.push(`updated_at=NOW()`);
      aud_values.push(audId);
      await c.query(`UPDATE audiencias SET ${aud_updates.join(', ')} WHERE id=$${idx}`, aud_values);
    }

    // 3. analises_cowork
    await c.query(
      `INSERT INTO analises_cowork
       (processo_id, assistido_id, audiencia_id, tipo, schema_version, resumo_fato, tese_defesa,
        estrategia_atual, crime_principal, pontos_criticos, payload, fonte_arquivo, created_at)
       VALUES ($1,
         (SELECT assistido_id FROM processos WHERE id=$1),
         $2, 'vvd_analise_audiencia', 2, $3, $4, $5, $6, $7, $8, 'claude_code_subagent', NOW())`,
      [
        pid, audId,
        (metadata.historico_violencia || '').slice(0, 2000),
        (metadata.tese_principal || '').slice(0, 2000),
        JSON.stringify(metadata.teses_subsidiarias || []).slice(0, 2000),
        (metadata.crimes_imputados || []).join(', ').slice(0, 500),
        JSON.stringify(metadata.riscos_principais || []).slice(0, 2000),
        JSON.stringify(metadata),
      ]
    );

    console.log(JSON.stringify({
      ok: true,
      pid, audId,
      promoted_keys: RICH_KEYS.filter(k => metadata[k] !== undefined),
      aud_fields_updated: aud_updates.filter(u => !u.startsWith('updated_at')).map(u => u.split('=')[0]),
      tese: (metadata.tese_principal || '').slice(0, 80),
    }));
  } finally {
    await c.end();
  }
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
