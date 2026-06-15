export function RequerimentoDefesaSecao({ texto, vinculadoAoMotivo }: { texto: string; vinculadoAoMotivo?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{texto}</p>
      {vinculadoAoMotivo && (
        <p className="text-[10px] text-blue-500">↔ vinculado ao Motivo da designação (origem: requerimento da defesa)</p>
      )}
    </div>
  );
}
