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
  Users, 
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Save,
  Plus,
  Lock,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NovoAssistidoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [preso, setPreso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular salvamento
    setTimeout(() => {
      router.push("/admin/assistidos");
    }, 1000);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/assistidos">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Novo Assistido
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Cadastre um novo assistido
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
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input id="nome" placeholder="Nome completo do assistido" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" placeholder="Número do RG" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input id="dataNascimento" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="preso" 
                checked={preso}
                onCheckedChange={(checked) => setPreso(checked as boolean)}
              />
              <label
                htmlFor="preso"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-rose-500" />
                Está Preso
              </label>
            </div>
            {preso && (
              <div className="space-y-2">
                <Label htmlFor="unidadePrisional">Unidade Prisional</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CADEIA_PUBLICA">Cadeia Pública</SelectItem>
                    <SelectItem value="COP">COP - Centro de Obs. Penal</SelectItem>
                    <SelectItem value="CPMS">CPMS - Simões Filho</SelectItem>
                    <SelectItem value="PLB">PLB - Lemos Brito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone2">Telefone Alternativo</Label>
                <Input id="telefone2" placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="email@exemplo.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" placeholder="Rua, número, complemento" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" placeholder="Bairro" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" placeholder="00000-000" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Informações adicionais sobre o assistido..." 
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/assistidos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar Assistido"}
          </Button>
        </div>
      </form>
    </div>
  );
}
