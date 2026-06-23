import { and, eq, isNull, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { assistidos } from "@/lib/db/schema/core";
import { pessoas, pessoaRelacoes } from "@/lib/db/schema/pessoas";
import { normalizarNome } from "@/lib/pessoas/normalize";

// ==========================================================================
// NÚCLEO PURO (testado): assistido (texto livre) → relações familiares
// ==========================================================================

/** Grau canônico de uma relação familiar/contato. */
export type Grau = "mae" | "pai" | "conjuge" | "filho" | "irmao" | "contato" | "outro";

/** Subconjunto de `assistidos` que o mapeador puro consome. */
export interface AssistidoFamiliarInput {
  id: number;
  nomeMae: string | null;
  nomePai: string | null;
  nomeContato: string | null;
  parentescoContato: string | null;
  telefoneContato: string | null;
}

/** Uma relação derivada do texto livre do assistido (antes de tocar o banco). */
export interface RelacaoMapeada {
  grau: Grau;
  nomeLivre: string;
  telefone: string | null;
  /** Chave de idempotência do backfill (única por assistido + origem). */
  fonteRef: string;
  fonte: "backfill-assistido";
}

const FONTE = "backfill-assistido" as const;

/**
 * Normaliza um parentesco de texto livre em um `Grau` canônico. Desconhecidos e
 * vazios caem em "contato" (nunca perde a relação, só não a classifica).
 */
export function normalizarGrau(raw: string | null | undefined): Grau {
  const s = normalizarNome(raw ?? "");
  if (!s) return "contato";
  if (/\b(mae|genitora)\b/.test(s)) return "mae";
  if (/\b(pai|genitor)\b/.test(s)) return "pai";
  if (/\b(conjuge|esposa|esposo|marido|companheir[ao])\b/.test(s)) return "conjuge";
  if (/\b(filh[ao])\b/.test(s)) return "filho";
  if (/\b(irma[oã]?|irma)\b/.test(s)) return "irmao";
  return "contato";
}

const limpo = (s: string | null | undefined): string | null => {
  const t = (s ?? "").trim();
  return t.length > 0 ? t : null;
};

/**
 * Mapeia o texto livre do assistido em relações familiares/contatos. PURO e
 * determinístico — não toca o banco. Pula campos vazios. Cada relação carrega
 * um `fonteRef` estável (`assistido:{id}:{grau}` para mãe/pai, e
 * `assistido:{id}:contato:{grau}` para o contato) — distinto mesmo quando o
 * grau coincide, garantindo idempotência sem colisão.
 */
export function mapearFamiliares(a: AssistidoFamiliarInput): RelacaoMapeada[] {
  const out: RelacaoMapeada[] = [];

  const mae = limpo(a.nomeMae);
  if (mae) {
    out.push({ grau: "mae", nomeLivre: mae, telefone: null, fonteRef: `assistido:${a.id}:mae`, fonte: FONTE });
  }

  const pai = limpo(a.nomePai);
  if (pai) {
    out.push({ grau: "pai", nomeLivre: pai, telefone: null, fonteRef: `assistido:${a.id}:pai`, fonte: FONTE });
  }

  const contato = limpo(a.nomeContato);
  if (contato) {
    const grau = normalizarGrau(a.parentescoContato);
    out.push({
      grau,
      nomeLivre: contato,
      telefone: limpo(a.telefoneContato),
      fonteRef: `assistido:${a.id}:contato:${grau}`,
      fonte: FONTE,
    });
  }

  return out;
}

// ==========================================================================
// ORQUESTRADOR (IO fino): resolve assistido→pessoa e faz upsert idempotente
// ==========================================================================

export interface BackfillFamiliaresOpts {
  /** Limite de assistidos a processar neste lote (default: 200). */
  limite?: number;
  /** Restringe a um workspace (default: todos). */
  workspaceId?: number;
}

export interface BackfillFamiliaresContadores {
  assistidos: number;
  /** Assistidos sem pessoa resolvível (pulados). */
  semPessoa: number;
  relacoesUpsert: number;
  /** Relações que casaram com uma pessoa existente (relacionadaPessoaId setado). */
  vinculadas: number;
}

/**
 * `assistidos.pessoaId` NÃO existe — o réu vira pessoa no grafo via promoção
 * (participação papel=REU). Resolvemos o assistido para a sua pessoa por
 * correspondência de nome normalizado, escopada por workspace (mais conservador:
 * nunca cruza workspaces). Retorna o `pessoaId` ou null se não houver match único.
 */
async function resolverPessoaDoAssistido(
  nome: string,
  workspaceId: number | null,
): Promise<number | null> {
  const norm = normalizarNome(nome);
  if (!norm) return null;
  const matches = await db
    .select({ id: pessoas.id })
    .from(pessoas)
    .where(
      and(
        eq(pessoas.nomeNormalizado, norm),
        isNull(pessoas.mergedInto),
        workspaceId != null ? eq(pessoas.workspaceId, workspaceId) : isNull(pessoas.workspaceId),
      ),
    )
    .limit(2);
  return matches.length === 1 ? matches[0].id : null;
}

/** Best-effort: tenta achar a pessoa do familiar pelo nome (mesmo escopo). */
async function resolverPessoaRelacionada(
  nomeLivre: string,
  workspaceId: number | null,
): Promise<number | null> {
  return resolverPessoaDoAssistido(nomeLivre, workspaceId);
}

/**
 * Backfill de familiares: para cada assistido com pessoa resolvível, cria/atualiza
 * relações em `pessoa_relacoes` a partir de nomeMae/nomePai/nomeContato. Idempotente
 * por `fonteRef` (onConflict no índice único `pessoa_id, grau, nome_livre`). Tenta
 * setar `relacionadaPessoaId` por match de nome; senão usa só `nomeLivre`.
 */
export async function backfillFamiliares(
  opts: BackfillFamiliaresOpts = {},
): Promise<BackfillFamiliaresContadores> {
  const limite = opts.limite ?? 200;
  const contadores: BackfillFamiliaresContadores = {
    assistidos: 0,
    semPessoa: 0,
    relacoesUpsert: 0,
    vinculadas: 0,
  };

  const wsFilter =
    opts.workspaceId != null ? eq(assistidos.workspaceId, opts.workspaceId) : undefined;

  // Só assistidos que têm ao menos um campo familiar preenchido.
  const rows = await db
    .select({
      id: assistidos.id,
      nome: assistidos.nome,
      nomeMae: assistidos.nomeMae,
      nomePai: assistidos.nomePai,
      nomeContato: assistidos.nomeContato,
      parentescoContato: assistidos.parentescoContato,
      telefoneContato: assistidos.telefoneContato,
      workspaceId: assistidos.workspaceId,
    })
    .from(assistidos)
    .where(
      and(
        isNull(assistidos.deletedAt),
        or(
          isNotNull(assistidos.nomeMae),
          isNotNull(assistidos.nomePai),
          isNotNull(assistidos.nomeContato),
        ),
        ...(wsFilter ? [wsFilter] : []),
      ),
    )
    .limit(limite);

  for (const a of rows) {
    const relacoes = mapearFamiliares({
      id: a.id,
      nomeMae: a.nomeMae,
      nomePai: a.nomePai,
      nomeContato: a.nomeContato,
      parentescoContato: a.parentescoContato,
      telefoneContato: a.telefoneContato,
    });
    if (relacoes.length === 0) continue;

    const pessoaId = await resolverPessoaDoAssistido(a.nome, a.workspaceId ?? null);
    contadores.assistidos += 1;
    if (pessoaId == null) {
      contadores.semPessoa += 1;
      continue;
    }

    for (const r of relacoes) {
      const relacionadaPessoaId = await resolverPessoaRelacionada(r.nomeLivre, a.workspaceId ?? null);
      if (relacionadaPessoaId != null && relacionadaPessoaId !== pessoaId) {
        contadores.vinculadas += 1;
      }
      await db
        .insert(pessoaRelacoes)
        .values({
          pessoaId,
          relacionadaPessoaId:
            relacionadaPessoaId != null && relacionadaPessoaId !== pessoaId ? relacionadaPessoaId : null,
          grau: r.grau,
          nomeLivre: r.nomeLivre,
          telefone: r.telefone,
          fonte: r.fonte,
          fonteRef: r.fonteRef,
        })
        .onConflictDoUpdate({
          target: [pessoaRelacoes.pessoaId, pessoaRelacoes.grau, pessoaRelacoes.nomeLivre],
          set: {
            telefone: r.telefone,
            fonteRef: r.fonteRef,
            updatedAt: new Date(),
          },
        });
      contadores.relacoesUpsert += 1;
    }
  }

  return contadores;
}
