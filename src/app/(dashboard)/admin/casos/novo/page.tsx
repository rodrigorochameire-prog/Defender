"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  ArrowLeft,
  Save,
  Plus,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ==========================================
// CONFIGURAÇÕES
// ==========================================

const ATRIBUICAO_OPTIONS = [
  { value: "JURI_CAMACARI", label: "Tribunal do Júri - Camaçari" },
  { value: "VVD_CAMACARI", label: "Violência Doméstica - Camaçari" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal" },
  { value: "SUBSTITUICAO", label: "Substituição Criminal" },
  { value: "SUBSTITUICAO_CIVEL", label: "Substituição Cível" },
  { value: "GRUPO_JURI", label: "Grupo Especial do Júri" },
];

const FASE_OPTIONS = [
  { value: "inquerito", label: "Inquérito" },
  { value: "instrucao", label: "Instrução" },
  { value: "plenario", label: "Plenário" },
  { value: "recurso", label: "Recurso" },
  { value: "execucao", label: "Execução" },
];

const PRIORIDADE_OPTIONS = [
  { value: "BAIXA", label: "Baixa" },
  { value: "NORMAL", label: "Normal" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" },
  { value: "REU_PRESO", label: "Réu Preso" },
];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function NovoCasoPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    titulo: "",
    codigo: "",
    atribuicao: "",
    fase: "",
    prioridade: "NORMAL",
    teoriaFatos: "",
    teoriaProvas: "",
    teoriaDireito: "",
    linkDrive: "",
    observacoes: "",
  });

  const createMutation = trpc.casos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Caso criado com sucesso!");
      router.push(`/admin/casos/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar caso");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    
    if (!formData.atribuicao) {
      toast.error("Atribuição é obrigatória");
      return;
    }

    createMutation.mutate({
      titulo: formData.titulo,
      codigo: formData.codigo || undefined,
      atribuicao: formData.atribuicao as any,
      fase: formData.fase || undefined,
      prioridade: formData.prioridade as any,
      teoriaFatos: formData.teoriaFatos || undefined,
      teoriaProvas: formData.teoriaProvas || undefined,
      teoriaDireito: formData.teoriaDireito || undefined,
      linkDrive: formData.linkDrive || undefined,
      observacoes: formData.observacoes || undefined,
    });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/casos">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Novo Caso</h1>
              <p className="text-sm text-muted-foreground">Cadastre um novo caso para gestão</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Dados Básicos
          </h2>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Caso *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Homicídio Qualificado - Operação Reuso"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="text-base"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código Interno</Label>
                <Input
                  id="codigo"
                  placeholder="Ex: CASO-2026-001"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Atribuição *</Label>
                <Select 
                  value={formData.atribuicao} 
                  onValueChange={(v) => setFormData({ ...formData, atribuicao: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ATRIBUICAO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fase Processual</Label>
                <Select 
                  value={formData.fase} 
                  onValueChange={(v) => setFormData({ ...formData, fase: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FASE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select 
                  value={formData.prioridade} 
                  onValueChange={(v) => setFormData({ ...formData, prioridade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Teoria do Caso */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Teoria do Caso (opcional)
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teoriaFatos">Fatos</Label>
              <Textarea
                id="teoriaFatos"
                placeholder="Descreva os fatos relevantes do caso..."
                value={formData.teoriaFatos}
                onChange={(e) => setFormData({ ...formData, teoriaFatos: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teoriaProvas">Provas</Label>
              <Textarea
                id="teoriaProvas"
                placeholder="Descreva as provas disponíveis..."
                value={formData.teoriaProvas}
                onChange={(e) => setFormData({ ...formData, teoriaProvas: e.target.value })}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teoriaDireito">Direito</Label>
              <Textarea
                id="teoriaDireito"
                placeholder="Fundamentos jurídicos da defesa..."
                value={formData.teoriaDireito}
                onChange={(e) => setFormData({ ...formData, teoriaDireito: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </Card>

        {/* Links e Observações */}
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Informações Adicionais
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkDrive">Link do Google Drive</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="linkDrive"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={formData.linkDrive}
                  onChange={(e) => setFormData({ ...formData, linkDrive: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Anotações gerais sobre o caso..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
          </div>
        </Card>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/casos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Criar Caso
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
