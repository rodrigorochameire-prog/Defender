"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Gavel,
  Loader2,
  Plus,
  Network,
} from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const INSTANCIA_OPTIONS = [
  { value: "PRIMEIRA", label: "1º Grau" },
  { value: "SEGUNDA", label: "2º Grau" },
  { value: "STJ", label: "STJ" },
  { value: "STF", label: "STF" },
  { value: "SEEU", label: "SEEU" },
];

const CLASSE_RECURSAL_OPTIONS = [
  { value: "APELACAO", label: "Apelação" },
  { value: "AGRAVO_EXECUCAO", label: "Agravo em Execução" },
  { value: "RESE", label: "RESE" },
  { value: "HC", label: "HC" },
  { value: "EMBARGOS", label: "Embargos" },
  { value: "REVISAO_CRIMINAL", label: "Revisão Criminal" },
  { value: "CORREICAO_PARCIAL", label: "Correição Parcial" },
  { value: "MS", label: "MS" },
  { value: "RESP", label: "Recurso Especial" },
  { value: "RE", label: "Recurso Extraordinário" },
  { value: "AGRAVO_RESP", label: "Agravo em REsp" },
  { value: "AGRAVO_RE", label: "Agravo em RE" },
  { value: "RECLAMACAO", label: "Reclamação" },
  { value: "HC_STJ", label: "HC STJ" },
  { value: "HC_STF", label: "HC STF" },
];

