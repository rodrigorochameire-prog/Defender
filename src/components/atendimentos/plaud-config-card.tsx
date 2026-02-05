"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Settings,
  CheckCircle2,
  XCircle,
  Loader2,
  Smartphone,
  Cloud,
  FileText,
  Sparkles,
  FolderOpen,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlaudConfigCardProps {
  className?: string;
}

export function PlaudConfigCard({ className }: PlaudConfigCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: "",
    apiSecret: "",
    deviceId: "",
    deviceName: "",
    deviceModel: "note" as "note" | "notepin",
    defaultLanguage: "pt-BR",
    autoTranscribe: true,
    autoSummarize: true,
    autoUploadToDrive: true,
    driveFolderId: "",
    isActive: false,
  });

  const utils = trpc.useUtils();

  const { data: config, isLoading } = trpc.atendimentos.getPlaudConfig.useQuery();
  const { data: stats } = trpc.atendimentos.recordingStats.useQuery();

  const saveMutation = trpc.atendimentos.savePlaudConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva com sucesso!");
      utils.atendimentos.getPlaudConfig.invalidate();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = () => {
    if (config) {
      setFormData({
        apiKey: config.apiKey || "",
        apiSecret: config.apiSecret || "",
        deviceId: config.deviceId || "",
        deviceName: config.deviceName || "",
        deviceModel: (config.deviceModel as "note" | "notepin") || "note",
        defaultLanguage: config.defaultLanguage || "pt-BR",
        autoTranscribe: config.autoTranscribe ?? true,
        autoSummarize: config.autoSummarize ?? true,
        autoUploadToDrive: config.autoUploadToDrive ?? true,
        driveFolderId: config.driveFolderId || "",
        isActive: config.isActive ?? false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: config?.id,
      ...formData,
    });
  };

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/plaud`
      : "";

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Integração Plaud
              </CardTitle>
              <CardDescription>
                Gravador de áudio com transcrição automática
              </CardDescription>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                config?.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-zinc-100 text-zinc-500"
              )}
            >
              {config?.isActive ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {config ? (
            <>
              {/* Status do dispositivo */}
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {config.deviceName || "Dispositivo Plaud"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {config.deviceModel === "notepin" ? "Plaud NotePin" : "Plaud Note"}
                    {config.deviceId && ` • ${config.deviceId.slice(0, 8)}...`}
                  </p>
                </div>
              </div>

              {/* Estatísticas */}
              {stats && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-zinc-500">Gravações</p>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.linked}</p>
                    <p className="text-xs text-zinc-500">Vinculadas</p>
                  </div>
                </div>
              )}

              {/* Configurações ativas */}
              <div className="flex flex-wrap gap-2">
                {config.autoTranscribe && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Auto-transcrição
                  </Badge>
                )}
                {config.autoSummarize && (
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-resumo
                  </Badge>
                )}
                {config.autoUploadToDrive && (
                  <Badge variant="outline" className="text-xs">
                    <Cloud className="h-3 w-3 mr-1" />
                    Upload Drive
                  </Badge>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Mic className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">Plaud não configurado</p>
              <p className="text-xs text-zinc-400">
                Configure para gravar e transcrever atendimentos
              </p>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={handleOpenDialog}>
            <Settings className="h-4 w-4 mr-2" />
            {config ? "Configurar" : "Configurar Plaud"}
          </Button>
        </CardContent>
      </Card>

      {/* Dialog de configuração */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Configuração do Plaud
            </DialogTitle>
            <DialogDescription>
              Configure a integração com seu dispositivo Plaud para gravação automática
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Webhook URL */}
            <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                URL do Webhook (configure no Plaud)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="text-xs bg-white dark:bg-zinc-800"
                />
                <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* API Keys */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (opcional)</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="pk_..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret (opcional)</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="sk_..."
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
              />
            </div>

            {/* Dispositivo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceId">ID do Dispositivo</Label>
                <Input
                  id="deviceId"
                  placeholder="device_..."
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceModel">Modelo</Label>
                <Select
                  value={formData.deviceModel}
                  onValueChange={(value) =>
                    setFormData({ ...formData, deviceModel: value as "note" | "notepin" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Plaud Note</SelectItem>
                    <SelectItem value="notepin">Plaud NotePin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceName">Nome do Dispositivo</Label>
              <Input
                id="deviceName"
                placeholder="Meu Plaud"
                value={formData.deviceName}
                onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
              />
            </div>

            {/* Idioma */}
            <div className="space-y-2">
              <Label htmlFor="language">Idioma da Transcrição</Label>
              <Select
                value={formData.defaultLanguage}
                onValueChange={(value) => setFormData({ ...formData, defaultLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Google Drive */}
            <div className="space-y-2">
              <Label htmlFor="driveFolderId">ID da Pasta no Drive (opcional)</Label>
              <Input
                id="driveFolderId"
                placeholder="1abc..."
                value={formData.driveFolderId}
                onChange={(e) => setFormData({ ...formData, driveFolderId: e.target.value })}
              />
              <p className="text-xs text-zinc-500">
                Áudios serão salvos automaticamente nesta pasta
              </p>
            </div>

            {/* Switches */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoTranscribe" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Transcrição automática
                </Label>
                <Switch
                  id="autoTranscribe"
                  checked={formData.autoTranscribe}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoTranscribe: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoSummarize" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Resumo automático com IA
                </Label>
                <Switch
                  id="autoSummarize"
                  checked={formData.autoSummarize}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoSummarize: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoUploadToDrive" className="flex items-center gap-2">
                  <Cloud className="h-4 w-4" />
                  Upload automático para Drive
                </Label>
                <Switch
                  id="autoUploadToDrive"
                  checked={formData.autoUploadToDrive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, autoUploadToDrive: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Label htmlFor="isActive" className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Integração ativa
                </Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
