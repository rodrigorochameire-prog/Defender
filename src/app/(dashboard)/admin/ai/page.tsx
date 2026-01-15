"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Sparkles, 
  FileText, 
  Users, 
  AlertTriangle,
  Loader2,
  Send,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { PetAvatar } from "@/components/pet-avatar";

export default function AdminAIPage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Queries
  const { data: pets } = trpc.pets.list.useQuery();
  const { data: dashboardInsights, isLoading: insightsLoading, refetch: refetchInsights } = 
    trpc.ai.getDashboardInsights.useQuery();
  const { data: roomSuggestions, isLoading: roomsLoading, refetch: refetchRooms } = 
    trpc.ai.getRoomSuggestions.useQuery({});

  // Mutations
  const generateReportMutation = trpc.ai.generateWeeklyReport.useMutation({
    onSuccess: (data: { report: string }) => {
      setGeneratedReport(data.report);
      toast.success("Relatório gerado com sucesso!");
    },
    onError: (error: { message: string }) => {
      toast.error("Erro ao gerar relatório: " + error.message);
    },
  });

  const analyzeBehaviorMutation = trpc.ai.analyzeBehavior.useMutation({
    onSuccess: (data: { petName: string }) => {
      toast.success(`Análise de ${data.petName} concluída!`);
    },
    onError: (error: { message: string }) => {
      toast.error("Erro na análise: " + error.message);
    },
  });

  const sendReportMutation = trpc.ai.sendWeeklyReportToTutor.useMutation({
    onSuccess: (data: { sentViaWhatsApp: boolean }) => {
      if (data.sentViaWhatsApp) {
        toast.success("Relatório enviado via WhatsApp!");
      } else {
        toast.success("Relatório gerado (tutor sem telefone cadastrado)");
      }
    },
    onError: (error: { message: string }) => {
      toast.error("Erro ao enviar: " + error.message);
    },
  });

  const handleGenerateReport = async (petId: number) => {
    setSelectedPetId(petId);
    setIsGeneratingReport(true);
    try {
      await generateReportMutation.mutateAsync({ petId });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
      case "attention_needed":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Brain />
          </div>
          <div className="page-header-info">
            <h1>Inteligência Artificial</h1>
            <p>O cérebro da creche - análises e recomendações</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { refetchInsights(); refetchRooms(); }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold text-amber-600">
                  {dashboardInsights?.alerts.length || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sugestões de Sala</p>
                <p className="text-2xl font-bold text-blue-600">
                  {roomSuggestions?.suggestions.length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pets Monitorados</p>
                <p className="text-2xl font-bold">{pets?.length || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Última Análise</p>
                <p className="text-sm font-medium">
                  {dashboardInsights?.lastUpdated 
                    ? new Date(dashboardInsights.lastUpdated).toLocaleTimeString("pt-BR")
                    : "-"}
                </p>
              </div>
              <Brain className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2">
            <Users className="h-4 w-4" />
            Otimização de Salas
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* TAB: INSIGHTS */}
        <TabsContent value="insights" className="space-y-4">
          {/* Alertas de Comportamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas de Comportamento
              </CardTitle>
              <CardDescription>
                Pets que precisam de atenção especial baseado na análise de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : dashboardInsights?.alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta no momento. Todos os pets estão bem!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardInsights?.alerts.map((alert: { petId: number; petName: string; message: string; type: string }, idx: number) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200"
                    >
                      <div className="flex items-center gap-3">
                        <PetAvatar 
                          breed={pets?.find(p => p.id === alert.petId)?.breed}
                          name={alert.petName}
                          size="md"
                        />
                        <div>
                          <p className="font-medium">{alert.petName}</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {alert.type === "anxiety" ? "Ansiedade" : 
                         alert.type === "energy" ? "Energia" : alert.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sugestões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                Sugestões Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboardInsights?.suggestions.map((suggestion: { type: string; message: string; priority: string }, idx: number) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {suggestion.type === "room" ? (
                      <Users className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    )}
                    <p className="text-sm">{suggestion.message}</p>
                    {suggestion.priority === "high" && (
                      <Badge variant="destructive" className="ml-auto">Alta</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: OTIMIZAÇÃO DE SALAS */}
        <TabsContent value="rooms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Otimização de Matilha
              </CardTitle>
              <CardDescription>
                Sugestões de redistribuição para manter equilíbrio entre as salas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : roomSuggestions?.suggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Distribuição atual está otimizada!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomSuggestions?.suggestions.map((suggestion: { petId: number; petName: string; suggestedRoom: string; reason: string; priority: string }, idx: number) => (
                    <div 
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        suggestion.priority === "high" 
                          ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                          : suggestion.priority === "medium"
                            ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                            : "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <PetAvatar 
                            breed={pets?.find(p => p.id === suggestion.petId)?.breed}
                            name={suggestion.petName}
                            size="md"
                          />
                          <div>
                            <p className="font-medium">{suggestion.petName}</p>
                            <p className="text-sm text-muted-foreground">
                              Sugerido: <strong>Sala {suggestion.suggestedRoom}</strong>
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          suggestion.priority === "high" ? "destructive" :
                          suggestion.priority === "medium" ? "secondary" : "outline"
                        }>
                          {suggestion.priority === "high" ? "Urgente" :
                           suggestion.priority === "medium" ? "Recomendado" : "Opcional"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: RELATÓRIOS */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Seleção de Pet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gerar Relatório Semanal
                </CardTitle>
                <CardDescription>
                  Selecione um pet para gerar o relatório de evolução
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {pets?.map((pet) => (
                    <div 
                      key={pet.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPetId === pet.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPetId(pet.id)}
                    >
                      <div className="flex items-center gap-3">
                        <PetAvatar 
                          photoUrl={pet.photoUrl}
                          breed={pet.breed}
                          name={pet.name}
                          size="md"
                        />
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-xs text-muted-foreground">{pet.breed}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isGeneratingReport && selectedPetId === pet.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateReport(pet.id);
                          }}
                        >
                          {isGeneratingReport && selectedPetId === pet.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          disabled={sendReportMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            sendReportMutation.mutate({ petId: pet.id });
                          }}
                        >
                          {sendReportMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preview do Relatório */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Preview do Relatório
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generatedReport ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm">
                      {generatedReport}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione um pet e clique em gerar para ver o relatório</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
