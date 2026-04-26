"use client";

// TODO: investigação não possui casoId direto na tabela de diligências/anotações.
// Board de investigação migra em iteração futura.
// Por enquanto, stub informativo.

export function TabInvestigacao() {
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Investigação</h3>
      <p className="text-sm italic text-neutral-400">
        Board de investigação migra em iteração futura. Por ora, acesse via /admin/processos/[id]?raw=1.
      </p>
    </div>
  );
}
