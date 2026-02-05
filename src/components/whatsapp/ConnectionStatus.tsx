"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RefreshCw,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  configId: number;
}

export function ConnectionStatus({ configId }: ConnectionStatusProps) {
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Query de status
  const {
    data: connectionStatus,
    isLoading: loadingStatus,
    refetch: refetchStatus,
  } = trpc.whatsappChat.getConnectionStatus.useQuery(
    { configId },
    {
      refetchInterval: 10000, // Atualiza a cada 10s
    }
  );

  // Query de QR Code
  const {
    data: qrCodeData,
    isLoading: loadingQR,
    refetch: refetchQR,
  } = trpc.whatsappChat.getQRCode.useQuery(
    { configId },
    {
      enabled: isQRDialogOpen && connectionStatus?.state !== "open",
      refetchInterval: isQRDialogOpen ? 20000 : false, // Atualiza QR a cada 20s
    }
  );

  // Mutations
  const logoutMutation = trpc.whatsappChat.logout.useMutation({
    onSuccess: () => {
      toast.success("Desconectado com sucesso");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Erro ao desconectar: ${error.message}`);
    },
  });

  const restartMutation = trpc.whatsappChat.restart.useMutation({
    onSuccess: () => {
      toast.success("Instância reiniciada");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Erro ao reiniciar: ${error.message}`);
    },
  });

  // Helpers
  const getStatusInfo = () => {
    if (loadingStatus) {
      return {
        label: "Verificando...",
        variant: "secondary" as const,
        icon: Loader2,
        iconClass: "animate-spin",
      };
    }

    switch (connectionStatus?.state) {
      case "open":
        return {
          label: "Conectado",
          variant: "default" as const,
          icon: Wifi,
          iconClass: "text-green-500",
        };
      case "connecting":
        return {
          label: "Conectando...",
          variant: "secondary" as const,
          icon: Loader2,
          iconClass: "animate-spin",
        };
      case "refused":
        return {
          label: "Erro de conexão",
          variant: "destructive" as const,
          icon: AlertCircle,
          iconClass: "",
        };
      case "close":
      default:
        return {
          label: "Desconectado",
          variant: "outline" as const,
          icon: WifiOff,
          iconClass: "text-muted-foreground",
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const handleOpenQRDialog = () => {
    setIsQRDialogOpen(true);
    if (connectionStatus?.state !== "open") {
      refetchQR();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Badge de status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={statusInfo.variant}
              className={cn(
                "cursor-pointer flex items-center gap-1",
                connectionStatus?.state === "open" && "bg-green-500 hover:bg-green-600"
              )}
              onClick={handleOpenQRDialog}
            >
              <StatusIcon className={cn("h-3 w-3", statusInfo.iconClass)} />
              {statusInfo.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {connectionStatus?.state === "open"
              ? "WhatsApp conectado. Clique para ver opções."
              : "Clique para conectar via QR Code"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dialog de conexão */}
      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Conexão WhatsApp
            </DialogTitle>
            <DialogDescription>
              {connectionStatus?.state === "open"
                ? "Seu WhatsApp está conectado e funcionando."
                : "Escaneie o QR Code com seu WhatsApp para conectar."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4">
            {connectionStatus?.state === "open" ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-green-100 dark:bg-green-900">
                  <Wifi className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-center text-muted-foreground">
                  WhatsApp conectado e pronto para uso
                </p>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => restartMutation.mutate({ configId })}
                    disabled={restartMutation.isPending}
                  >
                    {restartMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Reiniciar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => logoutMutation.mutate({ configId })}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : loadingQR ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCodeData?.base64 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <img
                    src={
                      qrCodeData.base64.startsWith("data:")
                        ? qrCodeData.base64
                        : `data:image/png;base64,${qrCodeData.base64}`
                    }
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Abra o WhatsApp no seu celular e escaneie este código
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetchQR()}
                  disabled={loadingQR}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Atualizar QR Code
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <QrCode className="h-16 w-16 text-muted-foreground" />
                <p className="text-center text-muted-foreground">
                  Não foi possível gerar o QR Code. Tente novamente.
                </p>
                <Button onClick={() => refetchQR()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>

          {connectionStatus?.state !== "open" && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Como conectar:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra o WhatsApp no seu celular</li>
                <li>Toque em Menu ou Configurações</li>
                <li>Selecione &quot;Aparelhos conectados&quot;</li>
                <li>Toque em &quot;Conectar um aparelho&quot;</li>
                <li>Aponte a câmera para o QR Code acima</li>
              </ol>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
