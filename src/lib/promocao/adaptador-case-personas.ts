import type { CasePersona } from "@/lib/db/schema/casos"; // typeof casePersonas.$inferSelect
import type { CandidatoPessoa } from "./tipos";
import { mapearPapel } from "./de-para-papeis";

const pick = (o: unknown, k: string): string | null => {
  if (o && typeof o === "object" && k in o) {
    const v = (o as Record<string, unknown>)[k];
    return typeof v === "string" ? v : null;
  }
  return null;
};

export function candidatosDeCasePersonas(rows: CasePersona[]): CandidatoPessoa[] {
  return rows.map((r) => {
    const pp = mapearPapel(r.tipo);
    return {
      nome: r.nome,
      cpf: pick(r.perfil, "cpf") ?? pick(r.contatos, "cpf"),
      dataNascimento: pick(r.perfil, "dataNascimento"),
      papel: pp.papel, lado: pp.lado, subpapel: pp.subpapel,
      fonteRef: `case_personas:${r.id}`,
      confianca: typeof r.confidence === "number" ? r.confidence : 0.7,
    };
  });
}
