import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  RefreshCw,
  Zap,
  Link,
  AlertCircle,
  Clock,
  Users,
  MapPin,
  ExternalLink,
  Copy,
  Loader2,
} from "lucide-react";
import { addDays, format } from "date-fns";

interface GoogleCalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportEvents: (eventos: any[]) => void;
}

export function GoogleCalendarSyncModal({
  isOpen,
  onClose,
  onImportEvents,
}: GoogleCalendarSyncModalProps) {
  const [calendarUrl, setCalendarUrl] = useState(
    "https://calendar.google.com/calendar/u/0?cid=MjM3MDBhN2QzYjIyNTNkZTEyZWJjMzEyNGM3ODZlMDkxMmZmNjc0MzIxNDc2MWU5M2I1MjY4NDhhNTA0NGZkN0Bncm91cC5jYWxlbmRhci5nb29nbGUuY29t"
  );
  const [calendarId, setCalendarId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);
  const [importedEvents, setImportedEvents] = useState<any[]>([]);

  useEffect(() => {
    // Extrair Calendar ID da URL
    if (calendarUrl) {
      const match = calendarUrl.match(/cid=([^&]+)/);
      if (match) {
        setCalendarId(match[1]);
      }
    }
  }, [calendarUrl]);

  const simulateGoogleCalendarImport = () => {
    // Simular eventos do Google Calendar
    const today = new Date();
    
    return [
      {
        titulo: "Audiência de Instrução e Julgamento - Homicídio Qualificado",
        tipo: "audiencia",
        data: format(addDays(today, 1), "yyyy-MM-dd"),
        horarioInicio: "09:00",
        horarioFim: "12:30",
        local: "1ª Vara do Tribunal do Júri - Sala 201",
        assistido: "Carlos Eduardo Mendes",
        processo: "0012345-67.2024.8.05.0001",
        atribuicao: "Tribunal do Júri",
        status: "confirmado",
        descricao: "Audiência de instrução e julgamento. Réu preso. Previstas 3 testemunhas de acusação e 4 testemunhas de defesa. Tese: legítima defesa.",
        prioridade: "urgente",
        recorrencia: "nenhuma",
        lembretes: ["1d", "2h", "30min"],
        tags: ["Júri", "Homicídio", "Réu Preso", "Instrução"],
        participantes: ["Dr. Rodrigo", "Promotor Dr. Paulo Santos", "Juiz Dr. Marcos Silva"],
        observacoes: "Importado do Google Calendar. Réu custodiado no Conjunto Penal. Preparar rol de testemunhas.",
        documentos: [],
        classeJudicial: "Ação Penal",
        situacaoAudiencia: "Designada",
        orgaoJulgador: "1ª Vara do Tribunal do Júri de Salvador",
        juizPresidente: "Dr. Marcos Silva",
        promotor: "Dr. Paulo Santos",
        testemunhas: [
          { nome: "João Silva", tipo: "acusacao", categoria: "ocular", intimada: true },
          { nome: "Maria Santos", tipo: "defesa", categoria: "conduta", intimada: true },
        ],
      },
      {
        titulo: "Audiência Virtual - Apelação Criminal (Tráfico de Drogas)",
        tipo: "audiencia",
        data: format(addDays(today, 2), "yyyy-MM-dd"),
        horarioInicio: "14:00",
        horarioFim: "15:00",
        local: "Videoconferência - Google Meet (2ª Câmara Criminal)",
        assistido: "Pedro Henrique Santos",
        processo: "0023456-78.2025.8.05.0001",
        atribuicao: "Criminal Geral",
        status: "confirmado",
        descricao: "Sustentação oral em apelação criminal. Condenação por tráfico de drogas a 6 anos. Tese: dosimetria excessiva e ausência de provas quanto à mercancia.",
        prioridade: "alta",
        recorrencia: "nenhuma",
        lembretes: ["1d", "2h", "30min"],
        tags: ["Apelação", "Virtual", "Tráfico", "Sustentação Oral"],
        participantes: ["Dra. Juliane", "Desembargador Relator", "Procurador de Justiça"],
        observacoes: "Importado do Google Calendar. Link da reunião será enviado por e-mail. Preparar sustentação oral de 15 minutos.",
        documentos: [],
        classeJudicial: "Apelação Criminal",
        situacaoAudiencia: "Designada",
        orgaoJulgador: "2ª Câmara Criminal do TJBA",
        juizPresidente: "Desembargador José Carlos",
        promotor: "Procurador de Justiça Dra. Ana Paula",
      },
      {
        titulo: "Audiência de Custódia - Prisão em Flagrante",
        tipo: "audiencia",
        data: format(addDays(today, 1), "yyyy-MM-dd"),
        horarioInicio: "15:00",
        horarioFim: "15:30",
        local: "Central de Audiências de Custódia - Salvador",
        assistido: "Thiago Rodrigues Lima",
        processo: "0089456-12.2026.8.05.0001",
        atribuicao: "Criminal Geral",
        status: "confirmado",
        descricao: "Audiência de custódia. Prisão em flagrante por roubo. Cliente alega que estava apenas no local. Requerer liberdade provisória.",
        prioridade: "urgente",
        recorrencia: "nenhuma",
        lembretes: ["12h", "2h"],
        tags: ["Custódia", "Flagrante", "Roubo", "Liberdade"],
        participantes: ["Dr. Rodrigo", "Juiz de Garantias"],
        observacoes: "Importado do Google Calendar. Cliente preso há 24h. Preparar pedido de liberdade provisória com base na primariedade.",
        documentos: [],
        classeJudicial: "Audiência de Custódia",
        situacaoAudiencia: "Designada",
        orgaoJulgador: "Vara de Audiências de Custódia",
        juizPresidente: "Dra. Fernanda Costa",
        promotor: "Promotor de Justiça em plantão",
      },
      {
        titulo: "Atendimento Inicial - Violência Doméstica",
        tipo: "atendimento",
        data: format(addDays(today, 3), "yyyy-MM-dd"),
        horarioInicio: "10:00",
        horarioFim: "11:00",
        local: "Defensoria Pública - Sala de Atendimento 3",
        assistido: "Ana Carolina Souza",
        processo: "",
        atribuicao: "Violência Doméstica",
        status: "confirmado",
        descricao: "Atendimento inicial. Cliente vítima de violência doméstica. Requerer medida protetiva de urgência. Avaliar possibilidade de divórcio litigioso.",
        prioridade: "alta",
        recorrencia: "nenhuma",
        lembretes: ["1d", "2h"],
        tags: ["Atendimento", "Violência Doméstica", "Medida Protetiva", "Urgente"],
        participantes: ["Dra. Juliane", "Equipe psicossocial"],
        observacoes: "Importado do Google Calendar. Cliente traz documentação completa. Agendar com equipe psicossocial.",
        documentos: [],
        classeJudicial: "",
        situacaoAudiencia: "",
        orgaoJulgador: "",
      },
      {
        titulo: "Sessão do Tribunal do Júri - Acompanhamento (Feminicídio)",
        tipo: "audiencia",
        data: format(addDays(today, 5), "yyyy-MM-dd"),
        horarioInicio: "08:00",
        horarioFim: "18:00",
        local: "Tribunal do Júri - Plenário Principal",
        assistido: "",
        processo: "0045678-90.2023.8.05.0001",
        atribuicao: "Tribunal do Júri",
        status: "confirmado",
        descricao: "Sessão plenária do Júri. Caso de feminicídio. Acompanhamento para estudo e preparação de casos futuros. Observar estratégias de defesa.",
        prioridade: "media",
        recorrencia: "nenhuma",
        lembretes: ["2d", "1d"],
        tags: ["Júri", "Estudo", "Feminicídio", "Plenário"],
        participantes: ["Dr. Rodrigo", "Dra. Juliane"],
        observacoes: "Importado do Google Calendar. Atividade de desenvolvimento profissional. Observar técnicas de inquirição.",
        documentos: [],
        classeJudicial: "Ação Penal - Tribunal do Júri",
        situacaoAudiencia: "Designada",
        orgaoJulgador: "1ª Vara do Tribunal do Júri",
        juizPresidente: "Dr. Roberto Almeida",
        promotor: "Promotor de Justiça especializado",
      },
      {
        titulo: "Prazo Fatal - Memorial em Habeas Corpus",
        tipo: "prazo",
        data: format(addDays(today, 7), "yyyy-MM-dd"),
        horarioInicio: "23:59",
        horarioFim: "",
        local: "",
        assistido: "Marcos Antônio Lima",
        processo: "0078945-12.2026.8.05.0000",
        atribuicao: "Criminal Geral",
        status: "pendente",
        descricao: "Prazo fatal para apresentação de memorial em Habeas Corpus. Prisão preventiva por tráfico de drogas. Argumentar: ausência de fundamentação concreta, primariedade, bons antecedentes, endereço fixo.",
        prioridade: "urgente",
        recorrencia: "nenhuma",
        lembretes: ["3d", "1d", "12h", "3h"],
        tags: ["HC", "Prazo", "Urgente", "Liberdade", "Memorial"],
        participantes: ["Dra. Juliane"],
        observacoes: "Importado do Google Calendar. Prazo fatal - risco de preclusão. Preparar memorial com jurisprudência do STJ e STF.",
        documentos: [],
        classeJudicial: "Habeas Corpus",
        situacaoAudiencia: "",
        orgaoJulgador: "3ª Câmara Criminal do TJBA",
      },
      {
        titulo: "Reunião de Equipe - Planejamento Estratégico Mensal",
        tipo: "reuniao",
        data: format(addDays(today, 8), "yyyy-MM-dd"),
        horarioInicio: "09:00",
        horarioFim: "11:00",
        local: "Sala de Reuniões - Defensoria Pública",
        assistido: "",
        processo: "",
        atribuicao: "Geral",
        status: "confirmado",
        descricao: "Reunião mensal de planejamento estratégico. Pautas: distribuição de escalas, análise de metas, discussão de casos complexos, capacitações.",
        prioridade: "media",
        recorrencia: "mensal",
        lembretes: ["2d", "1d"],
        tags: ["Equipe", "Planejamento", "Reunião", "Metas"],
        participantes: ["Dr. Rodrigo", "Dra. Juliane", "Equipe Técnica", "Coordenação"],
        observacoes: "Importado do Google Calendar. Trazer relatório mensal de atendimentos.",
        documentos: [],
        classeJudicial: "",
        situacaoAudiencia: "",
        orgaoJulgador: "",
      },
      {
        titulo: "Capacitação - Reforma do Código Penal e Jurisprudência Recente",
        tipo: "reuniao",
        data: format(addDays(today, 10), "yyyy-MM-dd"),
        horarioInicio: "14:00",
        horarioFim: "17:30",
        local: "Auditório da Defensoria Pública",
        assistido: "",
        processo: "",
        atribuicao: "Geral",
        status: "confirmado",
        descricao: "Curso de capacitação: Reforma do Código Penal, mudanças no CPP, jurisprudência recente do STF/STJ em matéria criminal. Palestrante: Prof. Dr. Eduardo Araújo.",
        prioridade: "media",
        recorrencia: "nenhuma",
        lembretes: ["2d", "1d"],
        tags: ["Capacitação", "Treinamento", "Legislação", "Jurisprudência"],
        participantes: ["Dr. Rodrigo", "Dra. Juliane", "Todos os defensores"],
        observacoes: "Importado do Google Calendar. Certificado de 4h será emitido. Material será disponibilizado via e-mail.",
        documentos: [],
        classeJudicial: "",
        situacaoAudiencia: "",
        orgaoJulgador: "",
      },
      {
        titulo: "Audiência Preliminar - Execução Penal (Progressão de Regime)",
        tipo: "audiencia",
        data: format(addDays(today, 4), "yyyy-MM-dd"),
        horarioInicio: "11:00",
        horarioFim: "11:30",
        local: "Vara de Execuções Penais - Salvador",
        assistido: "Roberto Carlos Silva",
        processo: "0034567-89.2022.8.05.0001",
        atribuicao: "Execução Penal",
        status: "confirmado",
        descricao: "Audiência para análise de progressão de regime (fechado para semiaberto). Cliente cumpriu 2/5 da pena, tem bom comportamento carcerário.",
        prioridade: "alta",
        recorrencia: "nenhuma",
        lembretes: ["1d", "2h"],
        tags: ["Execução", "Progressão", "Regime Semiaberto"],
        participantes: ["Dr. Rodrigo", "Juiz da VEP", "Promotor de Execução"],
        observacoes: "Importado do Google Calendar. Trazer atestado de bom comportamento e certidões.",
        documentos: [],
        classeJudicial: "Execução Penal",
        situacaoAudiencia: "Designada",
        orgaoJulgador: "Vara de Execuções Penais",
        juizPresidente: "Dra. Carla Mendes",
        promotor: "Promotor de Execução Penal",
      },
    ];
  };

  const handleSync = async () => {
    if (!calendarId) {
      toast.error("ID do calendário não identificado na URL");
      return;
    }

    setIsSyncing(true);
    setSyncComplete(false);

    try {
      // Simular chamada à API do Google Calendar
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const eventos = simulateGoogleCalendarImport();
      setImportedEvents(eventos);
      setSyncComplete(true);

      toast.success(
        `${eventos.length} eventos sincronizados do Google Calendar!`,
        {
          description: "Os eventos foram importados com sucesso",
        }
      );
    } catch (error) {
      toast.error("Erro ao sincronizar com Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImport = () => {
    onImportEvents(importedEvents);
    toast.success("Eventos adicionados à agenda!");
    onClose();
  };

  const copyCalendarId = async () => {
    // Usar método fallback direto para evitar problemas de permissão
    const textarea = document.createElement("textarea");
    textarea.value = calendarId;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    
    try {
      textarea.select();
      textarea.setSelectionRange(0, 99999); // Para mobile
      const successful = document.execCommand("copy");
      
      if (successful) {
        toast.success("Calendar ID copiado!");
      } else {
        toast.info("Selecione e copie o ID manualmente");
      }
    } catch (err) {
      toast.info("Selecione e copie o ID manualmente");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Sincronização Google Calendar
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Conecte sua agenda do Google Calendar para importar eventos automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* URL do Calendário */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              URL do Google Calendar
            </Label>
            <div className="flex gap-2">
              <Input
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/u/0?cid=..."
                className="flex-1 bg-white dark:bg-zinc-900"
              />
              <Button
                variant="outline"
                onClick={copyCalendarId}
                disabled={!calendarId}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {calendarId && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-green-700 dark:text-green-300 font-mono break-all">
                  ID detectado: {calendarId.substring(0, 40)}...
                </span>
              </div>
            )}
          </div>

          {/* Informações */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Como obter a URL do seu calendário:
                </p>
                <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Acesse Google Calendar (calendar.google.com)</li>
                  <li>Clique em &ldquo;Configurações&rdquo; (ícone de engrenagem)</li>
                  <li>Selecione o calendário desejado</li>
                  <li>Role até &ldquo;Integrar calendário&rdquo;</li>
                  <li>Copie o &ldquo;ID do calendário&rdquo; ou a URL pública</li>
                </ol>
              </div>
            </div>
          </Card>

          {/* Botão de Sincronização */}
          <div className="flex gap-2">
            <Button
              onClick={handleSync}
              disabled={!calendarId || isSyncing}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sincronizar Agora
                </>
              )}
            </Button>

            {syncComplete && (
              <Button
                onClick={handleImport}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                Importar {importedEvents.length} Eventos
              </Button>
            )}
          </div>

          {/* Preview dos Eventos Importados */}
          {syncComplete && importedEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                  Eventos Encontrados ({importedEvents.length})
                </h3>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Pronto para importar
                </Badge>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {importedEvents.map((evento, index) => (
                  <Card
                    key={index}
                    className="p-4 border border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          evento.tipo === "audiencia"
                            ? "bg-yellow-100 dark:bg-yellow-900/30"
                            : evento.tipo === "reuniao"
                            ? "bg-purple-100 dark:bg-purple-900/30"
                            : evento.tipo === "prazo"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                      >
                        {evento.tipo === "audiencia" ? (
                          <Calendar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        ) : evento.tipo === "reuniao" ? (
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        ) : evento.tipo === "prazo" ? (
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                          {evento.titulo}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(evento.data).toLocaleDateString("pt-BR")} às{" "}
                              {evento.horarioInicio}
                            </span>
                          </div>

                          {evento.local && (
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{evento.local}</span>
                            </div>
                          )}
                        </div>

                        {evento.tags && evento.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {evento.tags.map((tag: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Estatísticas de Sincronização */}
          {syncComplete && (
            <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                    Sincronização Concluída
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    {importedEvents.filter((e) => e.tipo === "audiencia").length}{" "}
                    audiências · {importedEvents.filter((e) => e.tipo === "reuniao").length}{" "}
                    reuniões · {importedEvents.filter((e) => e.tipo === "prazo").length}{" "}
                    prazo · {importedEvents.filter((e) => e.tipo === "atendimento").length}{" "}
                    atendimento
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {syncComplete && (
            <Button
              onClick={handleImport}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Importar Eventos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}