export interface AgendarFormInput {
  titulo: string;
  data: string;
  horarioInicio: string;
  local: string;
  descricao: string;
}

export interface AgendarPayload {
  assistidoId: number;
  processoId?: number;
  titulo?: string;
  assunto?: string;
  local?: string;
  dataRegistro: string;
}

export function buildAgendarPayload(
  form: AgendarFormInput,
  vinculos: { assistidoId: number; processoId?: number }
): AgendarPayload {
  const h =
    form.horarioInicio && /^\d{2}:\d{2}$/.test(form.horarioInicio)
      ? form.horarioInicio
      : "00:00";
  return {
    assistidoId: vinculos.assistidoId,
    processoId: vinculos.processoId,
    titulo: form.titulo || undefined,
    assunto: form.descricao || undefined,
    local: form.local || undefined,
    dataRegistro: new Date(`${form.data}T${h}:00`).toISOString(),
  };
}
