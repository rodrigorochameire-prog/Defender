import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/CustomSelect";
import { SyncStatusIndicator } from "@/components/agenda/sync-status-indicator";
import { SyncConflictResolver } from "@/components/agenda/sync-conflict-resolver";
import { SyncHistoryModal } from "@/components/agenda/sync-history-modal";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Link,
  Unlink,
  Settings,
  Gavel,
  Home,
  Lock,
  Folder,
  Shield,
  Scale,
  Users,
  Clock,
  Zap,
  History,
  PlayCircle,
  PauseCircle,
  Activity,
  TrendingUp,
  Download,
  Upload,
  ArrowLeftRight,
} from "lucide-react";

interface GoogleCalendarConfig {
  connected: boolean;
  email: string;
  calendars: {
    id: string;
    name: string;
    atribuicao: string;
    color: string;
    syncEnabled: boolean;
  }[];
  syncInterval: string;
  autoImport: boolean;
  twoWaySync: boolean;
  lastSync: string | null;
}

interface GoogleCalendarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GoogleCalendarConfig) => void;
  currentConfig?: GoogleCalendarConfig;
}

const atribuicaoOptions = [
  { value: "tribunal-do-juri", label: "Tribunal do Júri", icon: Gavel },
  { value: "violencia-domestica", label: "Violência Doméstica", icon: Home },
  { value: "execucao-penal", label: "Execução Penal", icon: Lock },
  { value: "criminal-geral", label: "Criminal Geral", icon: Folder },
  { value: "substituicao", label: "Substituição", icon: RefreshCw },
  { value: "curadoria", label: "Curadoria Especial", icon: Shield },
  { value: "geral", label: "Geral", icon: Scale },
];

const syncIntervalOptions = [
  { value: "5min", label: "A cada 5 minutos" },
  { value: "15min", label: "A cada 15 minutos" },
  { value: "30min", label: "A cada 30 minutos" },
  { value: "1h", label: "A cada 1 hora" },
  { value: "manual", label: "Apenas manual" },
];

const colorOptions = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#10B981", label: "Verde" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#EC4899", label: "Rosa" },
  { value: "#06B6D4", label: "Ciano" },
  { value: "#6B7280", label: "Cinza" },
];

