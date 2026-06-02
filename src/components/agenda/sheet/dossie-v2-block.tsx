import type { DossieV2 } from "@/lib/agenda/dossie-v2";
import { nivelTeseClass } from "@/lib/agenda/dossie-v2";
import { cn } from "@/lib/utils";

const NIVEL_BADGE: Record<string, string> = {
  alta: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  baixa: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  neutra: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
};

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h4>
      <ul className="space-y-1 list-disc pl-4">
        {itens.map((t, i) => (
          <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function DossieV2Block({ dossie }: { dossie: DossieV2 }) {
  const temAlgo =
    !!dossie &&
    ((dossie.resumo?.length ?? 0) > 0 ||
      (dossie.teses?.length ?? 0) > 0 ||
      (dossie.fragilidades?.length ?? 0) > 0 ||
      (dossie.perguntas?.length ?? 0) > 0 ||
      (dossie.providencias?.length ?? 0) > 0 ||
      !!dossie.versao_defendido ||
      !!dossie.intimacao);

  if (!temAlgo) {
    return <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">Dossiê sem conteúdo.</p>;
  }

  return (
    <div className="space-y-4">
      {(dossie.ato || dossie.gerado_em) && (
        <div className="flex items-center justify-between gap-2">
          {dossie.ato && (
            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{dossie.ato}</span>
          )}
          {dossie.gerado_em && (
            <span className="text-[10px] text-neutral-400 whitespace-nowrap">gerado em {dossie.gerado_em}</span>
          )}
        </div>
      )}

      {dossie.resumo && dossie.resumo.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Resumo</h4>
          {dossie.resumo.map((p, i) => (
            <p key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{p}</p>
          ))}
        </div>
      )}

      {dossie.teses && dossie.teses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Teses</h4>
          {dossie.teses.map((t, i) => (
            <div key={i} className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 flex-1">{t.nome}</p>
                {t.nivel && (
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0",
                      NIVEL_BADGE[nivelTeseClass(t.nivel)],
                    )}
                  >
                    {t.nivel}
                  </span>
                )}
              </div>
              {t.fundamento && (
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{t.fundamento}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Lista titulo="Fragilidades da acusação" itens={dossie.fragilidades} />
      <Lista titulo="Perguntas / atos em audiência" itens={dossie.perguntas} />
      <Lista titulo="Providências da defesa" itens={dossie.providencias} />

      {dossie.versao_defendido && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Versão do defendido</h4>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed border-l-2 border-neutral-300 dark:border-neutral-700 pl-2 italic">
            {dossie.versao_defendido}
          </p>
        </div>
      )}

      {dossie.intimacao && (
        <div className="space-y-1">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Intimação</h4>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{dossie.intimacao}</p>
        </div>
      )}
    </div>
  );
}
