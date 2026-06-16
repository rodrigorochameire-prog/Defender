import { MedidasVigentesPanel } from "@/components/mpu/medidas-vigentes-panel";
import { resolverFonteMedidas } from "../medidas-fonte";
import { CitacaoText } from "../CitacaoText";

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
      <div className="space-y-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          extraído dos autos — conferir no PJe
        </span>
        <ul className="space-y-2">
          {medidasAnalysis.map((m: any, i: number) => (
            <li key={i} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-amber-400/80" />
              <CitacaoText
                texto={typeof m === "string" ? m : (m.medida ?? m.texto ?? JSON.stringify(m))}
                className="text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap"
              />
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
