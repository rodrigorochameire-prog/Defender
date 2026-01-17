"use client";

import { useState } from "react";
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
  Scale, 
  ArrowLeft,
  Save,
  Gavel,
  Loader2,
  Plus,
} from "lucide-react";

// Mock de assistidos para o select
const mockAssistidos = [
  { id: 1, nome: "Diego Bonfim Almeida" },
  { id: 2, nome: "Maria Silva Santos" },
  { id: 3, nome: "José Carlos Oliveira" },
  { id: 4, nome: "Ana Paula Costa" },
  { id: 5, nome: "Roberto Ferreira Lima" },
];

const AREA_OPTIONS = [
  { value: "JURI", label: "Tribunal do Júri" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal" },
  { value: "VIOLENCIA_DOMESTICA", label: "Violência Doméstica" },
  { value: "SUBSTITUICAO", label: "Substituição" },
  { value: "CURADORIA", label: "Curadoria" },
  { value: "FAMILIA", label: "Família" },
  { value: "CIVEL", label: "Cível" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Pública" },
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
}

export default function NovoProcessoPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.numeroAutos.trim()) {
      alert("O número dos autos é obrigatório");
      return;
    }
    if (!formData.assistidoId) {
      alert("Selecione um assistido");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Em produção, chamar TRPC para criar
      console.log("Criando processo:", formData);
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redirecionar para a lista de processos
      router.push("/admin/processos");
    } catch (error) {
      console.error("Erro ao criar:", error);
    } finally {
      setIsSaving(false);
    }
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
                  {mockAssistidos.map((assistido) => (
                    <SelectItem key={assistido.id} value={String(assistido.id)}>
                      {assistido.nome}
                    </SelectItem>
                  ))}
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
                    {AREA_OPTIONS.map((option) => (
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

        {/* Tribunal do Júri */}
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
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
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
