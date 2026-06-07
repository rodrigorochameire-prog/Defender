"use client";
import { useState, useCallback } from "react";
import { needsHeicConversion, needsCompression, ACCEPTED_MIME, MAX_BYTES } from "@/lib/registros/anexo-utils";

export type UploadState = { name: string; status: "preparando" | "enviando" | "ok" | "erro"; error?: string };

/** Converte HEIC→JPEG e comprime imagens grandes (libs carregadas sob demanda). */
async function prepareFile(file: File): Promise<File> {
  let out = file;
  if (needsHeicConversion(file.type)) {
    const heic2any = (await import("heic2any")).default;
    const blob = (await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 })) as Blob;
    out = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
  }
  if (needsCompression(out.type, out.size)) {
    const imageCompression = (await import("browser-image-compression")).default;
    out = await imageCompression(out, { maxSizeMB: 1.5, maxWidthOrHeight: 2200, useWebWorker: true });
  }
  return out;
}

export function useAnexoUpload(onUploaded: () => void) {
  const [items, setItems] = useState<UploadState[]>([]);

  const upload = useCallback(async (registroId: number, files: File[]) => {
    for (const original of files) {
      if (!(ACCEPTED_MIME as readonly string[]).includes(original.type)) {
        setItems((s) => [...s, { name: original.name, status: "erro", error: "tipo não suportado" }]);
        continue;
      }
      const idx = items.length;
      setItems((s) => [...s, { name: original.name, status: "preparando" }]);
      try {
        const prepared = await prepareFile(original);
        if (prepared.size > MAX_BYTES) throw new Error("arquivo acima de 10MB mesmo após compressão");
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "enviando" } : it)));
        const fd = new FormData();
        fd.append("registroId", String(registroId));
        fd.append("file", prepared);
        const res = await fetch("/api/registros/anexos", { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "ok" } : it)));
      } catch (e) {
        setItems((s) => s.map((it, i) => (i === idx ? { ...it, status: "erro", error: (e as Error).message } : it)));
      }
    }
    onUploaded();
  }, [items.length, onUploaded]);

  const reset = useCallback(() => setItems([]), []);
  return { items, upload, reset };
}
