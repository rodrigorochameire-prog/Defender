"use client";

interface Props { casoId: number; }

export function TabMidias({ casoId }: Props) {
  return (
    <div className="p-4">
      <h3 className="text-base font-semibold mb-3">Mídias</h3>
      <p className="text-sm italic text-neutral-400">
        Áudios e vídeos do caso #{casoId}. Migração em iteração futura — por ora,
        acesse via Drive do processo em /admin/processos/[id].
      </p>
    </div>
  );
}
