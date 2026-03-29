// src/components/processo/analise-teses.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import {
  Scale,
  AlertTriangle,
  Swords,
  MessageSquare,
  Users,
  CheckSquare,
  User,
} from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Nulidade {
  tipo: string;
  descricao: string;
  severidade: "alta" | "media" | "baixa";
  fundamentacao?: string;
}

interface MatrizItem {
  ponto: string;
  tipo: "forte" | "fraco";
  categoria?: string;
}

interface PerguntaItem {
  pergunta: string;
  objetivo?: string;
}

interface PerguntasTestemunha {
  testemunha: string;
  perguntas: PerguntaItem[];
}

interface AnaliseTesesProps {
  teses: { principal?: string; subsidiarias?: string[] } | string[] | null;
  nulidades: Nulidade[];
  matrizGuerra: MatrizItem[];
  // Rich fields
  orientacaoAssistido?: string;
  perspectivaPlenaria?: string;
  checklistTatico?: string[];
  perguntasEstrategicas?: PerguntasTestemunha[];
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function nulidadeClasses(severidade: Nulidade["severidade"]): string {
  if (severidade === "alta")
    return `border-l-red-500 ${COLORS.danger.bg}`;
  if (severidade === "media")
    return `border-l-amber-500 ${COLORS.warning.bg}`;
  return `border-l-zinc-300 ${COLORS.neutral.bg}`;
}

function nulidadeBadgeVariant(
  severidade: Nulidade["severidade"]
): "danger" | "warning" | "default" {
  if (severidade === "alta") return "danger";
  if (severidade === "media") return "warning";
  return "default";
}

// ─────────────────────────────────────────────
// Section: Teses Defensivas
// ─────────────────────────────────────────────

function TesesSection({
  teses,
}: {
  teses: AnaliseTesesProps["teses"];
}) {
  let principal: string | undefined;
  let subsidiarias: string[] = [];

  if (Array.isArray(teses)) {
    [principal, ...subsidiarias] = teses;
  } else if (teses) {
    principal = teses.principal;
    subsidiarias = teses.subsidiarias ?? [];
  }

  const hasTeses = principal || subsidiarias.length > 0;
  if (!hasTeses) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <Scale className="h-5 w-5 text-blue-500 shrink-0" />
        Teses Defensivas
      </h3>

      <div className="space-y-3">
        {/* Tese principal em destaque */}
        {principal && (
          <div
            className={`${CARD_STYLE.highlight} border-l-emerald-500 ${COLORS.primary.bg} rounded-xl`}
          >
            <div className="flex items-start gap-3">
              <span className="text-emerald-600 font-bold text-lg shrink-0 leading-tight">
                1.
              </span>
              <div className="space-y-1.5">
                <p className={`${TYPO.body} font-medium`}>{principal}</p>
                <Badge variant="default" className="text-xs">
                  Principal
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Teses subsidiárias */}
        {subsidiarias.map((tese, i) => (
          <div
            key={i}
            className={`${CARD_STYLE.base} rounded-xl`}
          >
            <div className="flex items-start gap-3">
              <span className="text-zinc-400 font-semibold text-sm shrink-0 pt-0.5">
                {principal ? i + 2 : i + 1}.
              </span>
              <div className="space-y-1.5">
                <p className={TYPO.body}>{tese}</p>
                <Badge variant="outline" className="text-xs">
                  Subsidiária
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Nulidades / Ilegalidades
// ─────────────────────────────────────────────

function NulidadesSection({ nulidades }: { nulidades: Nulidade[] }) {
  if (nulidades.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        Nulidades / Ilegalidades
      </h3>

      <div className="space-y-3">
        {nulidades.map((n, i) => (
          <div
            key={i}
            className={`${CARD_STYLE.highlight} ${nulidadeClasses(n.severidade)} rounded-xl`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={nulidadeBadgeVariant(n.severidade)}
                className="text-xs capitalize"
              >
                {n.severidade}
              </Badge>
              <span className={TYPO.h3}>{n.tipo}</span>
            </div>
            <p className={`${TYPO.body} text-muted-foreground`}>
              {n.descricao}
            </p>
            {n.fundamentacao && (
              <p className={`${TYPO.caption} italic mt-2`}>
                {n.fundamentacao}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Matriz de Guerra
// ─────────────────────────────────────────────

function MatrizGuerraSection({ matrizGuerra }: { matrizGuerra: MatrizItem[] }) {
  if (matrizGuerra.length === 0) return null;

  const fortes = matrizGuerra.filter((m) => m.tipo === "forte");
  const fracos = matrizGuerra.filter((m) => m.tipo === "fraco");

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <Swords className="h-5 w-5 text-violet-500 shrink-0" />
        Matriz de Guerra
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Pontos Fortes */}
        <div className={`${CARD_STYLE.base} rounded-xl ${COLORS.primary.bg} border-emerald-200 dark:border-emerald-800`}>
          <p className={`${TYPO.label} text-emerald-600 dark:text-emerald-400 mb-3`}>
            Pontos Fortes
          </p>
          {fortes.length > 0 ? (
            <ul className="space-y-2">
              {fortes.map((m, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                  <span className="text-emerald-500 shrink-0 font-bold leading-snug">
                    ✓
                  </span>
                  <span className="text-foreground">{m.ponto}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${TYPO.caption} italic`}>Nenhum identificado</p>
          )}
        </div>

        {/* Pontos Fracos */}
        <div className={`${CARD_STYLE.base} rounded-xl ${COLORS.danger.bg} border-red-200 dark:border-red-800`}>
          <p className={`${TYPO.label} text-red-600 dark:text-red-400 mb-3`}>
            Pontos Fracos
          </p>
          {fracos.length > 0 ? (
            <ul className="space-y-2">
              {fracos.map((m, i) => (
                <li key={i} className={`flex items-start gap-2 ${TYPO.body}`}>
                  <span className="text-red-500 shrink-0 font-bold leading-snug">
                    ✗
                  </span>
                  <span className="text-foreground">{m.ponto}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${TYPO.caption} italic`}>Nenhum identificado</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Perguntas Estratégicas
// ─────────────────────────────────────────────

function PerguntasEstrategicasSection({
  perguntasEstrategicas,
}: {
  perguntasEstrategicas?: PerguntasTestemunha[];
}) {
  if (!perguntasEstrategicas || perguntasEstrategicas.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
        Perguntas Estratégicas
      </h3>

      <div className="space-y-3">
        {perguntasEstrategicas.map((grupo, gi) => (
          <div
            key={gi}
            className={`${CARD_STYLE.base} rounded-xl ${COLORS.info.bg} border-blue-200 dark:border-blue-800`}
          >
            {/* Header da testemunha */}
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-blue-500 shrink-0" />
              <span className={`${TYPO.h3} text-blue-700 dark:text-blue-300`}>
                {grupo.testemunha}
              </span>
            </div>

            {/* Lista de perguntas */}
            <ol className="space-y-3">
              {grupo.perguntas.map((p, pi) => (
                <li key={pi} className="flex items-start gap-2.5">
                  <span className={`${TYPO.small} text-blue-400 font-semibold shrink-0 pt-0.5 tabular-nums`}>
                    {pi + 1}.
                  </span>
                  <div>
                    <p className={TYPO.body}>{p.pergunta}</p>
                    {p.objetivo && (
                      <p className={`${TYPO.caption} mt-0.5`}>
                        Objetivo: {p.objetivo}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Orientação ao Assistido
// ─────────────────────────────────────────────

function OrientacaoAssistidoSection({
  orientacaoAssistido,
}: {
  orientacaoAssistido?: string;
}) {
  if (!orientacaoAssistido) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <User className="h-5 w-5 text-emerald-600 shrink-0" />
        Orientação para Interrogatório
      </h3>

      <div
        className={[
          "rounded-xl p-5",
          "border-2 border-dashed border-emerald-400 dark:border-emerald-700",
          "bg-emerald-50 dark:bg-emerald-950/20",
        ].join(" ")}
      >
        <p
          className={[
            TYPO.body,
            "leading-7 text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap",
          ].join(" ")}
        >
          {orientacaoAssistido}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Perspectiva Plenária
// ─────────────────────────────────────────────

function PerspectivaPlenariaSection({
  perspectivaPlenaria,
}: {
  perspectivaPlenaria?: string;
}) {
  if (!perspectivaPlenaria) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <Scale className="h-5 w-5 text-violet-500 shrink-0" />
        Perspectiva para o Plenário
      </h3>

      <div
        className={[
          "rounded-xl p-5",
          CARD_STYLE.highlight,
          "border-l-violet-500",
          COLORS.violet.bg,
        ].join(" ")}
      >
        <p
          className={[
            TYPO.body,
            "leading-7 whitespace-pre-wrap",
          ].join(" ")}
        >
          {perspectivaPlenaria}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Checklist Tático
// ─────────────────────────────────────────────

function ChecklistTaticoSection({
  checklistTatico,
}: {
  checklistTatico?: string[];
}) {
  if (!checklistTatico || checklistTatico.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <CheckSquare className="h-5 w-5 text-zinc-500 shrink-0" />
        Plano de Acao — 48h
      </h3>

      <div className={`${CARD_STYLE.base} rounded-xl`}>
        <ul className="space-y-2.5">
          {checklistTatico.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              {/* Visual-only checkbox */}
              <span
                className={[
                  "shrink-0 mt-0.5",
                  "h-4 w-4 rounded border-2 border-zinc-300 dark:border-zinc-600",
                  "inline-block",
                ].join(" ")}
                aria-hidden="true"
              />
              <span className={TYPO.body}>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────

export function AnaliseTeses({
  teses,
  nulidades,
  matrizGuerra,
  orientacaoAssistido,
  perspectivaPlenaria,
  checklistTatico,
  perguntasEstrategicas,
}: AnaliseTesesProps) {
  // Determine if anything at all is present
  const hasTeses = Array.isArray(teses)
    ? teses.length > 0
    : !!(teses?.principal || (teses?.subsidiarias ?? []).length > 0);

  const isEmpty =
    !hasTeses &&
    nulidades.length === 0 &&
    matrizGuerra.length === 0 &&
    !orientacaoAssistido &&
    !perspectivaPlenaria &&
    (!checklistTatico || checklistTatico.length === 0) &&
    (!perguntasEstrategicas || perguntasEstrategicas.length === 0);

  if (isEmpty) {
    return (
      <p className={`${TYPO.body} text-muted-foreground text-center py-8`}>
        Nenhuma tese ou nulidade identificada. Execute uma analise para extrair
        argumentos defensivos.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <TesesSection teses={teses} />
      <NulidadesSection nulidades={nulidades} />
      <MatrizGuerraSection matrizGuerra={matrizGuerra} />
      <PerguntasEstrategicasSection
        perguntasEstrategicas={perguntasEstrategicas}
      />
      <OrientacaoAssistidoSection orientacaoAssistido={orientacaoAssistido} />
      <PerspectivaPlenariaSection perspectivaPlenaria={perspectivaPlenaria} />
      <ChecklistTaticoSection checklistTatico={checklistTatico} />
    </div>
  );
}
