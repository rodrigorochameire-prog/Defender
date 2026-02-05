"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  MapPin,
  MessageSquare,
  Phone,
  Printer,
  Scale,
  User,
  Users,
  AlertCircle,
  Calendar,
  BookOpen,
  Shield,
  FileSearch,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos de audiência e checklists específicos
type TipoAudiencia = "instrucao" | "juri" | "custodia" | "justificacao" | "admonicao" | "conciliacao";

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  critical?: boolean; // Se true, deve ser concluído
  category: "preparacao" | "documentos" | "comunicacao" | "local" | "estrategia";
}

interface ChecklistState {
  [itemId: string]: {
    checked: boolean;
    notes?: string;
  };
}

interface ChecklistPreAudienciaProps {
  audiencia: {
    id: number;
    tipo: string;
    dataAudiencia: Date | string;
    local?: string;
    sala?: string;
    juiz?: string;
    promotor?: string;
    titulo?: string;
    observacoes?: string;
  };
  assistido?: {
    id: number;
    nome: string;
    telefone?: string;
    situacaoPrisional?: string;
  };
  processo?: {
    id: number;
    numeroAutos: string;
    vara?: string;
    comarca?: string;
  };
  onSave?: (checklist: ChecklistState) => Promise<void>;
  initialChecklist?: ChecklistState;
}

