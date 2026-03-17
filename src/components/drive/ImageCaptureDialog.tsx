"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { ScanFace, Save, X, Loader2 } from "lucide-react";

interface ImageCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageDataUrl: string; // base64 data URL from canvas capture
  processoId?: number | null;
  assistidoId?: number | null; // pre-selected if known from context
}

const PAPEL_OPTIONS = [
  { value: "reu", label: "Reu / Assistido" },
  { value: "vitima", label: "Vitima" },
  { value: "testemunha", label: "Testemunha" },
  { value: "correu", label: "Correu" },
  { value: "advogado", label: "Advogado(a)" },
  { value: "outro", label: "Outro" },
];

export function ImageCaptureDialog({
  isOpen,
  onClose,
  imageDataUrl,
  processoId,
  assistidoId: preSelectedAssistidoId,
}: ImageCaptureDialogProps) {
  const [papel, setPapel] = useState("reu");
  const [selectedAssistidoId, setSelectedAssistidoId] = useState<number | null>(preSelectedAssistidoId || null);
  const [nomeLivre, setNomeLivre] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();

  // Fetch assistidos for selection
  const { data: assistidosData } = trpc.assistidos.list.useQuery(
    {},
    { enabled: isOpen && papel === "reu" }
  );

  const assistidos = assistidosData || [];

  // Estimate file size from base64
  const estimatedSize = imageDataUrl
    ? Math.round((imageDataUrl.split(",")[1]?.length || 0) * 0.75 / 1024)
    : 0;

  async function handleSave() {
    if (papel === "reu" && !selectedAssistidoId) {
      toast.error("Selecione o assistido");
      return;
    }
    if (papel !== "reu" && !nomeLivre.trim()) {
      toast.error("Informe o nome da pessoa");
      return;
    }

    setIsUploading(true);
    try {
      if (papel === "reu" && selectedAssistidoId) {
        const base64 = imageDataUrl.split(",")[1];
        await utils.client.assistidos.uploadPhoto.mutate({
          assistidoId: selectedAssistidoId,
          imageBase64: base64,
          fileName: `captura-pdf-${Date.now()}.jpg`,
          contentType: "image/jpeg",
        });
        utils.assistidos.list.invalidate();
        toast.success("Foto do assistido atualizada!");
      } else {
        // For non-assistido roles, save locally for future use
        // Store in sessionStorage as a simple approach
        const captures = JSON.parse(sessionStorage.getItem("capturedPhotos") || "[]");
        captures.push({
          imageDataUrl,
          nome: nomeLivre,
          papel,
          processoId,
          capturedAt: new Date().toISOString(),
        });
        sessionStorage.setItem("capturedPhotos", JSON.stringify(captures));
        toast.success(`Foto de ${nomeLivre} salva para vinculacao futura`);
      }
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro ao salvar foto");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <ScanFace className="h-4 w-4 text-emerald-600" />
            Captura de Imagem
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            Atribua a imagem capturada a uma pessoa do processo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Circular Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 shadow-md">
              {imageDataUrl && (
                <img
                  src={imageDataUrl}
                  alt="Captura"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <span className="text-[10px] text-zinc-400">~{estimatedSize}KB</span>
          </div>

          {/* Papel/Funcao */}
          <div className="space-y-1.5">
            <Label className="text-xs">Papel / Funcao</Label>
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

          {/* Vincular a assistido ou nome livre */}
          {papel === "reu" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Vincular ao Assistido</Label>
              <Select
                value={selectedAssistidoId?.toString() || ""}
                onValueChange={(v) => setSelectedAssistidoId(Number(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {assistidos.map((a: { id: number; nome: string }) => (
                    <SelectItem key={a.id} value={a.id.toString()} className="text-xs">
                      {a.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da Pessoa</Label>
              <Input
                value={nomeLivre}
                onChange={(e) => setNomeLivre(e.target.value)}
                placeholder="Nome completo..."
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-8">
            <X className="w-3 h-3 mr-1" /> Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isUploading}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isUploading ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Save className="w-3 h-3 mr-1" />
            )}
            Salvar Foto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