export function GoogleCalendarConfigModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
}: GoogleCalendarConfigModalProps) {
  const [config, setConfig] = useState<GoogleCalendarConfig>(
    currentConfig || {
      connected: false,
      email: "",
      calendars: [],
      syncInterval: "15min",
      autoImport: true,
      twoWaySync: true,
      lastSync: null,
    }
  );

  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Simular conexão com Google Calendar
  const handleConnect = async () => {
    setIsConnecting(true);

    // Simular autenticação OAuth
    setTimeout(() => {
      const mockCalendars = [
        {
          id: "primary",
          name: "Principal",
          atribuicao: "geral",
          color: "#3B82F6",
          syncEnabled: true,
        },
        {
          id: "calendar-juri",
          name: "Júri - Defensoria",
          atribuicao: "tribunal-do-juri",
          color: "#10B981",
          syncEnabled: true,
        },
        {
          id: "calendar-vd",
          name: "Violência Doméstica",
          atribuicao: "violencia-domestica",
          color: "#F59E0B",
          syncEnabled: true,
        },
        {
          id: "calendar-ep",
          name: "Execução Penal",
          atribuicao: "execucao-penal",
          color: "#8B5CF6",
          syncEnabled: true,
        },
      ];

      setConfig((prev) => ({
        ...prev,
        connected: true,
        email: "defensor@defensoria.ba.gov.br",
        calendars: mockCalendars,
        lastSync: new Date().toISOString(),
      }));

      toast.success("Conectado ao Google Calendar!", {
        description: `${mockCalendars.length} calendários encontrados`,
      });

      setIsConnecting(false);
    }, 2000);
  };

  const handleDisconnect = () => {
    if (confirm("Deseja realmente desconectar do Google Calendar?")) {
      setConfig({
        connected: false,
        email: "",
        calendars: [],
        syncInterval: "15min",
        autoImport: true,
        twoWaySync: true,
        lastSync: null,
      });
      toast.success("Desconectado do Google Calendar");
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);

    setTimeout(() => {
      setConfig((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));

      toast.success("Sincronização concluída!", {
        description: "Todos os eventos foram atualizados",
      });

      setIsSyncing(false);
    }, 1500);
  };

  const handleSave = () => {
    onSave(config);
    toast.success("Configurações salvas!");
    onClose();
  };

  const handleToggleCalendar = (calendarId: string) => {
    setConfig((prev) => ({
      ...prev,
      calendars: prev.calendars.map((cal) =>
        cal.id === calendarId ? { ...cal, syncEnabled: !cal.syncEnabled } : cal
      ),
    }));
  };

  const handleChangeCalendarAtribuicao = (calendarId: string, atribuicao: string) => {
    setConfig((prev) => ({
      ...prev,
      calendars: prev.calendars.map((cal) =>
        cal.id === calendarId ? { ...cal, atribuicao } : cal
      ),
    }));
  };

  const handleChangeCalendarColor = (calendarId: string, color: string) => {
    setConfig((prev) => ({
      ...prev,
      calendars: prev.calendars.map((cal) =>
        cal.id === calendarId ? { ...cal, color } : cal
      ),
    }));
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return "Nunca sincronizado";
    const date = new Date(lastSync);
    return `${date.toLocaleDateString("pt-BR")} às ${date.toLocaleTimeString("pt-BR")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Integração com Google Calendar
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Sincronize eventos entre Ombuds e suas agendas do Google Calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status da Conexão */}
          {!config.connected ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
                      Conecte sua conta do Google
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                      Sincronize automaticamente suas audiências, júris e atendimentos entre o
                      Ombuds e o Google Calendar. Mantenha todas as suas agendas sempre
                      atualizadas.
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 mb-4">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Sincronização automática em tempo real
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Suporte para múltiplas agendas por atribuição
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Atualização bidirecional (Ombuds ↔ Google)
                      </li>
                    </ul>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Link className="w-4 h-4 mr-2" />
                          Conectar com Google
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Conta Conectada */}
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-100">
                        Conectado
                      </p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        {config.email}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <Unlink className="w-4 h-4 mr-2" />
                    Desconectar
                  </Button>
                </div>
              </div>

              {/* Configurações de Sincronização */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Configurações de Sincronização
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Intervalo de Sincronização</Label>
                    <CustomSelect
                      options={syncIntervalOptions}
                      value={config.syncInterval}
                      onChange={(value) => setConfig({ ...config, syncInterval: value })}
                      placeholder="Selecione o intervalo"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleSyncNow}
                      disabled={isSyncing}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Sincronizar Agora
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, autoImport: !config.autoImport })}
                      className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          config.autoImport
                            ? "bg-blue-600 border-blue-600"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {config.autoImport && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span>Importar automaticamente novos eventos do Google Calendar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, twoWaySync: !config.twoWaySync })}
                      className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          config.twoWaySync
                            ? "bg-blue-600 border-blue-600"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {config.twoWaySync && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <span>Sincronização bidirecional (eventos criados no Ombuds vão para o Google)</span>
                    </button>
                  </div>
                </div>

                {config.lastSync && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Última sincronização: {formatLastSync(config.lastSync)}
                  </p>
                )}
              </div>

              {/* Calendários */}
              <div className="space-y-4">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Calendários Sincronizados ({config.calendars.length})
                </h3>

                <div className="space-y-3">
                  {config.calendars.map((calendar) => {
                    const AtribuicaoIcon =
                      atribuicaoOptions.find((opt) => opt.value === calendar.atribuicao)?.icon ||
                      Scale;

                    return (
                      <div
                        key={calendar.id}
                        className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: calendar.color + "20" }}
                          >
                            <AtribuicaoIcon
                              className="w-5 h-5"
                              style={{ color: calendar.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-50">
                                  {calendar.name}
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                  ID: {calendar.id}
                                </p>
                              </div>
                              <button
                                onClick={() => handleToggleCalendar(calendar.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                  calendar.syncEnabled
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                    : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                                }`}
                              >
                                {calendar.syncEnabled ? "Ativo" : "Inativo"}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">Atribuição</Label>
                                <CustomSelect
                                  options={atribuicaoOptions}
                                  value={calendar.atribuicao}
                                  onChange={(value) =>
                                    handleChangeCalendarAtribuicao(calendar.id, value)
                                  }
                                  placeholder="Selecione"
                                />
                              </div>

                              <div>
                                <Label className="text-xs">Cor</Label>
                                <div className="flex gap-2">
                                  {colorOptions.map((colorOption) => (
                                    <button
                                      key={colorOption.value}
                                      onClick={() =>
                                        handleChangeCalendarColor(calendar.id, colorOption.value)
                                      }
                                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                                        calendar.color === colorOption.value
                                          ? "border-zinc-900 dark:border-zinc-100 scale-110"
                                          : "border-transparent hover:scale-105"
                                      }`}
                                      style={{ backgroundColor: colorOption.value }}
                                      title={colorOption.label}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            {config.connected && (
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}