// Checklists por tipo de audiência
const CHECKLISTS: Record<TipoAudiencia, ChecklistItem[]> = {
  instrucao: [
    // Preparação
    { id: "revisar_denuncia", label: "Revisar denúncia/queixa", icon: FileText, category: "preparacao", critical: true },
    { id: "estudar_provas", label: "Estudar provas do processo", icon: FileSearch, category: "preparacao", critical: true },
    { id: "preparar_perguntas", label: "Preparar perguntas para testemunhas", icon: MessageSquare, category: "preparacao", critical: true },
    { id: "verificar_preliminares", label: "Verificar preliminares e nulidades", icon: AlertCircle, category: "preparacao" },
    { id: "definir_tese", label: "Definir tese defensiva", icon: Scale, category: "estrategia", critical: true },

    // Documentos
    { id: "copia_autos", label: "Imprimir cópia dos autos principais", icon: Printer, category: "documentos" },
    { id: "lista_testemunhas", label: "Conferir rol de testemunhas", icon: Users, category: "documentos", critical: true },
    { id: "procuracao", label: "Verificar procuração/habilitação", icon: FileText, category: "documentos" },

    // Comunicação
    { id: "contatar_cliente", label: "Contatar cliente/assistido", icon: Phone, category: "comunicacao", critical: true },
    { id: "orientar_cliente", label: "Orientar sobre comportamento em audiência", icon: User, category: "comunicacao" },
    { id: "confirmar_testemunhas", label: "Confirmar presença das testemunhas", icon: Users, category: "comunicacao" },

    // Local
    { id: "verificar_local", label: "Verificar endereço e sala", icon: MapPin, category: "local" },
    { id: "calcular_tempo", label: "Calcular tempo de deslocamento", icon: Clock, category: "local" },
  ],

  juri: [
    // Preparação
    { id: "revisar_processo", label: "Revisar integralmente o processo", icon: FileText, category: "preparacao", critical: true },
    { id: "estudar_pronuncia", label: "Estudar decisão de pronúncia", icon: Gavel, category: "preparacao", critical: true },
    { id: "preparar_sustentacao", label: "Preparar sustentação oral", icon: MessageSquare, category: "preparacao", critical: true },
    { id: "elaborar_quesitos", label: "Elaborar quesitos defensivos", icon: FileText, category: "preparacao", critical: true },
    { id: "preparar_slides", label: "Preparar material visual (se aplicável)", icon: FileText, category: "preparacao" },

    // Estratégia
    { id: "definir_tese_juri", label: "Definir tese principal e subsidiária", icon: Scale, category: "estrategia", critical: true },
    { id: "estudar_jurados", label: "Estudar perfil de jurados (se disponível)", icon: Users, category: "estrategia" },
    { id: "preparar_reperguntas", label: "Preparar reperguntas para vítima/testemunhas", icon: MessageSquare, category: "estrategia", critical: true },
    { id: "argumentos_atenuantes", label: "Preparar argumentos de atenuantes", icon: Shield, category: "estrategia" },

    // Documentos
    { id: "imprimir_autos_juri", label: "Imprimir peças principais", icon: Printer, category: "documentos", critical: true },
    { id: "organizar_provas", label: "Organizar provas documentais", icon: FileText, category: "documentos" },
    { id: "levar_jurisprudencia", label: "Separar jurisprudência relevante", icon: BookOpen, category: "documentos" },

    // Comunicação
    { id: "reuniao_cliente_juri", label: "Reunião com réu antes do júri", icon: User, category: "comunicacao", critical: true },
    { id: "orientar_familia", label: "Orientar família sobre procedimentos", icon: Users, category: "comunicacao" },
    { id: "confirmar_testemunhas_juri", label: "Confirmar testemunhas de defesa", icon: Users, category: "comunicacao", critical: true },

    // Local
    { id: "verificar_plenario", label: "Verificar local do plenário", icon: MapPin, category: "local" },
    { id: "chegar_antecipado", label: "Chegar 1h antes para preparação", icon: Clock, category: "local", critical: true },
  ],

  custodia: [
    // Preparação
    { id: "verificar_flagrante", label: "Verificar auto de prisão em flagrante", icon: FileText, category: "preparacao", critical: true },
    { id: "verificar_legalidade", label: "Verificar legalidade da prisão", icon: Scale, category: "preparacao", critical: true },
    { id: "analisar_antecedentes", label: "Analisar antecedentes criminais", icon: FileSearch, category: "preparacao" },

    // Estratégia
    { id: "preparar_liberdade", label: "Preparar pedido de liberdade provisória", icon: Shield, category: "estrategia", critical: true },
    { id: "verificar_cautelares", label: "Verificar medidas cautelares alternativas", icon: Scale, category: "estrategia" },
    { id: "calcular_proporcionalidade", label: "Analisar proporcionalidade da prisão", icon: Gavel, category: "estrategia" },

    // Comunicação
    { id: "conversar_preso", label: "Conversar com preso antes da audiência", icon: User, category: "comunicacao", critical: true },
    { id: "contatar_familia_custodia", label: "Contatar família para informações", icon: Phone, category: "comunicacao" },
    { id: "verificar_emprego", label: "Verificar vínculo de emprego/residência", icon: Briefcase, category: "comunicacao" },

    // Documentos
    { id: "doc_residencia", label: "Reunir comprovante de residência", icon: FileText, category: "documentos" },
    { id: "doc_emprego", label: "Reunir comprovante de emprego", icon: FileText, category: "documentos" },
    { id: "doc_antecedentes", label: "Verificar FAC", icon: FileText, category: "documentos" },
  ],

  justificacao: [
    // Preparação
    { id: "verificar_descumprimento", label: "Verificar natureza do descumprimento", icon: AlertCircle, category: "preparacao", critical: true },
    { id: "analisar_condicoes", label: "Analisar condições impostas", icon: Scale, category: "preparacao" },

    // Comunicação
    { id: "contatar_reeducando", label: "Contatar reeducando/apenado", icon: Phone, category: "comunicacao", critical: true },
    { id: "coletar_justificativa", label: "Coletar justificativa para descumprimento", icon: MessageSquare, category: "comunicacao", critical: true },

    // Documentos
    { id: "doc_comprovantes", label: "Reunir comprovantes de justificativa", icon: FileText, category: "documentos", critical: true },
    { id: "atestados_medicos", label: "Verificar atestados médicos (se aplicável)", icon: FileText, category: "documentos" },
  ],

  admonicao: [
    // Preparação
    { id: "verificar_pena", label: "Verificar cálculo da pena", icon: FileText, category: "preparacao", critical: true },
    { id: "verificar_regime", label: "Verificar regime fixado", icon: Scale, category: "preparacao" },

    // Comunicação
    { id: "orientar_condicoes", label: "Orientar sobre condições", icon: User, category: "comunicacao", critical: true },
    { id: "explicar_consequencias", label: "Explicar consequências de descumprimento", icon: AlertTriangle, category: "comunicacao" },

    // Documentos
    { id: "doc_sentenca", label: "Levar cópia da sentença", icon: FileText, category: "documentos" },
    { id: "guia_execucao", label: "Verificar guia de execução", icon: FileText, category: "documentos" },
  ],

  conciliacao: [
    // Preparação
    { id: "analisar_fatos", label: "Analisar fatos e circunstâncias", icon: FileSearch, category: "preparacao" },
    { id: "verificar_proposta", label: "Verificar possibilidade de acordo", icon: Scale, category: "preparacao" },

    // Comunicação
    { id: "orientar_acordo", label: "Orientar cliente sobre acordo", icon: User, category: "comunicacao", critical: true },
    { id: "verificar_interesse", label: "Verificar interesse em transação", icon: MessageSquare, category: "comunicacao" },

    // Documentos
    { id: "doc_boletim", label: "Revisar boletim de ocorrência", icon: FileText, category: "documentos" },
  ],
};

