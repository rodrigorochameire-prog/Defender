"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Users, ArrowLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc/client";
import { useDefensor } from "@/contexts/defensor-context";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsViewingAsPeer } from "@/hooks/use-is-viewing-as-peer";

type Peer = {
  id: number;
  name: string;
  comarcaId: number | null;
};

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function shortName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}

export function PeerSwitcherSection() {
  const { user } = usePermissions();
  const { selectedDefensorId, setSelectedDefensorId, setDefensores } = useDefensor();
  const isViewingAsPeer = useIsViewingAsPeer();

  const isAdmin = user?.role === "admin";

  const { data, isLoading } = trpc.users.workspaceDefensores.useQuery(undefined, {
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Popular o DefensorContext com a lista para que selectedDefensor (nome) fique disponível
  // em qualquer consumidor de useDefensor(). O antigo DefensorSwitcher fazia isso.
  useEffect(() => {
    if (data) {
      setDefensores(data.map((d) => ({ id: d.id, name: d.name })));
    }
  }, [data, setDefensores]);

  const { localPeers, otherPeers, showSubgroups } = useMemo(() => {
    if (!data || !user) {
      return {
        localPeers: [] as Peer[],
        otherPeers: [] as Peer[],
        showSubgroups: false,
      };
    }
    const myComarca = (user as any).comarcaId ?? null;
    const filtered = data.filter((d) => d.id !== user.id);
    const local = filtered.filter((d) => d.comarcaId === myComarca);
    const other = filtered.filter((d) => d.comarcaId !== myComarca);
    return {
      localPeers: local,
      otherPeers: other,
      showSubgroups: local.length > 0 && other.length > 0,
    };
  }, [data, user]);

  if (!isAdmin) return null;
  if (isLoading) return null;
  if (!data || data.length <= 1) return null;

  const allPeers = [...localPeers, ...otherPeers];

  return (
    <div className="px-3 pb-2">
      <Collapsible>
        <CollapsibleTrigger className="w-full pt-2 border-t border-border flex items-center justify-between group">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3 h-3" />
            Outros defensores
          </p>
          <ChevronRight className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {showSubgroups ? (
            <>
              {localPeers.length > 0 && (
                <PeerGroup
                  label="Camaçari"
                  peers={localPeers}
                  selectedId={selectedDefensorId}
                  onSelect={setSelectedDefensorId}
                />
              )}
              {otherPeers.length > 0 && (
                <PeerGroup
                  label="RMS"
                  peers={otherPeers}
                  selectedId={selectedDefensorId}
                  onSelect={setSelectedDefensorId}
                />
              )}
            </>
          ) : (
            <PeerGroup
              label="Colegas"
              peers={allPeers}
              selectedId={selectedDefensorId}
              onSelect={setSelectedDefensorId}
            />
          )}
          {isViewingAsPeer && (
            <button
              onClick={() => setSelectedDefensorId(null)}
              className="w-full py-2 px-3 mt-2 rounded-md bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 flex items-center gap-2 text-[11px] font-medium text-amber-900 dark:text-amber-200 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Voltar ao meu perfil
            </button>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function PeerGroup({
  label,
  peers,
  selectedId,
  onSelect,
}: {
  label: string;
  peers: Peer[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}) {
  return (
    <div>
      <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider px-1 pb-1">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-1">
        {peers.map((peer) => {
          const isActive = selectedId === peer.id;
          return (
            <button
              key={peer.id}
              onClick={() => onSelect(peer.id)}
              className={cn(
                "py-1.5 px-1 rounded-md transition-all duration-150 text-center",
                isActive
                  ? "bg-neutral-100 dark:bg-neutral-800 ring-1 ring-neutral-300 dark:ring-neutral-600"
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              )}
            >
              <div className="w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] mx-auto mb-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
                {getInitial(peer.name)}
              </div>
              <p className="text-[9px] font-medium text-muted-foreground truncate">
                {shortName(peer.name)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
