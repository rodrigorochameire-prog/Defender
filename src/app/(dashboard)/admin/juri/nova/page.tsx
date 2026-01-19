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
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-purple-700 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Nova Sessão do Júri
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Agende uma nova sessão plenária
            </p>
          </div>
        </div>
      </div>

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
  );
}
