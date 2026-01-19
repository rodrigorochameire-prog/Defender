"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  Plus,
  Upload,
  FolderOpen,
  File,
  FileCheck,
  RefreshCw,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Cloud,
  FolderSync,
  Search,
} from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { GoogleDriveViewer } from "@/components/integrations/GoogleDriveViewer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ID da pasta do Drive fornecida pelo usuário
const DEFAULT_DRIVE_FOLDER_ID = "1bxPN_PF-wC0XNX79UXCSi5UVDuIHt5Lf";

export default function DocumentosPage() {
  const [activeTab, setActiveTab] = useState("drive");
  const [newFolderId, setNewFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Queries
  const { data: driveConfig } = trpc.drive.isConfigured.useQuery();
  const { data: syncFolders, refetch: refetchFolders } = trpc.drive.syncFolders.useQuery();
  const { data: driveStats } = trpc.drive.stats.useQuery();
  const { data: syncLogs } = trpc.drive.syncLogs.useQuery({ limit: 10 });

  // Mutations
  const registerFolderMutation = trpc.drive.registerFolder.useMutation({
    onSuccess: () => {
      refetchFolders();
      setDialogOpen(false);
      setNewFolderId("");
      setNewFolderName("");
    },
  });

  const syncAllMutation = trpc.drive.syncAll.useMutation({
    onSuccess: () => {
      refetchFolders();
    },
  });

  const handleRegisterFolder = () => {
    if (newFolderId && newFolderName) {
      registerFolderMutation.mutate({
        folderId: newFolderId,
        name: newFolderName,
      });
    }
  };

  // Extrair folder ID de uma URL do Drive
  const extractFolderId = (input: string): string => {
    const match = input.match(/folders\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : input;
  };

  const mainFolderId = syncFolders?.[0]?.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Peças processuais e arquivos sincronizados com o Google Drive
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            Sincronizar Tudo
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Pasta do Drive</DialogTitle>
                <DialogDescription>
                  Cole o link ou ID de uma pasta do Google Drive para sincronizar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folderName">Nome da Pasta</Label>
                  <Input
                    id="folderName"
                    placeholder="Ex: Documentos Gerais"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folderId">Link ou ID da Pasta</Label>
                  <Input
                    id="folderId"
                    placeholder="Cole o link do Drive ou ID da pasta"
                    value={newFolderId}
                    onChange={(e) => setNewFolderId(extractFolderId(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: https://drive.google.com/drive/folders/1bxPN_PF-wC0XNX79UXCSi5UVDuIHt5Lf
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleRegisterFolder}
                  disabled={!newFolderId || !newFolderName || registerFolderMutation.isPending}
                >
                  {registerFolderMutation.isPending ? "Adicionando..." : "Adicionar Pasta"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driveStats?.totalFiles || 0}</div>
            <p className="text-xs text-muted-foreground">sincronizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pastas</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driveStats?.totalFolders || 0}</div>
            <p className="text-xs text-muted-foreground">no Drive</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronização</CardTitle>
            <FolderSync className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driveStats?.syncedFolders || 0}</div>
            <p className="text-xs text-muted-foreground">pastas ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {driveConfig?.configured ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {driveConfig?.configured ? "Conectado" : "Não configurado"}
            </div>
            <p className="text-xs text-muted-foreground">
              {driveStats?.lastSyncAt 
                ? `Última sync: ${new Date(driveStats.lastSyncAt).toLocaleString("pt-BR")}`
                : "Aguardando sincronização"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="drive" className="gap-2">
            <Cloud className="h-4 w-4" />
            Google Drive
          </TabsTrigger>
          <TabsTrigger value="folders" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Pastas Sincronizadas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Google Drive */}
        <TabsContent value="drive" className="space-y-4">
          {driveConfig?.configured ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Visualizador principal */}
              <div className="lg:col-span-2">
                <GoogleDriveViewer
                  folderId={mainFolderId}
                  folderLink={`https://drive.google.com/drive/folders/${mainFolderId}`}
                  height="500px"
                />
              </div>

              {/* Sidebar com pastas */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pastas Monitoradas</CardTitle>
                    <CardDescription>
                      Clique em uma pasta para visualizar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {syncFolders && syncFolders.length > 0 ? (
                      syncFolders.map((folder) => (
                        <div
                          key={folder.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => window.open(folder.driveFolderUrl || "#", "_blank")}
                        >
                          <FolderOpen className="h-5 w-5 text-amber-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {folder.lastSyncAt 
                                ? `Sync: ${new Date(folder.lastSyncAt).toLocaleTimeString("pt-BR")}`
                                : "Nunca sincronizado"}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma pasta configurada</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setDialogOpen(true)}
                        >
                          Adicionar pasta
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Link direto para o Drive */}
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => window.open(`https://drive.google.com/drive/folders/${mainFolderId}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir no Google Drive
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Cloud className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Configure o Google Drive</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Para sincronizar documentos com o Google Drive, configure as variáveis de ambiente 
                  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN e GOOGLE_DRIVE_ROOT_FOLDER_ID.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Ir para Configurações
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Pastas Sincronizadas */}
        <TabsContent value="folders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pastas Sincronizadas</CardTitle>
                  <CardDescription>
                    Gerencie as pastas do Google Drive que estão sendo monitoradas
                  </CardDescription>
                </div>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Pasta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {syncFolders && syncFolders.length > 0 ? (
                <div className="space-y-3">
                  {syncFolders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                    >
                      <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <FolderOpen className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{folder.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {folder.driveFolderId}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Direção: {folder.syncDirection === "bidirectional" ? "Bidirecional" : 
                                     folder.syncDirection === "drive_to_app" ? "Drive → App" : "App → Drive"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Última sync: {folder.lastSyncAt 
                              ? new Date(folder.lastSyncAt).toLocaleString("pt-BR")
                              : "Nunca"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={folder.isActive ? "default" : "secondary"}>
                          {folder.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(folder.driveFolderUrl || "#", "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FolderSync className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma pasta sincronizada</p>
                  <p className="text-sm mt-1">
                    Adicione uma pasta do Google Drive para começar a sincronização
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sincronização</CardTitle>
              <CardDescription>
                Últimas atividades de sincronização com o Google Drive
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs && syncLogs.length > 0 ? (
                <div className="space-y-3">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-3 rounded-lg border"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        log.status === "success" ? "bg-green-100 text-green-600" :
                        log.status === "failed" ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-600"
                      }`}>
                        {log.status === "success" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : log.status === "failed" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                        {log.errorMessage && (
                          <p className="text-xs text-destructive mt-1">
                            Erro: {log.errorMessage}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum histórico</p>
                  <p className="text-sm mt-1">
                    As atividades de sincronização aparecerão aqui
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
