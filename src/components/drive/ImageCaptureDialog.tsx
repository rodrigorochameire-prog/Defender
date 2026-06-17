"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ScanFace, Save, X, Loader2 } from "lucide-react";

interface ImageCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string; // base64 data URL do recorte
  processoId?: number | null;
  assistidoId?: number | null;
  driveFileId?: number | null; // id em drive_files do PDF de origem
  pagina?: number | null;
}

// Papéis para rotular o recorte (default herda o papel da pessoa no processo).
const PAPEL_OPTIONS = [
  { value: "REU", label: "Réu" },
  { value: "CORREU", label: "Corréu" },
  { value: "VITIMA", label: "Vítima / ofendida" },
  { value: "TESTEMUNHA", label: "Testemunha" },
  { value: "INFORMANTE", label: "Informante" },
  { value: "PERITO", label: "Perito" },
  { value: "OUTRO", label: "Outro" },
];

// Mapa do papel do diálogo (UPPERCASE) → valor válido de participação
// (minúsculo, PAPEIS_VALIDOS) usado ao criar pessoa nova + vínculo no processo.
const PAPEL_PARTICIPACAO: Record<string, string> = {
  REU: "reu",
  CORREU: "co-reu",
  VITIMA: "vitima",
  TESTEMUNHA: "testemunha",
  INFORMANTE: "informante",
  PERITO: "perito-criminal",
  OUTRO: "outro",
};

const PAPEL_LABEL: Record<string, string> = Object.fromEntries(
  PAPEL_OPTIONS.map((o) => [o.value, o.label]),
);

/**
 * Vincula um recorte de imagem do PDF a uma pessoa + papel do processo
 * (réu, suposta vítima, testemunha A/B…). O recorte aparece depois na
 * galeria da pessoa (PessoaSheet → Mídias).
 */