// Checklist genérico para tipos não mapeados
const CHECKLIST_GENERICO: ChecklistItem[] = [
  { id: "revisar_processo_gen", label: "Revisar processo", icon: FileText, category: "preparacao", critical: true },
  { id: "contatar_cliente_gen", label: "Contatar cliente", icon: Phone, category: "comunicacao", critical: true },
  { id: "verificar_local_gen", label: "Verificar local", icon: MapPin, category: "local" },
  { id: "preparar_documentos_gen", label: "Preparar documentos", icon: FileText, category: "documentos" },
];

const CATEGORY_CONFIG = {
  preparacao: { label: "Preparacao", icon: BookOpen, color: "text-blue-600" },
  documentos: { label: "Documentos", icon: FileText, color: "text-amber-600" },
  comunicacao: { label: "Comunicacao", icon: Phone, color: "text-green-600" },
  local: { label: "Local/Logistica", icon: MapPin, color: "text-purple-600" },
  estrategia: { label: "Estrategia", icon: Scale, color: "text-red-600" },
};

export function ChecklistPreAudiencia({
  audiencia,
  assistido,
  processo,
  onSave,
  initialChecklist = {},
}: ChecklistPreAudienciaProps) {
  const [checklist, setChecklist] = useState<ChecklistState>(initialChecklist);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["preparacao", "comunicacao"]);
  const [saving, setSaving] = useState(false);

  const dataAudiencia = new Date(audiencia.dataAudiencia);
  const agora = new Date();
  const horasAte = differenceInHours(dataAudiencia, agora);
  const diasAte = differenceInDays(dataAudiencia, agora);

  // Obter checklist baseado no tipo
  const tipoNormalizado = audiencia.tipo?.toLowerCase() as TipoAudiencia;
  const checklistItems = CHECKLISTS[tipoNormalizado] || CHECKLIST_GENERICO;

  // Agrupar por categoria
  const itensPorCategoria = useMemo(() => {
    const grupos: Record<string, ChecklistItem[]> = {};
    checklistItems.forEach((item) => {
      if (!grupos[item.category]) {
        grupos[item.category] = [];
      }
      grupos[item.category].push(item);
    });
    return grupos;
  }, [checklistItems]);

  // Calcular progresso
  const { total, concluidos, criticos, criticosConcluidos } = useMemo(() => {
    const total = checklistItems.length;
    const concluidos = checklistItems.filter((item) => checklist[item.id]?.checked).length;
    const criticos = checklistItems.filter((item) => item.critical).length;
    const criticosConcluidos = checklistItems.filter(
      (item) => item.critical && checklist[item.id]?.checked
    ).length;
    return { total, concluidos, criticos, criticosConcluidos };
  }, [checklistItems, checklist]);

  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  const progressoCriticos = criticos > 0 ? Math.round((criticosConcluidos / criticos) * 100) : 100;

  const toggleItem = (itemId: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        checked: !prev[itemId]?.checked,
      },
    }));
  };

  const updateNotes = (itemId: string, notes: string) => {
    setChecklist((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(checklist);
    } finally {
      setSaving(false);
    }
  };

  // Determinar urgência
  const urgencia = diasAte < 0 ? "passada" : diasAte === 0 ? "hoje" : diasAte <= 1 ? "amanha" : diasAte <= 3 ? "proxima" : "normal";

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gavel className="h-5 w-5 text-amber-600" />
              Checklist Pre-Audiencia
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {audiencia.titulo || `${audiencia.tipo} - ${processo?.numeroAutos || "Processo"}`}
            </p>
          </div>
          <Badge
            variant={urgencia === "passada" ? "destructive" : urgencia === "hoje" ? "destructive" : urgencia === "amanha" ? "default" : "outline"}
            className={cn(
              urgencia === "hoje" && "animate-pulse",
              urgencia === "passada" && "bg-gray-500"
            )}
          >
            {urgencia === "passada"
              ? "Ja ocorreu"
              : urgencia === "hoje"
              ? "HOJE"
              : urgencia === "amanha"
              ? "Amanha"
              : `${diasAte} dias`}
          </Badge>
        </div>

        {/* Info resumida */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {format(dataAudiencia, "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </div>
          {audiencia.local && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {audiencia.local}
            </div>
          )}
          {assistido && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              {assistido.nome}
            </div>
          )}
          {audiencia.juiz && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gavel className="h-3.5 w-3.5" />
              {audiencia.juiz}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progresso */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className="font-medium">{concluidos}/{total} ({progresso}%)</span>
          </div>
          <Progress value={progresso} className="h-2" />

          {criticos > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                Itens criticos
              </span>
              <span className={cn(
                "font-medium",
                progressoCriticos < 100 ? "text-red-600" : "text-green-600"
              )}>
                {criticosConcluidos}/{criticos}
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Checklist por categoria */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {Object.entries(itensPorCategoria).map(([categoria, items]) => {
              const config = CATEGORY_CONFIG[categoria as keyof typeof CATEGORY_CONFIG];
              const CategoryIcon = config?.icon || FileText;
              const isExpanded = expandedCategories.includes(categoria);
              const categoriaConcluidos = items.filter((item) => checklist[item.id]?.checked).length;

              return (
                <Collapsible
                  key={categoria}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(categoria)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between px-2 py-1.5 h-auto"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <CategoryIcon className={cn("h-4 w-4", config?.color)} />
                        <span className="font-medium text-sm">{config?.label || categoria}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {categoriaConcluidos}/{items.length}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="pl-6 space-y-2 mt-2">
                    {items.map((item) => {
                      const ItemIcon = item.icon || FileText;
                      const isChecked = checklist[item.id]?.checked || false;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 p-2 rounded-lg transition-colors",
                            isChecked ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                            item.critical && !isChecked && "border-l-2 border-red-400"
                          )}
                        >
                          <Checkbox
                            id={item.id}
                            checked={isChecked}
                            onCheckedChange={() => toggleItem(item.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <Label
                              htmlFor={item.id}
                              className={cn(
                                "flex items-center gap-2 cursor-pointer text-sm",
                                isChecked && "line-through opacity-60"
                              )}
                            >
                              <ItemIcon className="h-3.5 w-3.5 opacity-60" />
                              {item.label}
                              {item.critical && !isChecked && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                  Obrigatorio
                                </Badge>
                              )}
                            </Label>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          {isChecked && <Check className="h-4 w-4 text-green-600" />}
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>

        {/* Alerta se itens críticos pendentes */}
        {criticos > 0 && criticosConcluidos < criticos && urgencia !== "passada" && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {criticos - criticosConcluidos} item(ns) critico(s) pendente(s)
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                Complete todos os itens obrigatorios antes da audiencia
              </p>
            </div>
          </div>
        )}

        {/* Botão salvar */}
        {onSave && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>Salvando...</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar Checklist
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
