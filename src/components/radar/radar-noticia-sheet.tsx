"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ExternalLink,
  MapPin,
  Clock,
  Users,
  Link2,
  Scale,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Crosshair,
  Pencil,
  RefreshCw,
  Save,
  X,
  Newspaper,
  MessageSquare,
  ChevronRight,
  Copy,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { getCrimeBadgeColor, getCrimeLabel } from "./radar-filtros";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CRIME_TYPE_OPTIONS = [
  { value: "homicidio", label: "Homicidio" },
  { value: "tentativa_homicidio", label: "Tentativa" },
  { value: "trafico", label: "Trafico" },
  { value: "roubo", label: "Roubo" },
  { value: "furto", label: "Furto" },
  { value: "violencia_domestica", label: "V. Domestica" },
  { value: "sexual", label: "Sexual" },
  { value: "lesao_corporal", label: "Lesao Corp." },
  { value: "porte_arma", label: "Porte Arma" },
  { value: "estelionato", label: "Estelionato" },
  { value: "outros", label: "Outros" },
] as const;

interface RadarNoticiaSheetProps {
  noticiaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNoticia?: (id: number) => void;
}

interface Envolvido {
  nome: string | null;
  papel: string;
  idade?: number;
  vulgo?: string;
}

interface EditFormState {
  tipoCrime: string;
  bairro: string;
  logradouro: string;
  delegacia: string;
  resumoIA: string;
}

function HighlightedText({ text, highlights }: { text: string; highlights: string[] }) {
  const validHighlights = highlights.filter(Boolean);
  if (validHighlights.length === 0) return <>{text}</>;

  const escaped = validHighlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 0 ? (
          part
        ) : (
          <mark
            key={i}
            className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded px-0.5 font-medium not-italic"
          >
            {part}
          </mark>
        )
      )}
    </>
  );
}

