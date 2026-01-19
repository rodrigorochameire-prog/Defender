"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FolderOpen,
  Plus,
  FileText,
  Download,
  Eye,
  Copy,
} from "lucide-react";
import Link from "next/link";

const templates = [
  { id: 1, nome: "Resposta à Acusação", area: "Júri", downloads: 45 },
  { id: 2, nome: "Alegações Finais", area: "Júri", downloads: 38 },
  { id: 3, nome: "Memoriais", area: "Júri", downloads: 22 },
  { id: 4, nome: "Pedido de Relaxamento", area: "Geral", downloads: 56 },
  { id: 5, nome: "Habeas Corpus", area: "Geral", downloads: 89 },
  { id: 6, nome: "Agravo em Execução", area: "Exec. Penal", downloads: 34 },
  { id: 7, nome: "Pedido de Progressão", area: "Exec. Penal", downloads: 67 },
  { id: 8, nome: "Pedido de Livramento", area: "Exec. Penal", downloads: 45 },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de Peças</h1>
          <p className="text-muted-foreground mt-1">
            Modelos de peças processuais para agilizar a produção
          </p>
        </div>
        <Link href="/admin/templates/novo">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.nome}</CardTitle>
                    <CardDescription>
                      <Badge variant="outline" className="mt-1">{template.area}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {template.downloads} downloads
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
