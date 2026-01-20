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
import { 
  FileText, 
  ArrowLeft,
  Save,
  Plus,
  Tag,
  FolderOpen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NovoTemplatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simular salvamento
    setTimeout(() => {
      router.push("/admin/templates");
    }, 1000);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/templates">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-700 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Novo Template
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Crie um novo modelo de petição
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Informações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título do Template *</Label>
              <Input id="titulo" placeholder="Ex: Resposta à Acusação - Negativa de Autoria" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Input id="descricao" placeholder="Breve descrição do template" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select defaultValue="resposta_acusacao">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resposta_acusacao">Resposta à Acusação</SelectItem>
                    <SelectItem value="alegacoes_finais">Alegações Finais</SelectItem>
                    <SelectItem value="apelacao">Apelação</SelectItem>
                    <SelectItem value="habeas_corpus">Habeas Corpus</SelectItem>
                    <SelectItem value="memoriais">Memoriais</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="GERAL">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags e Palavras-chave
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input id="tags" placeholder="legítima defesa, negativa de autoria, desclassificação" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Conteúdo do Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="conteudo">Texto do Template *</Label>
              <Textarea 
                id="conteudo"
                placeholder="Cole ou escreva o conteúdo do template aqui...

Use variáveis como:
{{NOME_ASSISTIDO}}
{{NUMERO_PROCESSO}}
{{DATA}}
{{COMARCA}}" 
                rows={20}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                Dica: Use {"{{VARIAVEL}}"} para campos que serão substituídos automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/templates">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            <Save className="w-4 h-4" />
            {isLoading ? "Salvando..." : "Salvar Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
