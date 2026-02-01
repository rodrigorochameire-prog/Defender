"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Gavel, 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Users,
  Save,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NovaSessaoJuriPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular salvamento
    setTimeout(() => {
      router.push("/admin/juri");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* SUB-HEADER - Padrão Defender */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center border border-violet-200 dark:border-violet-800">
              <Plus className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Nova Sessão do Júri</h1>
              <p className="text-[10px] text-zinc-500">Agende uma nova sessão plenária</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4">

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data e Local
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="data">Data da Sessão *</Label>
                <Input id="data" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora">Horário *</Label>
                <Input id="hora" type="time" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="local">Local</Label>
              <Input id="local" placeholder="Ex: Fórum de Camaçari - Sala do Júri" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Réu e Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processo">Processo *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">0000123-45.2025.8.05.0039 - João Silva</SelectItem>
                  <SelectItem value="2">0000456-78.2025.8.05.0039 - Maria Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Sessão</Label>
              <Select defaultValue="PLENARIO">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLENARIO">Plenário</SelectItem>
                  <SelectItem value="INSTRUCAO">Instrução</SelectItem>
                  <SelectItem value="PRONUNCIA">Pronúncia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="juiz">Juiz Presidente</Label>
                <Input id="juiz" placeholder="Nome do juiz" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promotor">Promotor</Label>
                <Input id="promotor" placeholder="Nome do promotor" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jurados">Jurados Convocados</Label>
              <Input id="jurados" type="number" placeholder="25" defaultValue={25} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="w-4 h-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Observações sobre a sessão..." 
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/juri">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar Sessão"}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
