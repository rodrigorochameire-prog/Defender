"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Edit,
  Gavel,
  History,
  Lightbulb,
  MapPin,
  MessageSquare,
  Plus,
  Save,
  Scale,
  Star,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PerfilMagistrado {
  id?: number;
  nome: string;
  tipo: "juiz" | "promotor" | "defensor" | "oficial";
  vara?: string;
  comarca?: string;
  estiloAtuacao?: string;
  pontosFortes?: string;
  pontosFracos?: string;
  tendenciasObservadas?: string;
  estrategiasRecomendadas?: string;
  totalSessoes?: number;
  historico?: HistoricoSessao[];
}

interface HistoricoSessao {
  data: string;
  processo?: string;
  resultado: "absolvicao" | "condenacao" | "desclassificacao" | "nulidade";
  observacoes?: string;
}

interface PerfilMagistradoProps {
  perfil?: PerfilMagistrado;
  onSave?: (perfil: PerfilMagistrado) => Promise<void>;
  onAddObservacao?: (observacao: string) => Promise<void>;
  readOnly?: boolean;
}

// Configuração de tendências comuns
const TENDENCIAS_COMUNS = [
  { id: "rigoroso_procedimentos", label: "Rigoroso com procedimentos", tipo: "neutro" },
  { id: "favoravel_defesa", label: "Geralmente favoravel a defesa", tipo: "positivo" },
  { id: "favoravel_acusacao", label: "Geralmente favoravel a acusacao", tipo: "negativo" },
  { id: "aceita_teses_alternativas", label: "Aberto a teses alternativas", tipo: "positivo" },
  { id: "impaciente_sustentacao", label: "Impaciente com sustentacoes longas", tipo: "negativo" },
  { id: "tecnico", label: "Perfil muito tecnico", tipo: "neutro" },
  { id: "emocional", label: "Sensivel a argumentos emocionais", tipo: "positivo" },
  { id: "interrompe_muito", label: "Interrompe frequentemente", tipo: "negativo" },
  { id: "permite_debate", label: "Permite debates entre partes", tipo: "positivo" },
  { id: "penas_altas", label: "Tendencia a penas mais altas", tipo: "negativo" },
  { id: "penas_baixas", label: "Tendencia a penas mais brandas", tipo: "positivo" },
];

const ESTRATEGIAS_SUGERIDAS = [
  "Ser objetivo e direto nas sustentacoes",
  "Preparar fundamentacao juridica solida",
  "Destacar atenuantes logo no inicio",
  "Evitar confrontos diretos com o juiz",
  "Usar jurisprudencia do proprio tribunal",
  "Focar em argumentos tecnicos",
  "Usar argumentos emocionais com moderacao",
  "Preparar perguntas curtas e objetivas",
  "Evitar repeticoes na sustentacao",
  "Destacar a versao do reu desde o inicio",
];