export function ImageCaptureDialog({
  isOpen,
  onClose,
  imageDataUrl,
  processoId,
  driveFileId,
  pagina,
}: ImageCaptureDialogProps) {
  const [modo, setModo] = useState<"existente" | "nova">("existente");
  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [nomeLivre, setNomeLivre] = useState("");
  const [papel, setPapel] = useState<string>("REU");
  const [rotulo, setRotulo] = useState("");
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();
  const { data: pessoas, isLoading: loadingPessoas } =
    trpc.pessoas.getPessoasDoProcesso.useQuery(
      { processoId: processoId ?? 0 },
      { enabled: isOpen && !!processoId },
    );
  const salvar = trpc.pessoas.salvarRecorte.useMutation();
  const criarPessoa = trpc.pessoas.create.useMutation();
  const addParticipacao = trpc.pessoas.addParticipacao.useMutation();

  // Ao escolher a pessoa, herda o papel dela como sugestão.
  useEffect(() => {
    if (pessoaId == null) return;
    const sel = pessoas?.find((p) => p.pessoaId === pessoaId);
    if (sel?.papel) setPapel(sel.papel.toUpperCase());
  }, [pessoaId, pessoas]);

  const semPessoas = !loadingPessoas && (!pessoas || pessoas.length === 0);
  // Sem pessoas no processo → só faz sentido "nova".
  const modoEfetivo: "existente" | "nova" = semPessoas ? "nova" : modo;
  const estimatedSize = imageDataUrl
    ? Math.round((imageDataUrl.split(",")[1]?.length || 0) * 0.75 / 1024)
    : 0;

  async function handleSave() {
    setSaving(true);
    try {
      let alvoPessoaId = pessoaId;

      if (modoEfetivo === "nova") {
        if (!nomeLivre.trim()) {
          toast.error("Informe o nome da pessoa");
          setSaving(false);
          return;
        }
        // Cria a pessoa e vincula ao processo (papel mapeado p/ o enum válido).
        const nova = await criarPessoa.mutateAsync({
          nome: nomeLivre.trim(),
          fonteCriacao: "manual",
        } as any);
        alvoPessoaId = nova.id;
        if (processoId) {
          try {
            await addParticipacao.mutateAsync({
              pessoaId: nova.id,
              processoId,
              papel: (PAPEL_PARTICIPACAO[papel] ?? "outro") as any,
            } as any);
          } catch (e) {
            console.warn("[ImageCaptureDialog] addParticipacao falhou (não-fatal):", e);
          }
        }
      } else if (!alvoPessoaId) {
        toast.error("Selecione a pessoa");
        setSaving(false);
        return;
      }

      await salvar.mutateAsync({
        pessoaId: alvoPessoaId!,
        processoId: processoId ?? null,
        driveFileId: driveFileId ?? null,
        papel,
        rotulo: rotulo.trim() || null,
        imagem: imageDataUrl,
        pagina: pagina ?? null,
      });
      utils.pessoas.getRecortesByPessoa.invalidate({ pessoaId: alvoPessoaId! });
      utils.pessoas.getPessoasDoProcesso.invalidate({ processoId: processoId ?? 0 });
      toast.success("Recorte vinculado à pessoa!");
      onClose();
    } catch (err) {
      console.error("[ImageCaptureDialog] erro:", err);
      toast.error("Erro ao salvar o recorte");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ScanFace className="h-4 w-4 text-emerald-600" />
            Vincular recorte
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Atribua este recorte a uma pessoa do processo (réu, vítima, testemunha…).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preview do recorte */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="max-h-40 overflow-hidden rounded-lg border-2 border-neutral-200 dark:border-neutral-700 shadow-sm">
              {imageDataUrl && (
                <img src={imageDataUrl} alt="Recorte" className="max-h-40 w-auto object-contain" />
              )}
            </div>
            <span className="text-[10px] text-neutral-400">
              ~{estimatedSize}KB{pagina ? ` · pág. ${pagina}` : ""}
            </span>
          </div>

          {/* Alternar: pessoa do processo × nova pessoa (toggle só quando há pessoas) */}
          {!semPessoas && (
            <div className="flex gap-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5">
              <button
                type="button"
                onClick={() => setModo("existente")}
                className={cn(
                  "flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors cursor-pointer",
                  modoEfetivo === "existente"
                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
                )}
              >
                Do processo
              </button>
              <button
                type="button"
                onClick={() => setModo("nova")}
                className={cn(
                  "flex-1 text-[11px] font-medium py-1.5 rounded-md transition-colors cursor-pointer",
                  modoEfetivo === "nova"
                    ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
                )}
              >
                Nova pessoa
              </button>
            </div>
          )}

          {modoEfetivo === "existente" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Pessoa</Label>
              <Select
                value={pessoaId?.toString() || ""}
                onValueChange={(v) => setPessoaId(Number(v))}
                disabled={loadingPessoas}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingPessoas ? "Carregando…" : "Selecione…"} />
                </SelectTrigger>
                <SelectContent>
                  {(pessoas ?? []).map((p) => (
                    <SelectItem key={p.pessoaId} value={p.pessoaId.toString()} className="text-xs">
                      {p.nome}
                      {p.papel ? ` · ${PAPEL_LABEL[p.papel.toUpperCase()] ?? p.papel}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da pessoa</Label>
              <Input
                value={nomeLivre}
                onChange={(e) => setNomeLivre(e.target.value)}
                placeholder="Nome completo…"
                className="h-8 text-xs"
              />
            </div>
          )}

          {/* Papel */}
          <div className="space-y-1.5">
            <Label className="text-xs">Papel</Label>
            <Select value={papel} onValueChange={setPapel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rótulo livre */}
          <div className="space-y-1.5">
            <Label className="text-xs">Rótulo (opcional)</Label>
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex.: assinatura, foto do RG, trecho do depoimento…"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            <X className="w-3 h-3 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || (modoEfetivo === "existente" && !pessoaId) || (modoEfetivo === "nova" && !nomeLivre.trim())}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Salvar recorte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
