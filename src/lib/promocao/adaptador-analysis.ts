import type { CandidatoPessoa } from "./tipos";
import { mapearPapel } from "./de-para-papeis";

export function candidatosDeAnalysis(
  processoId: number,
  analysisData: Record<string, unknown> | null,
): CandidatoPessoa[] {
  const pessoas = analysisData && Array.isArray((analysisData as any).pessoas)
    ? ((analysisData as any).pessoas as Array<Record<string, unknown>>)
    : [];
  return pessoas
    .filter((p) => typeof p.nome === "string" && p.nome.trim())
    .map((p) => {
      const pp = mapearPapel(String(p.papel ?? ""));
      const vinculo = typeof p.vinculoComDefendido === "string" ? p.vinculoComDefendido : null;
      return {
        nome: String(p.nome),
        cpf: typeof p.cpf === "string" ? p.cpf : null,
        dataNascimento: typeof p.dataNascimento === "string" ? p.dataNascimento : null,
        papel: pp.papel, lado: pp.lado, subpapel: vinculo ?? pp.subpapel,
        fonteRef: `analysis:${processoId}`,
        confianca: 0.75,
      };
    });
}
