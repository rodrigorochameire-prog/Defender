import { CitacaoText } from "../CitacaoText";

export function RequerimentoDefesaSecao({ texto, vinculadoAoMotivo }: { texto: string; vinculadoAoMotivo?: boolean }) {
  return (
    <div className="space-y-2">
      <CitacaoText texto={texto} />
      {vinculadoAoMotivo && (
        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
          ↔ vinculado ao Motivo da designação
        </span>
      )}
    </div>
  );
}
