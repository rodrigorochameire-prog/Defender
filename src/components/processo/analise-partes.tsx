// src/components/processo/analise-partes.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { User, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Shield, Phone } from "lucide-react";
import { useState } from "react";

interface Pessoa {
  nome: string;
  tipo: string; // REU, VITIMA, TESTEMUNHA, FAMILIAR, PERITO, POLICIAL
  papel: string;
  preso?: boolean | null;
  unidade_prisional?: string;
  idade?: number;
  profissao?: string;
  telefone?: string;
  antecedentes?: string;
  relacao_fatos?: string;
  // Intimation status for next hearing
  status_intimacao?: string; // "intimado", "em_curso", "frustrada", "sem_diligencia", "dispensado"
  data_intimacao?: string;
  // Testimony phases
  delegacia?: boolean;
  juizo?: boolean;
  plenario?: boolean;
  // AI analysis data
  favoravel_defesa?: boolean | null;
  perguntas_sugeridas?: string[];
  contradicoes?: string[];
}

interface AnalisePartesProps {
  pessoas: Pessoa[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function papelBadge(tipo: string) {
  const t = tipo?.toUpperCase();
  if (t === "REU") return { label: "Acusado", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  if (t === "VITIMA") return { label: "Vítima", cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
  if (t === "TESTEMUNHA") return { label: "Testemunha", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
  if (t === "FAMILIAR") return { label: "Familiar", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" };
  if (t === "PERITO") return { label: "Perito", cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" };
  if (t === "POLICIAL") return { label: "PM / Policial", cls: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300" };
  return { label: tipo ?? "—", cls: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" };
}

function statusBadge(status?: string) {
  if (!status) return null;
  switch (status) {
    case "intimado":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Intimado
        </span>
      );
    case "em_curso":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          Em curso
        </span>
      );
    case "frustrada":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
          Frustrada
        </span>
      );
    case "sem_diligencia":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200">
          Sem diligência
        </span>
      );
    case "dispensado":
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          Dispensado
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {status}
        </span>
      );
  }
}

function CheckIcon({ value }: { value?: boolean }) {
  if (value === true)
    return <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">✓</span>;
  if (value === false)
    return <span className="text-neutral-300 dark:text-neutral-600 text-sm">✗</span>;
  return <span className="text-neutral-300 dark:text-neutral-600 text-sm">—</span>;
}

// ─── group ordering ────────────────────────────────────────────────────────────

type GrupoKey = "REU" | "VITIMA" | "TESTEMUNHA_ACUSACAO" | "TESTEMUNHA_DEFESA" | "PERITO_POLICIAL" | "FAMILIAR";

const GRUPO_ORDER: GrupoKey[] = [
  "REU",
  "VITIMA",
  "TESTEMUNHA_ACUSACAO",
  "TESTEMUNHA_DEFESA",
  "PERITO_POLICIAL",
  "FAMILIAR",
];

const GRUPO_LABELS: Record<GrupoKey, string> = {
  REU: "Acusados",
  VITIMA: "Vítimas",
  TESTEMUNHA_ACUSACAO: "Testemunhas — Acusação",
  TESTEMUNHA_DEFESA: "Testemunhas — Defesa",
  PERITO_POLICIAL: "Peritos / Policiais",
  FAMILIAR: "Familiares",
};

function grupoKey(p: Pessoa): GrupoKey {
  const t = p.tipo?.toUpperCase();
  if (t === "REU") return "REU";
  if (t === "VITIMA") return "VITIMA";
  if (t === "FAMILIAR") return "FAMILIAR";
  if (t === "PERITO" || t === "POLICIAL") return "PERITO_POLICIAL";
  if (t === "TESTEMUNHA") {
    // If favoravel_defesa is explicitly true, put under defesa group
    if (p.favoravel_defesa === true) return "TESTEMUNHA_DEFESA";
    return "TESTEMUNHA_ACUSACAO";
  }
  return "TESTEMUNHA_ACUSACAO";
}

// ─── person card ──────────────────────────────────────────────────────────────

function PessoaCard({ p, index }: { p: Pessoa; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [perguntasOpen, setPerguntasOpen] = useState(false);
  const [contradicoesOpen, setContradicoesOpen] = useState(false);

  const badge = papelBadge(p.tipo);
  const temPerguntas = (p.perguntas_sugeridas?.length ?? 0) > 0;
  const temContradicoes = (p.contradicoes?.length ?? 0) > 0;

  return (
    <div className="rounded-xl border border-neutral-100 dark:border-neutral-800/50 p-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
      {/* Header row */}
      <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
          <User className="h-4 w-4 text-neutral-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100 truncate">{p.nome}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
            {p.preso === true && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                <Shield className="h-3 w-3" />
                Preso
                {p.unidade_prisional ? ` — ${p.unidade_prisional}` : ""}
              </span>
            )}
            {p.preso === false && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Solto
              </span>
            )}
            {p.favoravel_defesa === true && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                Favorável à defesa
              </span>
            )}
            {p.favoravel_defesa === false && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Desfavorável
              </span>
            )}
          </div>
          {p.papel && (
            <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400 truncate">{p.papel}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-neutral-400">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Indicators always visible */}
      {(temPerguntas || temContradicoes || p.telefone) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {p.telefone && (
            <span className="inline-flex items-center gap-1 text-[12px] text-neutral-500 dark:text-neutral-400">
              <Phone className="h-3.5 w-3.5" />
              {p.telefone}
            </span>
          )}
          {temPerguntas && (
            <button
              onClick={() => { setExpanded(true); setPerguntasOpen(v => !v); }}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {p.perguntas_sugeridas!.length} perguntas sugeridas
            </button>
          )}
          {temContradicoes && (
            <button
              onClick={() => { setExpanded(true); setContradicoesOpen(v => !v); }}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {p.contradicoes!.length} contradição(ões)
            </button>
          )}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {p.profissao && (
              <>
                <dt className="text-neutral-400 dark:text-neutral-500">Profissão</dt>
                <dd className="text-neutral-700 dark:text-neutral-300">{p.profissao}</dd>
              </>
            )}
            {p.idade != null && (
              <>
                <dt className="text-neutral-400 dark:text-neutral-500">Idade</dt>
                <dd className="text-neutral-700 dark:text-neutral-300">{p.idade} anos</dd>
              </>
            )}
            {p.antecedentes && (
              <>
                <dt className="text-neutral-400 dark:text-neutral-500">Antecedentes</dt>
                <dd className="text-neutral-700 dark:text-neutral-300">{p.antecedentes}</dd>
              </>
            )}
            {p.status_intimacao && (
              <>
                <dt className="text-neutral-400 dark:text-neutral-500">Intimação</dt>
                <dd>{statusBadge(p.status_intimacao)}</dd>
              </>
            )}
            {p.data_intimacao && (
              <>
                <dt className="text-neutral-400 dark:text-neutral-500">Data</dt>
                <dd className="text-neutral-700 dark:text-neutral-300">{p.data_intimacao}</dd>
              </>
            )}
          </dl>

          {p.relacao_fatos && (
            <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/50 p-3 text-[13px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">Relação com os fatos: </span>
              {p.relacao_fatos}
            </div>
          )}

          {/* Perguntas sugeridas */}
          {temPerguntas && (
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/30 overflow-hidden">
              <button
                onClick={() => setPerguntasOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-[13px] font-medium text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {p.perguntas_sugeridas!.length} perguntas sugeridas
                </span>
                {perguntasOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {perguntasOpen && (
                <ol className="divide-y divide-blue-50 dark:divide-blue-900/20">
                  {p.perguntas_sugeridas!.map((q, qi) => (
                    <li key={qi} className="px-3 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900/20 leading-snug">
                      <span className="text-blue-500 font-semibold mr-2">{qi + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {/* Contradições */}
          {temContradicoes && (
            <div className="rounded-lg border border-amber-100 dark:border-amber-900/30 overflow-hidden">
              <button
                onClick={() => setContradicoesOpen(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-[13px] font-medium text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {p.contradicoes!.length} contradição(ões) identificada(s)
                </span>
                {contradicoesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {contradicoesOpen && (
                <ul className="divide-y divide-amber-50 dark:divide-amber-900/20">
                  {p.contradicoes!.map((c, ci) => (
                    <li key={ci} className="px-3 py-2.5 text-[13px] text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900/20 leading-snug flex gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export function AnalisePartes({ pessoas }: AnalisePartesProps) {
  // Witnesses for the intimation table (all except REU)
  const depoentes = pessoas.filter(p => {
    const t = p.tipo?.toUpperCase();
    return t !== "REU";
  });

  const totalContradicoes = pessoas.filter(p => (p.contradicoes?.length ?? 0) > 0).length;
  const totalTestemunhas = pessoas.filter(p => p.tipo?.toUpperCase() === "TESTEMUNHA").length;

  // Operational alerts
  const semIntimacao = depoentes.filter(
    p => p.status_intimacao === "frustrada" || p.status_intimacao === "sem_diligencia"
  );

  // Group cards
  const grupos = GRUPO_ORDER
    .map(key => ({
      key,
      label: GRUPO_LABELS[key],
      items: pessoas.filter(p => grupoKey(p) === key),
    }))
    .filter(g => g.items.length > 0);

  if (pessoas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User className="h-10 w-10 text-neutral-300 dark:text-neutral-600 mb-4" />
        <p className="text-[14px] text-neutral-500 dark:text-neutral-400 max-w-sm">
          Nenhuma pessoa identificada. Execute uma análise para extrair as partes do caso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Summary bar ── */}
      <div className="flex flex-wrap items-center gap-3 text-[13px] text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" />
          <strong className="text-neutral-700 dark:text-neutral-300">{pessoas.length}</strong> pessoas identificadas
        </span>
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span>
          <strong className="text-neutral-700 dark:text-neutral-300">{totalTestemunhas}</strong> testemunhas
        </span>
        {totalContradicoes > 0 && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">·</span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {totalContradicoes} com contradições
            </span>
          </>
        )}
      </div>

      {/* ── Painel de Depoentes — Tabela ── */}
      {depoentes.length > 0 && (
        <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <h2 className="text-[16px] font-semibold text-neutral-900 dark:text-neutral-100">
              Painel de Depoentes
            </h2>
            <p className="mt-0.5 text-[12px] text-neutral-400 dark:text-neutral-500">
              Status de intimação e depoimentos anteriores
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">Papel</th>
                  <th className="px-4 py-3 text-center font-semibold tracking-wide">Delegacia</th>
                  <th className="px-4 py-3 text-center font-semibold tracking-wide">Juízo</th>
                  <th className="px-4 py-3 text-left font-semibold tracking-wide">Status Intimação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {depoentes.map((p, i) => {
                  const badge = papelBadge(p.tipo);
                  return (
                    <tr key={i} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[14px] font-medium text-neutral-800 dark:text-neutral-200">{p.nome}</span>
                        {p.preso === true && (
                          <span className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            Preso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CheckIcon value={p.delegacia} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CheckIcon value={p.juizo} />
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(p.status_intimacao) ?? (
                          <span className="text-[12px] text-neutral-400 dark:text-neutral-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Alerta Operacional ── */}
      {semIntimacao.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <p className="text-[14px] font-semibold text-amber-800 dark:text-amber-300">
              Alerta Operacional
            </p>
            <p className="mt-0.5 text-[13px] text-amber-700 dark:text-amber-400">
              {semIntimacao.length} depoente{semIntimacao.length > 1 ? "s" : ""} sem intimação confirmada
              {" "}({semIntimacao.map(p => p.nome).join(", ")})
              {" "}— risco de redesignação da audiência.
            </p>
          </div>
        </div>
      )}

      {/* ── Person cards grouped ── */}
      {grupos.map(grupo => (
        <div key={grupo.key}>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
            {grupo.label}
          </p>
          <div className="space-y-3">
            {grupo.items.map((p, i) => (
              <PessoaCard key={i} p={p} index={i} />
            ))}
          </div>
        </div>
      ))}

    </div>
  );
}
