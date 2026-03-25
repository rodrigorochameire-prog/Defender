"use client";

import { useState, useEffect, useRef } from "react";
import { WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface DisconnectBannerProps {
  configId: number;
}

const STATUS_CHECK_INTERVAL = 30_000; // 30 seconds
const DISCONNECT_THRESHOLD_MS = 30_000; // show banner after 30s disconnected

export function DisconnectBanner({ configId }: DisconnectBannerProps) {
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const reconnectMutation = trpc.whatsappChat.restart.useMutation();

  const { data: status } = trpc.whatsappChat.getConnectionStatus.useQuery(
    { configId },
    { refetchInterval: STATUS_CHECK_INTERVAL }
  );

  const prevStateRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!status) return;

    const isConnected = status.state === "open";
    const prevState = prevStateRef.current;
    prevStateRef.current = status.state;

    if (!isConnected) {
      if (disconnectedSince === null) {
        setDisconnectedSince(Date.now());
      }
    } else {
      // Reconnected — fade out
      if (disconnectedSince !== null || prevState !== "open") {
        setDisconnectedSince(null);
        if (visible) {
          setFadingOut(true);
          setTimeout(() => {
            setVisible(false);
            setFadingOut(false);
          }, 300);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (disconnectedSince === null) return;
    const elapsed = Date.now() - disconnectedSince;
    if (elapsed >= DISCONNECT_THRESHOLD_MS) {
      setVisible(true);
      return;
    }
    const remaining = DISCONNECT_THRESHOLD_MS - elapsed;
    const timer = setTimeout(() => setVisible(true), remaining);
    return () => clearTimeout(timer);
  }, [disconnectedSince]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 gap-3",
        "transition-opacity duration-300",
        fadingOut ? "opacity-0" : "opacity-100"
      )}
      style={{
        backgroundColor: '#fdf3d2',
        borderBottom: '1px solid #e8d48b',
      }}
    >
      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span className="text-xs font-medium">Conexao perdida com o WhatsApp</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 hover:text-amber-900 dark:hover:text-amber-100 shrink-0"
        disabled={reconnectMutation.isPending}
        onClick={() => reconnectMutation.mutate({ configId })}
      >
        {reconnectMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          "Reconectar"
        )}
      </Button>
    </div>
  );
}
