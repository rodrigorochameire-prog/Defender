// Lógica pura do fluxo "Agendar retorno / Novo atendimento" (Fase 4 do redesign).
// Mantém os desfechos como fonte única testável — o modal só consome.
// (A extração dos builders de payload do handleSubmit é uma fatia posterior;
// aqui fica apenas o que a UI de desfecho precisa.)

export type Desfecho = "nenhuma" | "demanda" | "orientacao";

export interface DesfechoOption {
  value: Desfecho;
  label: string;
  hint: string;
  /** Só "demanda" exige informar o ato a praticar. */
  requiresAto: boolean;
}

export const DESFECHO_OPTIONS: readonly DesfechoOption[] = [
  { value: "nenhuma", label: "Só atendimento", hint: "não gera demanda", requiresAto: false },
  { value: "demanda", label: "Gerar demanda", hint: "há providência a fazer", requiresAto: true },
  {
    value: "orientacao",
    label: "Atendimento e orientação",
    hint: "registra no cadastro, sem providência",
    requiresAto: false,
  },
];

/** Indica se o desfecho escolhido exige o campo "ato a praticar". */
export function desfechoRequiresAto(d: Desfecho): boolean {
  return DESFECHO_OPTIONS.find((o) => o.value === d)?.requiresAto ?? false;
}
