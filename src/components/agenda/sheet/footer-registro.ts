// Vínculo do registro rápido (padrão Demandas) no rodapé do sheet de audiência.
//
// O `registros.create` (mesmo usado nas Demandas, via `RegistroEditor`) exige
// `assistidoId` e aceita `processoId`/`audienciaId` como contexto opcional. Esta
// função centraliza a normalização desses ids vindos do `EventDetailSheet`
// (onde podem chegar como `null`, `0` ou número válido) e decide se o compositor
// inline pode ser oferecido — sem um assistido não há vínculo, então o registro
// rápido fica indisponível e o usuário cai no caminho "registro completo".

export interface VinculoRegistroInput {
  assistidoId?: number | null;
  processoId?: number | null;
  audienciaId?: number | null;
}

export interface VinculoRegistro {
  /** Há assistido válido → o compositor inline pode ser renderizado. */
  podeRegistrar: boolean;
  /** Sempre presente quando `podeRegistrar` é true. */
  assistidoId: number;
  /** Contexto opcional, já normalizado (zero/negativo/null → undefined). */
  processoId?: number;
  audienciaId?: number;
}

function idValido(v: number | null | undefined): number | undefined {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;
}

export function resolverVinculoRegistro(input: VinculoRegistroInput): VinculoRegistro {
  const assistidoId = idValido(input.assistidoId);
  return {
    podeRegistrar: assistidoId !== undefined,
    // 0 nunca é exposto quando `podeRegistrar` é false; consumidores devem
    // checar `podeRegistrar` antes de usar `assistidoId`.
    assistidoId: assistidoId ?? 0,
    processoId: idValido(input.processoId),
    audienciaId: idValido(input.audienciaId),
  };
}
