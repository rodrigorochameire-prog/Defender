// src/components/processo/analise-audiencia.tsx
"use client";

import {
  MessageSquare,
  Users,
  User,
  ListOrdered,
  ClipboardList,
} from "lucide-react";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AnaliseAudienciaProps {
  perguntasEstrategicas?: Array<{
    testemunha: string;
    papel?: string;
    perguntas: string[];
    objetivo?: string;
  }>;
  orientacaoAssistido?: string;
  requerimentosOrais?: string[];
  protocoloDia?: string[];
}

// ─────────────────────────────────────────────
// Section: Perguntas Estratégicas
// ─────────────────────────────────────────────

function PerguntasSection({
  perguntasEstrategicas,
}: {
  perguntasEstrategicas?: AnaliseAudienciaProps["perguntasEstrategicas"];
}) {
  if (!perguntasEstrategicas || perguntasEstrategicas.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <MessageSquare className="h-5 w-5 text-blue-500 shrink-0" />
        Perguntas Estrategicas
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
              {grupo.papel && (
                <span className="text-[11px] text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                  {grupo.papel}
                </span>
              )}
            </div>

            {/* Objetivo (se houver) */}
            {grupo.objetivo && (
              <p className={`${TYPO.caption} mb-3 italic`}>
                Objetivo: {grupo.objetivo}
              </p>
            )}

            {/* Lista de perguntas */}
            <ol className="space-y-3">
              {grupo.perguntas.map((pergunta, pi) => (
                <li key={pi} className="flex items-start gap-2.5">
                  <span
                    className={`${TYPO.small} text-blue-400 font-semibold shrink-0 pt-0.5 tabular-nums`}
                  >
                    {pi + 1}.
                  </span>
                  <p className={TYPO.body}>{pergunta}</p>
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

function OrientacaoSection({
  orientacaoAssistido,
}: {
  orientacaoAssistido?: string;
}) {
  if (!orientacaoAssistido) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <User className="h-5 w-5 text-emerald-600 shrink-0" />
        Orientacao ao Assistido
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
// Section: Requerimentos Orais
// ─────────────────────────────────────────────

function RequerimentosSection({
  requerimentosOrais,
}: {
  requerimentosOrais?: string[];
}) {
  if (!requerimentosOrais || requerimentosOrais.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <ClipboardList className="h-5 w-5 text-violet-500 shrink-0" />
        Requerimentos Orais
      </h3>

      <div className="space-y-3">
        {requerimentosOrais.map((req, i) => (
          <div
            key={i}
            className={`${CARD_STYLE.highlight} border-l-violet-500 ${COLORS.violet.bg} rounded-xl`}
          >
            <div className="flex items-start gap-3">
              <span className="text-violet-500 font-bold text-lg shrink-0 leading-tight">
                {i + 1}.
              </span>
              <p
                className={`${TYPO.body} text-violet-900 dark:text-violet-100 whitespace-pre-wrap`}
              >
                {req}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Protocolo do Dia
// ─────────────────────────────────────────────

function ProtocoloSection({
  protocoloDia,
}: {
  protocoloDia?: string[];
}) {
  if (!protocoloDia || protocoloDia.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <ListOrdered className="h-5 w-5 text-neutral-500 shrink-0" />
        Protocolo do Dia
      </h3>

      <div className={`${CARD_STYLE.base} rounded-xl`}>
        <ol className="space-y-2.5">
          {protocoloDia.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className={[
                  "shrink-0 mt-0.5",
                  "h-6 w-6 rounded-full",
                  "bg-neutral-100 dark:bg-neutral-800",
                  "flex items-center justify-center",
                  "text-xs font-semibold text-neutral-500 dark:text-neutral-400 tabular-nums",
                ].join(" ")}
              >
                {i + 1}
              </span>
              <span className={TYPO.body}>{item}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────

export function AnaliseAudiencia({
  perguntasEstrategicas,
  orientacaoAssistido,
  requerimentosOrais,
  protocoloDia,
}: AnaliseAudienciaProps) {
  const isEmpty =
    (!perguntasEstrategicas || perguntasEstrategicas.length === 0) &&
    !orientacaoAssistido &&
    (!requerimentosOrais || requerimentosOrais.length === 0) &&
    (!protocoloDia || protocoloDia.length === 0);

  if (isEmpty) {
    return (
      <p className={`${TYPO.body} text-muted-foreground text-center py-8`}>
        Nenhum dado de audiencia disponivel. Execute uma analise para gerar
        perguntas estrategicas e orientacoes.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <PerguntasSection perguntasEstrategicas={perguntasEstrategicas} />
      <OrientacaoSection orientacaoAssistido={orientacaoAssistido} />
      <RequerimentosSection requerimentosOrais={requerimentosOrais} />
      <ProtocoloSection protocoloDia={protocoloDia} />
    </div>
  );
}