export function PerfilMagistrado({
  perfil,
  onSave,
  onAddObservacao,
  readOnly = false,
}: PerfilMagistradoProps) {
  const [editMode, setEditMode] = useState(!perfil);
  const [formData, setFormData] = useState<PerfilMagistrado>(
    perfil || {
      nome: "",
      tipo: "juiz",
      vara: "",
      comarca: "",
      estiloAtuacao: "",
      pontosFortes: "",
      pontosFracos: "",
      tendenciasObservadas: "",
      estrategiasRecomendadas: "",
      totalSessoes: 0,
      historico: [],
    }
  );
  const [saving, setSaving] = useState(false);
  const [novaObservacao, setNovaObservacao] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Calcular estatísticas do histórico
  const estatisticas = formData.historico?.reduce(
    (acc, sessao) => {
      acc.total++;
      if (sessao.resultado === "absolvicao") acc.absolvicoes++;
      if (sessao.resultado === "condenacao") acc.condenacoes++;
      if (sessao.resultado === "desclassificacao") acc.desclassificacoes++;
      if (sessao.resultado === "nulidade") acc.nulidades++;
      return acc;
    },
    { total: 0, absolvicoes: 0, condenacoes: 0, desclassificacoes: 0, nulidades: 0 }
  ) || { total: 0, absolvicoes: 0, condenacoes: 0, desclassificacoes: 0, nulidades: 0 };

  const taxaFavoravel =
    estatisticas.total > 0
      ? Math.round(
          ((estatisticas.absolvicoes + estatisticas.desclassificacoes) / estatisticas.total) * 100
        )
      : 0;

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(formData);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddObservacao = async () => {
    if (!onAddObservacao || !novaObservacao.trim()) return;
    setSaving(true);
    try {
      await onAddObservacao(novaObservacao);
      setNovaObservacao("");
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof PerfilMagistrado, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Gavel className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {editMode ? (
                  <Input
                    value={formData.nome}
                    onChange={(e) => updateField("nome", e.target.value)}
                    placeholder="Nome do magistrado"
                    className="text-lg font-semibold h-8"
                  />
                ) : (
                  formData.nome || "Novo Magistrado"
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {editMode ? (
                  <Select
                    value={formData.tipo}
                    onValueChange={(v) => updateField("tipo", v as PerfilMagistrado["tipo"])}
                  >
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="juiz">Juiz</SelectItem>
                      <SelectItem value="promotor">Promotor</SelectItem>
                      <SelectItem value="defensor">Defensor</SelectItem>
                      <SelectItem value="oficial">Oficial</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    {formData.tipo === "juiz" ? "Juiz(a)" : formData.tipo}
                  </Badge>
                )}
                {formData.vara && (
                  <span className="text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {formData.vara}
                    {formData.comarca && ` - ${formData.comarca}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!readOnly && !editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {editMode && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="perfil" className="space-y-4">
          <TabsList>
            <TabsTrigger value="perfil">
              <User className="h-4 w-4 mr-1" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="estatisticas">
              <BarChart3 className="h-4 w-4 mr-1" />
              Estatisticas
            </TabsTrigger>
            <TabsTrigger value="estrategia">
              <Target className="h-4 w-4 mr-1" />
              Estrategia
            </TabsTrigger>
            <TabsTrigger value="historico">
              <History className="h-4 w-4 mr-1" />
              Historico
            </TabsTrigger>
          </TabsList>

          {/* ABA PERFIL */}
          <TabsContent value="perfil" className="space-y-4">
            {/* Vara e Comarca */}
            {editMode && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vara</Label>
                  <Input
                    value={formData.vara || ""}
                    onChange={(e) => updateField("vara", e.target.value)}
                    placeholder="Ex: 1a Vara Criminal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comarca</Label>
                  <Input
                    value={formData.comarca || ""}
                    onChange={(e) => updateField("comarca", e.target.value)}
                    placeholder="Ex: Sao Paulo"
                  />
                </div>
              </div>
            )}

            {/* Estilo de Atuação */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-600" />
                Estilo de Atuacao
              </Label>
              {editMode ? (
                <Textarea
                  value={formData.estiloAtuacao || ""}
                  onChange={(e) => updateField("estiloAtuacao", e.target.value)}
                  placeholder="Descreva o estilo de atuacao do magistrado em audiencias e julgamentos..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
                  {formData.estiloAtuacao || "Nenhuma informacao registrada"}
                </p>
              )}
            </div>

            {/* Pontos Fortes e Fracos */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-green-600">
                  <ThumbsUp className="h-4 w-4" />
                  Pontos a Favor da Defesa
                </Label>
                {editMode ? (
                  <Textarea
                    value={formData.pontosFortes || ""}
                    onChange={(e) => updateField("pontosFortes", e.target.value)}
                    placeholder="Aspectos que geralmente favorecem a defesa..."
                    rows={3}
                    className="border-green-200 focus:border-green-400"
                  />
                ) : (
                  <div className="text-sm bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    {formData.pontosFortes || "Nenhum ponto registrado"}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-red-600">
                  <ThumbsDown className="h-4 w-4" />
                  Pontos Contra a Defesa
                </Label>
                {editMode ? (
                  <Textarea
                    value={formData.pontosFracos || ""}
                    onChange={(e) => updateField("pontosFracos", e.target.value)}
                    placeholder="Aspectos que geralmente desfavorecem a defesa..."
                    rows={3}
                    className="border-red-200 focus:border-red-400"
                  />
                ) : (
                  <div className="text-sm bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {formData.pontosFracos || "Nenhum ponto registrado"}
                  </div>
                )}
              </div>
            </div>

            {/* Tendências Observadas */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-purple-600" />
                Tendencias Observadas
              </Label>
              {editMode ? (
                <>
                  <Textarea
                    value={formData.tendenciasObservadas || ""}
                    onChange={(e) => updateField("tendenciasObservadas", e.target.value)}
                    placeholder="Padroes de comportamento observados em julgamentos anteriores..."
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Sugestoes:</span>
                    {TENDENCIAS_COMUNS.slice(0, 5).map((t) => (
                      <Badge
                        key={t.id}
                        variant="outline"
                        className={cn(
                          "cursor-pointer text-xs",
                          t.tipo === "positivo" && "border-green-300 hover:bg-green-50",
                          t.tipo === "negativo" && "border-red-300 hover:bg-red-50"
                        )}
                        onClick={() =>
                          updateField(
                            "tendenciasObservadas",
                            (formData.tendenciasObservadas || "") + (formData.tendenciasObservadas ? "\n" : "") + t.label
                          )
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t.label}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm bg-purple-50 dark:bg-purple-950/30 p-3 rounded-lg">
                  {formData.tendenciasObservadas?.split("\n").map((t, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-3 w-3 text-purple-600" />
                      {t}
                    </div>
                  )) || "Nenhuma tendencia registrada"}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA ESTATÍSTICAS */}
          <TabsContent value="estatisticas" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
                  {estatisticas.total}
                </p>
                <p className="text-xs text-muted-foreground">Total de Sessoes</p>
              </Card>
              <Card className="p-4 text-center bg-green-50 dark:bg-green-950/30">
                <p className="text-2xl font-bold text-green-600">{estatisticas.absolvicoes}</p>
                <p className="text-xs text-green-600">Absolvicoes</p>
              </Card>
              <Card className="p-4 text-center bg-red-50 dark:bg-red-950/30">
                <p className="text-2xl font-bold text-red-600">{estatisticas.condenacoes}</p>
                <p className="text-xs text-red-600">Condenacoes</p>
              </Card>
              <Card className="p-4 text-center bg-amber-50 dark:bg-amber-950/30">
                <p className="text-2xl font-bold text-amber-600">{estatisticas.desclassificacoes}</p>
                <p className="text-xs text-amber-600">Desclassificacoes</p>
              </Card>
              <Card className="p-4 text-center bg-purple-50 dark:bg-purple-950/30">
                <p className="text-2xl font-bold text-purple-600">{estatisticas.nulidades}</p>
                <p className="text-xs text-purple-600">Nulidades</p>
              </Card>
            </div>

            {/* Taxa favorável */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Resultados Favoraveis</span>
                <span className={cn(
                  "text-lg font-bold",
                  taxaFavoravel >= 50 ? "text-green-600" : "text-red-600"
                )}>
                  {taxaFavoravel}%
                </span>
              </div>
              <Progress
                value={taxaFavoravel}
                className={cn(
                  "h-3",
                  taxaFavoravel >= 50 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"
                )}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Absolvicoes + Desclassificacoes consideradas favoraveis a defesa
              </p>
            </Card>

            {/* Indicador visual */}
            <div className="flex items-center justify-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              {taxaFavoravel >= 60 ? (
                <>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      Historico Favoravel
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Este magistrado tem historico positivo para a defesa
                    </p>
                  </div>
                </>
              ) : taxaFavoravel >= 40 ? (
                <>
                  <Scale className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      Historico Equilibrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Resultados variam - preparacao e essencial
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <TrendingDown className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700 dark:text-red-400">
                      Historico Desfavoravel
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Requer estrategia diferenciada
                    </p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* ABA ESTRATÉGIA */}
          <TabsContent value="estrategia" className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600" />
                Estrategias Recomendadas
              </Label>
              {editMode ? (
                <>
                  <Textarea
                    value={formData.estrategiasRecomendadas || ""}
                    onChange={(e) => updateField("estrategiasRecomendadas", e.target.value)}
                    placeholder="Estrategias que funcionam bem com este magistrado..."
                    rows={5}
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Adicionar:</span>
                    {ESTRATEGIAS_SUGERIDAS.slice(0, 4).map((e, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer text-xs hover:bg-amber-50"
                        onClick={() =>
                          updateField(
                            "estrategiasRecomendadas",
                            (formData.estrategiasRecomendadas || "") +
                              (formData.estrategiasRecomendadas ? "\n- " : "- ") +
                              e
                          )
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {e}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                  {formData.estrategiasRecomendadas ? (
                    <ul className="space-y-2">
                      {formData.estrategiasRecomendadas.split("\n").map((e, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          {e.replace(/^-\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma estrategia registrada ainda
                    </p>
                  )}
                </Card>
              )}
            </div>

            {/* Adicionar observação rápida */}
            {!readOnly && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Adicionar Observacao Rapida
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Observacao</DialogTitle>
                    <DialogDescription>
                      Adicione uma observacao sobre este magistrado
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    value={novaObservacao}
                    onChange={(e) => setNovaObservacao(e.target.value)}
                    placeholder="Ex: Na sessao de hoje, demonstrou abertura para argumentos de atenuantes..."
                    rows={4}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddObservacao} disabled={saving || !novaObservacao.trim()}>
                      {saving ? "Salvando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* ABA HISTÓRICO */}
          <TabsContent value="historico" className="space-y-4">
            {formData.historico && formData.historico.length > 0 ? (
              <div className="space-y-3">
                {formData.historico.map((sessao, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              sessao.resultado === "absolvicao"
                                ? "default"
                                : sessao.resultado === "condenacao"
                                ? "destructive"
                                : "outline"
                            }
                            className={cn(
                              sessao.resultado === "absolvicao" && "bg-green-500",
                              sessao.resultado === "desclassificacao" && "bg-amber-500"
                            )}
                          >
                            {sessao.resultado}
                          </Badge>
                          {sessao.processo && (
                            <span className="text-xs text-muted-foreground">
                              {sessao.processo}
                            </span>
                          )}
                        </div>
                        {sessao.observacoes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {sessao.observacoes}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{sessao.data}</span>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Nenhum historico de sessoes registrado</p>
                <p className="text-xs mt-1">
                  O historico e preenchido automaticamente apos cada sessao
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
