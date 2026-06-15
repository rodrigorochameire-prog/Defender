import type { DossieV2 } from "@/lib/agenda/dossie-v2";

function Lista({ titulo, itens }: { titulo: string; itens?: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="space-y-1">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h4>
      <ul className="space-y-1 list-disc pl-4">
        {itens.map((t, i) => (
          <li key={`${i}-${t}`} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{t}</li>
        ))}
      </ul>
    </div>
  );
}

export function DossieV2Block({ dossie }: { dossie: DossieV2 }) {
  // Teses e fragilidades agora vivem nas seções granulares do painel
  // (Teses / Contradições); aqui ficam só os complementos do dossiê.
  const temAlgo =
    !!dossie &&
    ((dossie.perguntas?.length ?? 0) > 0 ||
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

      {/* Resumo, teses e fragilidades NÃO são repetidos aqui — vivem nas seções
          granulares do painel (Resumo Executivo / Teses / Contradições). Este
          bloco complementa com perguntas, providências e a versão do defendido. */}

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
