"use client";

import { useEffect, useMemo, useState } from "react";
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

// Tipo do recorte — Rosto é a regra (vira avatar da pessoa/réu).
const TIPO_OPTIONS = [
  { value: "rosto", label: "Rosto (vira avatar)" },
  { value: "assinatura", label: "Assinatura" },
  { value: "laudo", label: "Trecho de laudo" },
  { value: "peticao", label: "Trecho de petição" },
  { value: "outro", label: "Outro" },
];

const PAPEL_OPTIONS = [
  { value: "REU", label: "Réu" },
  { value: "CORREU", label: "Corréu" },
  { value: "VITIMA", label: "Vítima / ofendida" },
  { value: "TESTEMUNHA", label: "Testemunha" },
  { value: "INFORMANTE", label: "Informante" },
  { value: "PERITO", label: "Perito" },
  { value: "OUTRO", label: "Outro" },
];

// Papel do diálogo (UPPERCASE) → valor válido de participação (PAPEIS_VALIDOS).
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
 * Vincula um recorte do PDF a uma parte do processo (réu, vítima, testemunha…).
 * Rosto vira o avatar da pessoa/réu e aparece nos chips/cards. Réu, testemunhas
 * e vítima já vêm no seletor (das fontes do OMBUDS) — sem precisar digitar.
 */
export function ImageCaptureDialog({
  isOpen,
  onClose,
  imageDataUrl,
  processoId,
  assistidoId,
  driveFileId,
  pagina,
}: ImageCaptureDialogProps) {
  const [modo, setModo] = useState<"existente" | "nova">("existente");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [nomeLivre, setNomeLivre] = useState("");
  const [tipo, setTipo] = useState<string>("rosto");
  const [papel, setPapel] = useState<string>("REU");
  const [rotulo, setRotulo] = useState("");
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();
  const { data: partes, isLoading: loadingPartes } =
    trpc.pessoas.getPartesDoProcesso.useQuery(
      { processoId: processoId ?? null, assistidoId: assistidoId ?? null },
      { enabled: isOpen && (!!processoId || !!assistidoId) },
    );
  const salvar = trpc.pessoas.salvarRecorte.useMutation();
  const criarPessoa = trpc.pessoas.create.useMutation();
  const addParticipacao = trpc.pessoas.addParticipacao.useMutation();

  const selParte = useMemo(
    () => (partes ?? []).find((p) => p.key === selectedKey) ?? null,
    [partes, selectedKey],
  );

  // Ao escolher a parte, herda o papel dela como sugestão.
  useEffect(() => {
    if (selParte?.papel) setPapel(selParte.papel.toUpperCase());
  }, [selParte]);

  const semPartes = !loadingPartes && (!partes || partes.length === 0);
  const modoEfetivo: "existente" | "nova" = semPartes ? "nova" : modo;
  const estimatedSize = imageDataUrl
    ? Math.round((imageDataUrl.split(",")[1]?.length || 0) * 0.75 / 1024)
    : 0;

  async function criarPessoaComVinculo(nome: string): Promise<number> {
    const nova = await criarPessoa.mutateAsync({ nome: nome.trim(), fonteCriacao: "manual" } as any);
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
    return nova.id;
  }

  async function handleSave() {
    setSaving(true);
    try {
      let alvoPessoaId: number | null = null;
      let alvoAssistidoId: number | null = null;

      if (modoEfetivo === "nova") {
        if (!nomeLivre.trim()) {
          toast.error("Informe o nome da pessoa");
          setSaving(false);
          return;
        }
        alvoPessoaId = await criarPessoaComVinculo(nomeLivre);
      } else {
        if (!selParte) {
          toast.error("Selecione a pessoa");
          setSaving(false);
          return;
        }
        if (selParte.assistidoId) {
          alvoAssistidoId = selParte.assistidoId;
        } else if (selParte.pessoaId) {
          alvoPessoaId = selParte.pessoaId;
        } else {
          // Testemunha ainda não está no grafo → cria a pessoa + vínculo.
          alvoPessoaId = await criarPessoaComVinculo(selParte.nome);
        }
      }

      await salvar.mutateAsync({
        pessoaId: alvoPessoaId,
        assistidoId: alvoAssistidoId,
        processoId: processoId ?? null,
        driveFileId: driveFileId ?? null,
        tipo,
        papel,
        rotulo: rotulo.trim() || null,
        imagem: imageDataUrl,
        pagina: pagina ?? null,
      });

      if (alvoPessoaId) utils.pessoas.getRecortesByPessoa.invalidate({ pessoaId: alvoPessoaId });
      utils.pessoas.getPartesDoProcesso.invalidate();
      utils.pessoas.getPessoasDoProcesso.invalidate({ processoId: processoId ?? 0 });
      utils.assistidos.list.invalidate();
      toast.success(tipo === "rosto" ? "Rosto vinculado — virou avatar!" : "Recorte vinculado!");
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
            Rosto, assinatura ou trecho — vincule a uma parte do processo.
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

          {/* Tipo do recorte (Rosto é a regra) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Alternar: do processo × nova pessoa */}
          {!semPartes && (
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
              <Select value={selectedKey} onValueChange={setSelectedKey} disabled={loadingPartes}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingPartes ? "Carregando…" : "Selecione…"} />
                </SelectTrigger>
                <SelectContent>
                  {(partes ?? []).map((p) => (
                    <SelectItem key={p.key} value={p.key} className="text-xs">
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
              placeholder="Ex.: foto do RG, assinatura, trecho do depoimento…"
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
            disabled={saving || (modoEfetivo === "existente" && !selectedKey) || (modoEfetivo === "nova" && !nomeLivre.trim())}
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
