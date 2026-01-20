"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  FileText, 
  ArrowLeft,
  Calendar,
  User,
  Scale,
  Save,
  Plus,
  Clock,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NovaDemandaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [reuPreso, setReuPreso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular salvamento
    setTimeout(() => {
      router.push("/admin/demandas");
    }, 1000);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/demandas">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Nova Demanda
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Registre uma nova demanda processual
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Assistido e Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assistido">Assistido *</Label>
              <Input id="assistido" placeholder="Nome do assistido" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processo">Número do Processo</Label>
              <Input id="processo" placeholder="0000000-00.0000.0.00.0000" className="font-mono" />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="reuPreso" 
                checked={reuPreso}
                onCheckedChange={(checked) => setReuPreso(checked as boolean)}
              />
              <label
                htmlFor="reuPreso"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-rose-500" />
                Réu Preso
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ato Processual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ato">Ato *</Label>
                <Input id="ato" placeholder="Ex: Resposta à Acusação" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipoAto">Tipo de Ato</Label>
                <Select defaultValue="resposta_acusacao">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resposta_acusacao">Resposta à Acusação</SelectItem>
                    <SelectItem value="alegacoes_finais">Alegações Finais</SelectItem>
                    <SelectItem value="apelacao">Apelação</SelectItem>
                    <SelectItem value="habeas_corpus">Habeas Corpus</SelectItem>
                    <SelectItem value="revogacao_prisao">Revogação de Prisão</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select defaultValue="JURI">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JURI">Tribunal do Júri</SelectItem>
                  <SelectItem value="VIOLENCIA_DOMESTICA">Violência Doméstica</SelectItem>
                  <SelectItem value="EXECUCAO">Execução Penal</SelectItem>
                  <SelectItem value="CRIMINAL">Criminal Comum</SelectItem>
                  <SelectItem value="CIVEL">Cível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Prazos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="prazo">Prazo Fatal</Label>
                <Input id="prazo" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataEntrada">Data de Entrada</Label>
                <Input id="dataEntrada" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataIntimacao">Data da Intimação</Label>
                <Input id="dataIntimacao" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select defaultValue="5_FILA">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_URGENTE">Urgente</SelectItem>
                  <SelectItem value="2_ELABORAR">Elaborar</SelectItem>
                  <SelectItem value="3_PROTOCOLAR">Protocolar</SelectItem>
                  <SelectItem value="5_FILA">Fila</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Providências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Descreva as providências necessárias..." 
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/demandas">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar Demanda"}
          </Button>
        </div>
      </form>
    </div>
  );
}
