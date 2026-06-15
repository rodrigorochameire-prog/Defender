import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";
import { resolverFonteMedidas } from "../medidas-fonte";

export function MedidasVigentesSecao({
  processoId,
  qtdBanco,
  medidasAnalysis,
}: {
  processoId: number | null;
  qtdBanco: number;
  medidasAnalysis: any[];
}) {
  const fonte = resolverFonteMedidas({ qtdBanco, qtdAnalysis: medidasAnalysis.length });

  if (fonte === "banco" && typeof processoId === "number") {
    return <MedidasVigentesPanel processoId={processoId} readOnly />;
  }

  if (fonte === "analysisData") {
    return (
      <div className="space-y-2">
        <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          extraído dos autos — conferir no PJe
        </span>
        <ul className="space-y-1 list-disc pl-4">
          {medidasAnalysis.map((m: any, i: number) => (
            <li key={i} className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {typeof m === "string" ? m : (m.medida ?? m.texto ?? JSON.stringify(m))}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (typeof processoId === "number") {
    return <MedidasVigentesPanel processoId={processoId} readOnly />;
  }
  return null;
}