const ALL_AREA_OPTIONS = [
  { value: "JURI", label: "Tribunal do Júri" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal" },
  { value: "VIOLENCIA_DOMESTICA", label: "Violência Doméstica" },
  { value: "SUBSTITUICAO", label: "Substituição" },
  { value: "CURADORIA", label: "Curadoria" },
  { value: "FAMILIA", label: "Família" },
  { value: "CIVEL", label: "Cível" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Pública" },
  { value: "CRIMINAL", label: "Criminal" },
  { value: "INFANCIA_JUVENTUDE", label: "Infância e Juventude" },
];

const FASE_OPTIONS = [
  { value: "conhecimento", label: "Conhecimento" },
  { value: "recursal", label: "Recursal" },
  { value: "execucao", label: "Execução" },
  { value: "arquivado", label: "Arquivado" },
];

const SITUACAO_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" },
  { value: "arquivado", label: "Arquivado" },
  { value: "baixado", label: "Baixado" },
];

interface FormData {
  numeroAutos: string;
  numeroAntigo: string;
  assistidoId: number;
  comarca: string;
  vara: string;
  area: string;
  classeProcessual: string;
  assunto: string;
  valorCausa: string;
  parteContraria: string;
  advogadoContrario: string;
  fase: string;
  situacao: string;
  isJuri: boolean;
  dataSessaoJuri: string;
  resultadoJuri: string;
  observacoes: string;
  linkDrive: string;
  // Hierarquia recursal
  instancia: string;
  classeRecursal: string;
  processoOrigemId: number | null;
  defensor2gId: number | null;
  defensorBrasiliaId: number | null;
  camara: string;
  relator: string;
}

export default function NovoProcessoPage() {
  const router = useRouter();
  const { hasArea } = usePermissions();

  const { data: assistidosData, isLoading: loadingAssistidos } = trpc.assistidos.list.useQuery({});
  const assistidosList = (assistidosData ?? []).map((a) => ({ id: a.id, nome: a.nome }));

  const createMutation = trpc.processos.create.useMutation({
    onSuccess: (result) => {
      toast.success("Processo criado com sucesso!");
      router.push(`/admin/processos/${result.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar processo");
    },
  });

  const [formData, setFormData] = useState<FormData>({
    numeroAutos: "",
    numeroAntigo: "",
    assistidoId: 0,
    comarca: "",
    vara: "",
    area: "JURI",
    classeProcessual: "",
    assunto: "",
    valorCausa: "",
    parteContraria: "",
    advogadoContrario: "",
    fase: "conhecimento",
    situacao: "ativo",
    isJuri: false,
    dataSessaoJuri: "",
    resultadoJuri: "",
    observacoes: "",
    linkDrive: "",
    instancia: "PRIMEIRA",
    classeRecursal: "",
    processoOrigemId: null,
    defensor2gId: null,
    defensorBrasiliaId: null,
    camara: "",
    relator: "",
  });

  // Autocompletar processo de origem
  const [origemQuery, setOrigemQuery] = useState("");
  const [origemSearch, setOrigemSearch] = useState("");
  const [origemDropdownOpen, setOrigemDropdownOpen] = useState(false);
  const origemDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: origemResults } = trpc.processos.searchByNumero.useQuery(
    { q: origemSearch },
    { enabled: origemSearch.length >= 3 }
  );

  const handleOrigemInput = (value: string) => {
    setOrigemQuery(value);
    setOrigemDropdownOpen(true);
    if (origemDebounceRef.current) clearTimeout(origemDebounceRef.current);
    origemDebounceRef.current = setTimeout(() => {
      setOrigemSearch(value);
    }, 300);
    if (!value) {
      setFormData(prev => ({ ...prev, processoOrigemId: null }));
    }
  };

  const handleOrigemSelect = (item: { id: number; numeroAutos: string | null; assistidoNome: string | null }) => {
    setOrigemQuery(item.numeroAutos ?? "");
    setFormData(prev => ({ ...prev, processoOrigemId: item.id }));
    setOrigemDropdownOpen(false);
  };

  // Defensores 2G (instancia SEGUNDA, area CRIMINAL)
  const { data: defensores2gData } = trpc.instanciaSuperior.listDefensores.useQuery(
    { instancia: "SEGUNDA", area: "CRIMINAL" },
    { enabled: formData.instancia === "SEGUNDA" }
  );
  const defensores2g = defensores2gData ?? [];

  // Defensores Brasília (STJ/STF) — instancia SEGUNDA sem filtro de area para contemplar PGF/DPU
  const { data: defensoresBrasiliaData } = trpc.instanciaSuperior.listDefensores.useQuery(
    { instancia: "SEGUNDA" },
    { enabled: formData.instancia === "STJ" || formData.instancia === "STF" }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (!formData.numeroAutos.trim()) {
      toast.error("O número dos autos é obrigatório");
      return;
    }
    if (!formData.assistidoId) {
      toast.error("Selecione um assistido");
      return;
    }

    createMutation.mutate({
      assistidoId: formData.assistidoId,
      numeroAutos: formData.numeroAutos,
      comarca: formData.comarca || undefined,
      vara: formData.vara || undefined,
      area: formData.area as "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA",
      classeProcessual: formData.classeProcessual || undefined,
      assunto: formData.assunto || undefined,
      isJuri: formData.isJuri,
      instancia: formData.instancia as "PRIMEIRA" | "SEGUNDA" | "STJ" | "STF" | "SEEU",
      classeRecursal: formData.classeRecursal ? (formData.classeRecursal as "APELACAO" | "AGRAVO_EXECUCAO" | "RESE" | "HC" | "EMBARGOS" | "REVISAO_CRIMINAL" | "CORREICAO_PARCIAL" | "MS" | "RESP" | "RE" | "AGRAVO_RESP" | "AGRAVO_RE" | "RECLAMACAO" | "HC_STJ" | "HC_STF") : undefined,
      processoOrigemId: formData.processoOrigemId ?? undefined,
      defensor2gId: formData.defensor2gId ?? undefined,
      defensorBrasiliaId: formData.defensorBrasiliaId ?? undefined,
      camara: formData.camara || undefined,
      relator: formData.relator || undefined,
    });
  };

  const handleChange = (field: keyof FormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Quando selecionar área do Júri, habilitar isJuri automaticamente
    if (field === "area" && value === "JURI") {
      setFormData(prev => ({ ...prev, isJuri: true }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href="/admin/processos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">Voltar para Processos</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
            <Plus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Novo Processo</h1>
            <p className="text-muted-foreground text-sm">Cadastre um novo processo judicial</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados de Identificação */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação do Processo</CardTitle>
            <CardDescription>Número dos autos e informações de localização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numeroAutos">Número dos Autos *</Label>
                <Input
                  id="numeroAutos"
                  value={formData.numeroAutos}
                  onChange={(e) => handleChange("numeroAutos", e.target.value)}
                  placeholder="0000000-00.0000.8.05.0000"
                  required
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroAntigo">Número Antigo</Label>
                <Input
                  id="numeroAntigo"
                  value={formData.numeroAntigo}
                  onChange={(e) => handleChange("numeroAntigo", e.target.value)}
                  placeholder="Número antigo (se houver)"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistidoId">Assistido *</Label>
              <Select
                value={formData.assistidoId ? String(formData.assistidoId) : ""}
                onValueChange={(value) => handleChange("assistidoId", Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o assistido" />
                </SelectTrigger>
                <SelectContent>
                  {loadingAssistidos ? (
                    <SelectItem value="__loading" disabled>Carregando...</SelectItem>
                  ) : assistidosList.length === 0 ? (
                    <SelectItem value="__empty" disabled>Nenhum assistido encontrado</SelectItem>
                  ) : (
                    assistidosList.map((assistido) => (
                      <SelectItem key={assistido.id} value={String(assistido.id)}>
                        {assistido.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se o assistido não estiver na lista, <Link href="/admin/assistidos/novo" className="text-primary hover:underline">cadastre-o primeiro</Link>.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comarca">Comarca</Label>
                <Input
                  id="comarca"
                  value={formData.comarca}
                  onChange={(e) => handleChange("comarca", e.target.value)}
                  placeholder="Ex: Salvador"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vara">Vara</Label>
                <Input
                  id="vara"
                  value={formData.vara}
                  onChange={(e) => handleChange("vara", e.target.value)}
                  placeholder="Ex: 1ª Vara Criminal"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Processo */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Processo</CardTitle>
            <CardDescription>Classificação e detalhes processuais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">Área *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => handleChange("area", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_AREA_OPTIONS.filter(opt => hasArea(opt.value)).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classeProcessual">Classe Processual</Label>
                <Input
                  id="classeProcessual"
                  value={formData.classeProcessual}
                  onChange={(e) => handleChange("classeProcessual", e.target.value)}
                  placeholder="Ex: Ação Penal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                value={formData.assunto}
                onChange={(e) => handleChange("assunto", e.target.value)}
                placeholder="Ex: Homicídio Qualificado (Art. 121, §2º, CP)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fase">Fase</Label>
                <Select
                  value={formData.fase}
                  onValueChange={(value) => handleChange("fase", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="situacao">Situação</Label>
                <Select
                  value={formData.situacao}
                  onValueChange={(value) => handleChange("situacao", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUACAO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parteContraria">Parte Contrária</Label>
                <Input
                  id="parteContraria"
                  value={formData.parteContraria}
                  onChange={(e) => handleChange("parteContraria", e.target.value)}
                  placeholder="Ex: Ministério Público"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advogadoContrario">Advogado Contrário</Label>
                <Input
                  id="advogadoContrario"
                  value={formData.advogadoContrario}
                  onChange={(e) => handleChange("advogadoContrario", e.target.value)}
                  placeholder="Nome do advogado (se houver)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorCausa">Valor da Causa</Label>
              <Input
                id="valorCausa"
                type="number"
                step="0.01"
                min="0"
                value={formData.valorCausa}
                onChange={(e) => handleChange("valorCausa", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Hierarquia Recursal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Hierarquia Recursal
            </CardTitle>
            <CardDescription>Instância processual e dados recursais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instancia">Instância</Label>
              <Select
                value={formData.instancia}
                onValueChange={(value) => handleChange("instancia", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.instancia !== "PRIMEIRA" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="classeRecursal">Classe Recursal</Label>
                  <Select
                    value={formData.classeRecursal}
                    onValueChange={(value) => handleChange("classeRecursal", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a classe recursal" />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSE_RECURSAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="processoOrigem">Processo de Origem (opcional)</Label>
                  <Input
                    id="processoOrigem"
                    value={origemQuery}
                    onChange={(e) => handleOrigemInput(e.target.value)}
                    onFocus={() => origemQuery.length >= 3 && setOrigemDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setOrigemDropdownOpen(false), 200)}
                    placeholder="Digite o número do processo de origem..."
                    className="font-mono"
                    autoComplete="off"
                  />
                  {formData.processoOrigemId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">Processo de origem selecionado (ID: {formData.processoOrigemId})</p>
                  )}
                  {origemDropdownOpen && origemResults && origemResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                      {origemResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                          onMouseDown={() => handleOrigemSelect(item)}
                        >
                          <span className="font-mono">{item.numeroAutos}</span>
                          {item.assistidoNome && (
                            <span className="ml-2 text-muted-foreground">— {item.assistidoNome}</span>
                          )}
                          {item.classeProcessual && (
                            <span className="ml-2 text-xs text-muted-foreground">({item.classeProcessual})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {formData.instancia === "SEGUNDA" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="camara">Câmara</Label>
                    <Input
                      id="camara"
                      value={formData.camara}
                      onChange={(e) => handleChange("camara", e.target.value)}
                      placeholder="Ex: 1ª Câmara Criminal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="relator">Relator</Label>
                    <Input
                      id="relator"
                      value={formData.relator}
                      onChange={(e) => handleChange("relator", e.target.value)}
                      placeholder="Nome do relator"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defensor2g">Defensor 2º Grau</Label>
                  <Select
                    value={formData.defensor2gId ? String(formData.defensor2gId) : ""}
                    onValueChange={(value) => handleChange("defensor2gId", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o defensor 2º grau" />
                    </SelectTrigger>
                    <SelectContent>
                      {defensores2g.length === 0 ? (
                        <SelectItem value="__empty" disabled>Nenhum defensor encontrado</SelectItem>
                      ) : (
                        defensores2g.map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {(formData.instancia === "STJ" || formData.instancia === "STF") && (
              <div className="space-y-2">
                <Label htmlFor="defensorBrasilia">Defensor Brasília</Label>
                <Select
                  value={formData.defensorBrasiliaId ? String(formData.defensorBrasiliaId) : ""}
                  onValueChange={(value) => handleChange("defensorBrasiliaId", Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o defensor em Brasília" />
                  </SelectTrigger>
                  <SelectContent>
                    {(defensoresBrasiliaData ?? []).length === 0 ? (
                      <SelectItem value="__empty" disabled>Nenhum defensor encontrado</SelectItem>
                    ) : (
                      (defensoresBrasiliaData ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.nome}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tribunal do Júri */}
        {hasArea("JURI") && (
          <Card className={formData.isJuri ? "border-purple-200 dark:border-purple-800/50" : ""}>
            <CardHeader className={formData.isJuri ? "bg-purple-50/50 dark:bg-purple-900/10" : ""}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`flex items-center gap-2 ${formData.isJuri ? "text-purple-700 dark:text-purple-400" : ""}`}>
                    <Gavel className="h-5 w-5" />
                    Tribunal do Júri
                  </CardTitle>
                  <CardDescription>Configure se este é um processo do Júri</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="isJuri">Processo do Júri</Label>
                  <Switch
                    id="isJuri"
                    checked={formData.isJuri}
                    onCheckedChange={(checked) => handleChange("isJuri", checked)}
                  />
                </div>
              </div>
            </CardHeader>
            {formData.isJuri && (
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataSessaoJuri">Data da Sessão</Label>
                    <Input
                      id="dataSessaoJuri"
                      type="date"
                      value={formData.dataSessaoJuri}
                      onChange={(e) => handleChange("dataSessaoJuri", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resultadoJuri">Resultado</Label>
                    <Input
                      id="resultadoJuri"
                      value={formData.resultadoJuri}
                      onChange={(e) => handleChange("resultadoJuri", e.target.value)}
                      placeholder="Resultado do julgamento"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Integrações e Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Integrações e Observações</CardTitle>
            <CardDescription>Links externos e anotações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkDrive">Link da Pasta no Google Drive</Label>
              <Input
                id="linkDrive"
                type="url"
                value={formData.linkDrive}
                onChange={(e) => handleChange("linkDrive", e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Anotações e observações sobre o processo..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/processos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Criar Processo
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
