import type { MotivoDesignacao } from "../motivo-designacao";
import { LABEL_ORIGEM } from "../motivo-designacao";

export function MotivoDesignacaoSecao({ motivo }: { motivo: MotivoDesignacao }) {
  return (
    <div className="space-y-2">
      {motivo.origem && (
        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
          {LABEL_ORIGEM[motivo.origem]}
        </span>
      )}
      {motivo.detalhe && (
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
          {motivo.detalhe}
        </p>
      )}
    </div>
  );
}
