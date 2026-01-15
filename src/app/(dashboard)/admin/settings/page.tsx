"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Settings, 
  Zap, 
  Flag, 
  Sliders, 
  Plus, 
  Trash2, 
  Edit, 
  Play, 
  Pause,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  History,
  ChevronRight,
  Tag,
  Syringe,
  CreditCard,
  Package,
  Bell,
  Calendar,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const FLAG_COLORS = [
  { value: "red", label: "Vermelho", class: "bg-red-500" },
  { value: "orange", label: "Laranja", class: "bg-orange-500" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "purple", label: "Roxo", class: "bg-purple-500" },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("thresholds");
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: settings, isLoading: settingsLoading } = trpc.businessRules.listSettings.useQuery();
  const { data: rules, isLoading: rulesLoading } = trpc.businessRules.listRules.useQuery();
  const { data: flags, isLoading: flagsLoading } = trpc.businessRules.listFlags.useQuery();
  const { data: metadata } = trpc.businessRules.getRuleBuilderMetadata.useQuery();
  const { data: executionHistory } = trpc.businessRules.getExecutionHistory.useQuery({ limit: 20 });

  // Mutations
  const initSettings = trpc.businessRules.initializeDefaultSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações padrão inicializadas!");
      utils.businessRules.listSettings.invalidate();
    },
  });

  const updateSetting = trpc.businessRules.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Configuração salva!");
      utils.businessRules.listSettings.invalidate();
    },
  });

  const createRule = trpc.businessRules.createRule.useMutation({
    onSuccess: () => {
      toast.success("Regra criada!");
      setIsRuleDialogOpen(false);
      utils.businessRules.listRules.invalidate();
    },
  });

  const updateRule = trpc.businessRules.updateRule.useMutation({
    onSuccess: () => {
      toast.success("Regra atualizada!");
      utils.businessRules.listRules.invalidate();
    },
  });

  const deleteRule = trpc.businessRules.deleteRule.useMutation({
    onSuccess: () => {
      toast.success("Regra excluída!");
      utils.businessRules.listRules.invalidate();
    },
  });

  const createFlag = trpc.businessRules.createFlag.useMutation({
    onSuccess: () => {
      toast.success("Flag criada!");
      setIsFlagDialogOpen(false);
      utils.businessRules.listFlags.invalidate();
    },
  });

  // Agrupar settings por categoria
  const settingsByCategory = settings?.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, typeof settings>) || {};

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "thresholds": return <Sliders className="h-5 w-5" />;
      case "scheduling": return <Calendar className="h-5 w-5" />;
      case "notifications": return <Bell className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "thresholds": return "Limites e Alertas";
      case "scheduling": return "Agendamento";
      case "notifications": return "Notificações";
      default: return category;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Motor de regras de negócio e automações</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="thresholds" className="gap-2">
            <Sliders className="h-4 w-4" />
            Limites
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Zap className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="flags" className="gap-2">
            <Flag className="h-4 w-4" />
            Flags
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* TAB: THRESHOLDS */}
        <TabsContent value="thresholds" className="space-y-6">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !settings || settings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma configuração encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  Clique no botão abaixo para inicializar as configurações padrão
                </p>
                <Button onClick={() => initSettings.mutate()} disabled={initSettings.isPending}>
                  {initSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inicializar Configurações
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(settingsByCategory).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </CardTitle>
                  <CardDescription>
                    Configure os parâmetros de {getCategoryLabel(category).toLowerCase()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {categorySettings?.map((setting) => (
                      <div key={setting.key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={setting.key}>{setting.label}</Label>
                          {setting.description && (
                            <span className="text-xs text-muted-foreground">{setting.description}</span>
                          )}
                        </div>
                        
                        {setting.dataType === "boolean" ? (
                          <div className="flex items-center gap-2">
                            <Switch
                              id={setting.key}
                              checked={setting.parsedValue}
                              onCheckedChange={(checked) => {
                                updateSetting.mutate({ key: setting.key, value: checked });
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              {setting.parsedValue ? "Ativado" : "Desativado"}
                            </span>
                          </div>
                        ) : setting.dataType === "number" ? (
                          <div className="flex items-center gap-2">
                            <Input
                              id={setting.key}
                              type="number"
                              defaultValue={setting.parsedValue}
                              className="w-24"
                              onBlur={(e) => {
                                const value = parseInt(e.target.value);
                                if (value !== setting.parsedValue) {
                                  updateSetting.mutate({ key: setting.key, value });
                                }
                              }}
                            />
                            {setting.key.includes("days") && <span className="text-sm text-muted-foreground">dias</span>}
                            {setting.key.includes("credits") && <span className="text-sm text-muted-foreground">créditos</span>}
                            {setting.key.includes("capacity") && <span className="text-sm text-muted-foreground">pets</span>}
                            {setting.key.includes("variation") && <span className="text-sm text-muted-foreground">%</span>}
                          </div>
                        ) : (
                          <Input
                            id={setting.key}
                            defaultValue={setting.parsedValue}
                            onBlur={(e) => {
                              if (e.target.value !== setting.parsedValue) {
                                updateSetting.mutate({ key: setting.key, value: e.target.value });
                              }
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB: REGRAS */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Regras de Automação</h2>
              <p className="text-muted-foreground">Configure ações automáticas baseadas em condições</p>
            </div>
            <Button onClick={() => { setEditingRule(null); setIsRuleDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>

          {rulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !rules || rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma regra configurada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie regras de automação para agilizar a gestão
                </p>
                <Button onClick={() => setIsRuleDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Regra
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${rule.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                          <Zap className={`h-5 w-5 ${rule.isActive ? "text-green-600" : "text-gray-400"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{rule.name}</h3>
                            <Badge variant={rule.isActive ? "default" : "secondary"}>
                              {rule.isActive ? "Ativa" : "Inativa"}
                            </Badge>
                            <Badge variant="outline">Prioridade: {rule.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Se:</strong> {rule.triggerField} {rule.triggerCondition} {rule.triggerValue}
                            {" → "}
                            <strong>Então:</strong> {rule.actionType}
                          </p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right text-xs text-muted-foreground mr-4">
                          <div>Executada {rule.executionCount}x</div>
                          {rule.lastExecutedAt && (
                            <div>Última: {formatDistanceToNow(new Date(rule.lastExecutedAt), { locale: ptBR, addSuffix: true })}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateRule.mutate({ id: rule.id, isActive: !rule.isActive })}
                        >
                          {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setEditingRule(rule); setIsRuleDialogOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Excluir esta regra?")) {
                              deleteRule.mutate({ id: rule.id });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: FLAGS */}
        <TabsContent value="flags" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Flags Dinâmicas</h2>
              <p className="text-muted-foreground">Etiquetas visuais que aparecem em todo o sistema</p>
            </div>
            <Button onClick={() => setIsFlagDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Flag
            </Button>
          </div>

          {flagsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !flags || flags.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma flag criada</h3>
                <p className="text-muted-foreground mb-4">
                  Crie flags para identificar visualmente situações especiais
                </p>
                <Button onClick={() => setIsFlagDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Flag
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {flags.map((flag) => (
                <Card key={flag.id} className={!flag.isActive ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${FLAG_COLORS.find(c => c.value === flag.color)?.class || "bg-gray-500"}`} />
                        <div>
                          <h3 className="font-semibold">{flag.name}</h3>
                          {flag.description && (
                            <p className="text-xs text-muted-foreground">{flag.description}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant={flag.isActive ? "default" : "secondary"}>
                        {flag.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {flag.showOnCheckin && <Badge variant="outline" className="text-xs">Check-in</Badge>}
                      {flag.showOnCalendar && <Badge variant="outline" className="text-xs">Calendário</Badge>}
                      {flag.showOnPetCard && <Badge variant="outline" className="text-xs">Card Pet</Badge>}
                      {flag.showOnDailyLog && <Badge variant="outline" className="text-xs">Log Diário</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: HISTÓRICO */}
        <TabsContent value="history" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold">Histórico de Execução</h2>
            <p className="text-muted-foreground">Log das regras executadas automaticamente</p>
          </div>

          {!executionHistory || executionHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma execução registrada</h3>
                <p className="text-muted-foreground">
                  O histórico aparecerá aqui quando as regras forem executadas
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-3">
                  {executionHistory.map((log) => (
                    <div 
                      key={log.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        log.success ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {log.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{log.ruleName}</p>
                          <p className="text-sm text-muted-foreground">
                            Pet: {log.petName || "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">
                          {format(new Date(log.executedAt), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                        {log.errorMessage && (
                          <p className="text-xs text-red-600">{log.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog: Nova/Editar Regra */}
      <RuleDialog
        open={isRuleDialogOpen}
        onOpenChange={setIsRuleDialogOpen}
        rule={editingRule}
        metadata={metadata}
        onSave={(data) => {
          if (editingRule) {
            updateRule.mutate({ id: editingRule.id, ...data });
          } else {
            createRule.mutate(data);
          }
        }}
        isPending={createRule.isPending || updateRule.isPending}
      />

      {/* Dialog: Nova Flag */}
      <FlagDialog
        open={isFlagDialogOpen}
        onOpenChange={setIsFlagDialogOpen}
        onSave={(data) => createFlag.mutate(data)}
        isPending={createFlag.isPending}
      />
    </div>
  );
}

// Componente Dialog para Regras
function RuleDialog({
  open,
  onOpenChange,
  rule,
  metadata,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: any;
  metadata: any;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [priority, setPriority] = useState(rule?.priority || 0);
  const [triggerType, setTriggerType] = useState(rule?.triggerType || "pet_field_change");
  const [triggerField, setTriggerField] = useState(rule?.triggerField || "");
  const [triggerCondition, setTriggerCondition] = useState(rule?.triggerCondition || "equals");
  const [triggerValue, setTriggerValue] = useState(rule?.triggerValue || "");
  const [actionType, setActionType] = useState(rule?.actionType || "create_alert");
  const [actionConfig, setActionConfig] = useState(rule?.actionConfigParsed || {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Regra de Automação"}</DialogTitle>
          <DialogDescription>
            Configure o gatilho e a ação que será executada automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome e Descrição */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Regra *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alerta de vacina vencida"
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que esta regra faz..."
              rows={2}
            />
          </div>

          {/* Gatilho */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                Gatilho (SE...)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo de Gatilho</Label>
                  <Select value={triggerType} onValueChange={setTriggerType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {metadata?.triggerTypes?.map((t: any) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Campo</Label>
                  <Select value={triggerField} onValueChange={setTriggerField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {metadata?.petFields?.map((f: any) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Condição</Label>
                  <Select value={triggerCondition} onValueChange={setTriggerCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {metadata?.conditions?.map((c: any) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    value={triggerValue}
                    onChange={(e) => setTriggerValue(e.target.value)}
                    placeholder="Valor para comparação"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ação */}
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-green-600" />
                Ação (ENTÃO...)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Ação</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {metadata?.actionTypes?.map((a: any) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {actionType === "create_alert" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tipo do Alerta</Label>
                    <Select 
                      value={actionConfig.alertType || "behavior"} 
                      onValueChange={(v) => setActionConfig({ ...actionConfig, alertType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="behavior">Comportamento</SelectItem>
                        <SelectItem value="health">Saúde</SelectItem>
                        <SelectItem value="feeding">Alimentação</SelectItem>
                        <SelectItem value="financial">Financeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severidade</Label>
                    <Select 
                      value={actionConfig.severity || "warning"} 
                      onValueChange={(v) => setActionConfig({ ...actionConfig, severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Informação</SelectItem>
                        <SelectItem value="warning">Aviso</SelectItem>
                        <SelectItem value="critical">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Título do Alerta</Label>
                    <Input
                      value={actionConfig.title || ""}
                      onChange={(e) => setActionConfig({ ...actionConfig, title: e.target.value })}
                      placeholder="Título que aparecerá no alerta"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave({
              name,
              description,
              priority,
              triggerType,
              triggerField,
              triggerCondition,
              triggerValue,
              actionType,
              actionConfig,
            })}
            disabled={!name || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {rule ? "Salvar" : "Criar Regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente Dialog para Flags
function FlagDialog({
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<"red" | "orange" | "yellow" | "green" | "blue" | "purple">("yellow");
  const [description, setDescription] = useState("");
  const [showOnCheckin, setShowOnCheckin] = useState(true);
  const [showOnCalendar, setShowOnCalendar] = useState(true);
  const [showOnPetCard, setShowOnPetCard] = useState(true);
  const [showOnDailyLog, setShowOnDailyLog] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Flag</DialogTitle>
          <DialogDescription>
            Crie uma etiqueta visual para identificar situações especiais
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Atenção Alimentar"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {FLAG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`w-8 h-8 rounded-full ${c.class} ${
                    color === c.value ? "ring-2 ring-offset-2 ring-primary" : ""
                  }`}
                  onClick={() => setColor(c.value as typeof color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Quando esta flag deve ser usada..."
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Onde exibir:</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={showOnCheckin} onCheckedChange={setShowOnCheckin} />
                <span className="text-sm">Check-in</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showOnCalendar} onCheckedChange={setShowOnCalendar} />
                <span className="text-sm">Calendário</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showOnPetCard} onCheckedChange={setShowOnPetCard} />
                <span className="text-sm">Card do Pet</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={showOnDailyLog} onCheckedChange={setShowOnDailyLog} />
                <span className="text-sm">Log Diário</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => onSave({
              name,
              color,
              description,
              showOnCheckin,
              showOnCalendar,
              showOnPetCard,
              showOnDailyLog,
            })}
            disabled={!name || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar Flag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