function parseEnvolvidos(raw: Envolvido[] | string | null): Envolvido[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

function parseArtigosPenais(raw: string[] | string | null): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

const papelColors: Record<string, string> = {
  suspeito: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  preso: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  acusado: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  denunciado: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  vitima: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  testemunha: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  policial: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const papelLabels: Record<string, string> = {
  suspeito: "Suspeito",
  preso: "Preso",
  acusado: "Acusado",
  denunciado: "Denunciado",
  vitima: "Vitima",
  testemunha: "Testemunha",
  policial: "Policial",
  outro: "Outro",
};

const matchStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  confirmado_auto: { label: "Confirmado (auto)", icon: CheckCircle2, color: "text-emerald-600" },
  confirmado_manual: { label: "Confirmado", icon: CheckCircle2, color: "text-emerald-600" },
  possivel: { label: "Possivel", icon: AlertTriangle, color: "text-amber-600" },
  descartado: { label: "Descartado", icon: XCircle, color: "text-zinc-400" },
};

const circunstanciaLabels: Record<string, string> = {
  flagrante: "Flagrante",
  investigacao: "Investigacao",
  cumprimento_mandado: "Cumprimento de mandado",
  operacao_policial: "Operacao policial",
  denuncia: "Denuncia",
  outros: "Outros",
};

export function RadarNoticiaSheet({ noticiaId, open, onOpenChange, onSelectNoticia }: RadarNoticiaSheetProps) {
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.radar.getById.useQuery(
    { id: noticiaId! },
    { enabled: !!noticiaId && open }
  );

  const { data: relacionadas } = trpc.radar.noticiasRelacionadas.useQuery(
    { id: noticiaId! },
    { enabled: !!noticiaId && open && !!data }
  );

  const noticia = data;

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({
    tipoCrime: "",
    bairro: "",
    logradouro: "",
    delegacia: "",
    resumoIA: "",
  });

  // Reset edit mode when sheet closes or noticia changes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  // Populate form when entering edit mode
  function enterEditMode() {
    if (!noticia) return;
    setEditForm({
      tipoCrime: noticia.tipoCrime || "",
      bairro: noticia.bairro || "",
      logradouro: noticia.logradouro || "",
      delegacia: noticia.delegacia || "",
      resumoIA: noticia.resumoIA || "",
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  const reprocessMutation = trpc.radar.reprocessNoticia.useMutation({
    onSuccess: () => {
      toast.success("Reprocessamento iniciado", {
        description: "A notícia será re-analisada em breve",
      });
      utils.radar.getById.invalidate({ id: noticiaId! });
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const updateMutation = trpc.radar.updateNoticia.useMutation({
    onSuccess: () => {
      toast.success("Noticia atualizada com sucesso");
      utils.radar.getById.invalidate({ id: noticiaId! });
      utils.radar.list.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar noticia: " + error.message);
    },
  });

  function handleSave() {
    if (!noticiaId) return;
    updateMutation.mutate({
      id: noticiaId,
      tipoCrime: editForm.tipoCrime,
      bairro: editForm.bairro,
      logradouro: editForm.logradouro,
      delegacia: editForm.delegacia,
      resumoIA: editForm.resumoIA,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !noticia ? (
          <div className="flex items-center justify-center h-40 text-sm text-zinc-400">
            Noticia nao encontrada
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <SheetHeader className="space-y-3">
              {/* Badges + Edit toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                {isEditing ? (
                  <Select
                    value={editForm.tipoCrime}
                    onValueChange={(val) => setEditForm((prev) => ({ ...prev, tipoCrime: val }))}
                  >
                    <SelectTrigger className="w-[180px] h-7 text-xs cursor-pointer">
                      <SelectValue placeholder="Tipo de crime" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRIME_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="secondary"
                    className={getCrimeBadgeColor(noticia.tipoCrime)}
                  >
                    {getCrimeLabel(noticia.tipoCrime)}
                  </Badge>
                )}
                {!isEditing && noticia.circunstancia && (
                  <Badge variant="outline" className="text-xs">
                    {circunstanciaLabels[noticia.circunstancia] || noticia.circunstancia}
                  </Badge>
                )}
                {!isEditing && (noticia.matches?.length ?? 0) > 0 && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <Link2 className="h-3 w-3 mr-1" />
                    {noticia.matches!.length} match{noticia.matches!.length > 1 ? "es" : ""} DPE
                  </Badge>
                )}
                {/* Edit toggle button */}
                <Button
                  variant={isEditing ? "secondary" : "ghost"}
                  size="sm"
                  className="ml-auto h-7 px-2 cursor-pointer"
                  onClick={isEditing ? cancelEdit : enterEditMode}
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Cancelar
                    </>
                  ) : (
                    <>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </>
                  )}
                </Button>
              </div>

              <SheetTitle className="text-base leading-snug text-left">
                {noticia.titulo}
              </SheetTitle>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                <span>{noticia.fonte}</span>
                {noticia.dataPublicacao && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(noticia.dataPublicacao), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                  </span>
                )}
              </div>
            </SheetHeader>

            {/* Imagem */}
            {noticia.imagemUrl && (
              <div className="rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={noticia.imagemUrl}
                  alt=""
                  className="w-full h-auto max-h-56 object-cover"
                />
              </div>
            )}

            {/* Resumo IA ou corpo da noticia */}
            {(noticia.resumoIA || noticia.corpo || isEditing) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {noticia.resumoIA ? "Resumo" : "Conteudo"}
                </h4>
                {isEditing ? (
                  <Textarea
                    value={editForm.resumoIA}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, resumoIA: e.target.value }))}
                    placeholder="Resumo da noticia..."
                    className="min-h-[120px] text-sm"
                  />
                ) : (
                  <>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {noticia.resumoIA || (noticia.corpo && noticia.corpo.length > 800
                        ? noticia.corpo.slice(0, 800) + "..."
                        : noticia.corpo)}
                    </p>
                    {!noticia.resumoIA && noticia.enrichmentStatus === "pending" && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Analise IA pendente -- detalhes completos apos enriquecimento
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Localizacao */}
            {(noticia.bairro || noticia.logradouro || noticia.delegacia || isEditing) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Localizacao
                  </h4>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-400">Bairro</span>
                        <Input
                          value={editForm.bairro}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, bairro: e.target.value }))}
                          placeholder="Bairro"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-400">Logradouro</span>
                        <Input
                          value={editForm.logradouro}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, logradouro: e.target.value }))}
                          placeholder="Logradouro"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-400">Delegacia</span>
                        <Input
                          value={editForm.delegacia}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, delegacia: e.target.value }))}
                          placeholder="Delegacia"
                          className="h-8 text-sm"
                        />
                      </div>
                      {noticia.dataFato && (
                        <div>
                          <span className="text-xs text-zinc-400">Data do fato</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200 mt-1">
                            {format(new Date(noticia.dataFato), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      {noticia.bairro && (
                        <div>
                          <span className="text-xs text-zinc-400">Bairro</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">{noticia.bairro}</p>
                        </div>
                      )}
                      {noticia.logradouro && (
                        <div>
                          <span className="text-xs text-zinc-400">Logradouro</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">{noticia.logradouro}</p>
                        </div>
                      )}
                      {noticia.delegacia && (
                        <div>
                          <span className="text-xs text-zinc-400">Delegacia</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">{noticia.delegacia}</p>
                        </div>
                      )}
                      {noticia.dataFato && (
                        <div>
                          <span className="text-xs text-zinc-400">Data do fato</span>
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">
                            {format(new Date(noticia.dataFato), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {noticia.latitude && noticia.longitude && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Crosshair className="h-3 w-3" />
                      {Number(noticia.latitude).toFixed(5)}, {Number(noticia.longitude).toFixed(5)}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Artigos penais + arma/meio */}
            {(parseArtigosPenais(noticia.artigosPenais as any).length > 0 || noticia.armaMeio) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5" />
                    Tipificacao
                  </h4>
                  {parseArtigosPenais(noticia.artigosPenais as any).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {parseArtigosPenais(noticia.artigosPenais as any).map((art, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono">
                          {art}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {noticia.armaMeio && (
                    <div className="text-sm">
                      <span className="text-xs text-zinc-400">Arma/Meio: </span>
                      <span className="text-zinc-700 dark:text-zinc-300">{noticia.armaMeio}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Envolvidos */}
            {parseEnvolvidos(noticia.envolvidos as any).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Envolvidos ({parseEnvolvidos(noticia.envolvidos as any).length})
                  </h4>
                  <div className="space-y-1.5">
                    {parseEnvolvidos(noticia.envolvidos as any).map((e, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm",
                          papelColors[e.papel] || "bg-zinc-50 dark:bg-zinc-800/50",
                        )}
                      >
                        <span className="font-medium">
                          {e.nome || "Desconhecido"}
                          {e.vulgo ? ` "${e.vulgo}"` : ""}
                          {e.idade ? `, ${e.idade} anos` : ""}
                        </span>
                        <span className="text-xs opacity-70">
                          {papelLabels[e.papel] || e.papel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Matches DPE */}
            {noticia.matches && noticia.matches.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Matches com Assistidos DPE
                  </h4>
                  <div className="space-y-2">
                    {noticia.matches.map((match) => {
                      const cfg = matchStatusConfig[match.status] || matchStatusConfig.possivel;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={match.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                                {match.assistidoNome || match.nomeEncontrado}
                              </span>
                              <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.color)} />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                              <span>Score: {match.scoreConfianca}%</span>
                              <span>{cfg.label}</span>
                              {match.nomeEncontrado !== match.assistidoNome && (
                                <span className="truncate">
                                  Na noticia: &ldquo;{match.nomeEncontrado}&rdquo;
                                </span>
                              )}
                            </div>
                            {(match.status === "confirmado_manual" || match.status === "descartado") && match.updatedAt && (
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-1">
                                <Clock className="h-2.5 w-2.5" />
                                {match.status === "confirmado_manual" ? "Confirmado" : "Descartado"}{" "}
                                {formatDistanceToNow(new Date(match.updatedAt), { addSuffix: true, locale: ptBR })}
                              </div>
                            )}
                            {match.notes && (
                              <div className="text-[10px] text-zinc-500 italic flex items-center gap-1 mt-0.5">
                                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                                {match.notes}
                              </div>
                            )}
                            {/* Por que este match? */}
                            <details className="mt-2">
                              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 select-none flex items-center gap-1 list-none">
                                <ChevronRight className="h-3 w-3 transition-transform [details[open]_&]:rotate-90" />
                                Por que este match?
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const text = `${noticia.titulo}\n\nNome encontrado: ${match.nomeEncontrado}\nFonte: ${noticia.fonte || ""}\nURL: ${noticia.url || ""}`;
                                    navigator.clipboard.writeText(text);
                                    toast.success("Trecho copiado");
                                  }}
                                  className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="h-3 w-3" /> Copiar
                                </button>
                              </summary>
                              <div className="mt-2 text-xs bg-zinc-50 dark:bg-zinc-900 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                                {noticia.corpo ? (
                                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                    <HighlightedText
                                      text={noticia.corpo.slice(0, 600)}
                                      highlights={[match.nomeEncontrado].filter(Boolean) as string[]}
                                    />
                                    {noticia.corpo.length > 600 && (
                                      <span className="text-zinc-400"> ...</span>
                                    )}
                                  </p>
                                ) : (
                                  <p className="text-zinc-500">
                                    Nome encontrado:{" "}
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                      {match.nomeEncontrado}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </details>
                          </div>
                          {match.assistidoId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs shrink-0 cursor-pointer self-start"
                              asChild
                            >
                              <a href={`/admin/assistidos/${match.assistidoId}`}>
                                Ver perfil
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Edit save/cancel buttons */}
            {isEditing && (
              <>
                <Separator />
                <div className="flex gap-2 pb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 cursor-pointer"
                    onClick={cancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </>
            )}

            {/* Ver também */}
            {!isEditing && relacionadas && relacionadas.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Newspaper className="h-3.5 w-3.5" />
                    Ver também ({relacionadas.length})
                  </h4>
                  <div className="space-y-2">
                    {relacionadas.map((rel) => (
                      <button
                        key={rel.id}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
                        onClick={() => onSelectNoticia?.(rel.id)}
                      >
                        {rel.imagemUrl && (
                          <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                            <img src={rel.imagemUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge
                              variant="secondary"
                              className={cn("text-[10px] px-1 py-0", getCrimeBadgeColor(rel.tipoCrime))}
                            >
                              {getCrimeLabel(rel.tipoCrime)}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {rel.titulo}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5">
                            {rel.bairro && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-2.5 w-2.5" />
                                {rel.bairro}
                              </span>
                            )}
                            {rel.dataFato && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {format(new Date(rel.dataFato), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Acoes */}
            {!isEditing && (
              <>
                <Separator />
                <div className="flex gap-2 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 cursor-pointer"
                    asChild
                  >
                    <a href={noticia.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Abrir fonte original
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 cursor-pointer text-zinc-500 hover:text-zinc-700"
                    onClick={() => reprocessMutation.mutate({ id: noticiaId! })}
                    disabled={reprocessMutation.isPending || noticia.enrichmentStatus === "pending"}
                    title="Re-analisar esta notícia com IA"
                  >
                    <RefreshCw className={cn(
                      "h-3.5 w-3.5",
                      (reprocessMutation.isPending || noticia.enrichmentStatus === "pending") && "animate-spin"
                    )} />
                    {noticia.enrichmentStatus === "pending" ? "Analisando..." : "Re-analisar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
