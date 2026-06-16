import type { MotivoDesignacao } from "../motivo-designacao";
import { LABEL_ORIGEM } from "../motivo-designacao";
import { CitacaoText } from "../CitacaoText";

export function MotivoDesignacaoSecao({ motivo }: { motivo: MotivoDesignacao }) {
  return (
    <div className="space-y-2.5">
      {motivo.origem && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          {LABEL_ORIGEM[motivo.origem]}
        </span>
      )}
      {motivo.detalhe && <CitacaoText texto={motivo.detalhe} />}
    </div>
  );
}
