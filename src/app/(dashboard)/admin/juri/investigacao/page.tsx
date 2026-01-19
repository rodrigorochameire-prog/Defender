"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Radar,
  Search,
  FileText,
  ClipboardCheck,
  MapPin,
  Phone,
  Globe,
} from "lucide-react";

const osintSources = [
  { label: "Jusbrasil", base: "https://www.jusbrasil.com.br/busca?q=" },
  { label: "Escavador", base: "https://www.escavador.com/busca?q=" },
  { label: "Facebook", base: "https://www.facebook.com/search/top/?q=" },
  { label: "Instagram", base: "https://www.instagram.com/explore/tags/" },
  { label: "LinkedIn", base: "https://www.linkedin.com/search/results/all/?keywords=" },
  { label: "Portal Transparência", base: "https://portaldatransparencia.gov.br/busca?termo=" },
  { label: "Diário Oficial", base: "https://www.jusbrasil.com.br/diarios/busca?q=" },
];

const kanbanColumns = [
  {
    id: "pesquisar",
    title: "A Pesquisar",
    accent: "border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20",
    tasks: [
      {
        id: "busca-testemunha",
        title: "Busca de Testemunha",
        description: "Levantamento de contatos e endereços",
        fields: [
          { id: "nome", label: "Nome completo", icon: Search },
          { id: "telefone", label: "Telefone", icon: Phone },
          { id: "endereco", label: "Endereço provável", icon: MapPin },
        ],
      },
      {
        id: "rede-social",
        title: "Mapeamento de Redes",
        description: "Perfis e conexões relevantes",
        fields: [
          { id: "facebook", label: "Facebook/Instagram", icon: Globe },
          { id: "linkedin", label: "LinkedIn", icon: Globe },
        ],
      },
    ],
  },
  {
    id: "analise",
    title: "Em Análise",
    accent: "border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20",
    tasks: [
      {
        id: "requisicao-docs",
        title: "Requisição de Documentos",
        description: "Controle de ofícios e respostas",
        checklist: [
          { id: "oficio", label: "Ofício expedido" },
          { id: "resposta", label: "Resposta recebida" },
          { id: "ciencia", label: "Ciência da defesa" },
        ],
      },
    ],
  },
  {
    id: "obtido",
    title: "Localizado/Obtido",
    accent: "border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20",
    tasks: [
      {
        id: "pericia",
        title: "Perícia e Quesitos",
        description: "Quesitos técnicos para o laudo",
        textarea: "Descreva os quesitos específicos que precisam ser respondidos pela perícia.",
      },
      {
        id: "documentos-chave",
        title: "Documentos-chave",
        description: "Laudos e registros confirmados",
        checklist: [
          { id: "laudo", label: "Laudo pericial anexado" },
          { id: "mapa", label: "Mapa do local" },
          { id: "laudo-necropsia", label: "Laudo de necropsia" },
        ],
      },
    ],
  },
  {
    id: "infrutifero",
    title: "Infrutífero",
    accent: "border-rose-300/60 bg-rose-50/40 dark:bg-rose-950/20",
    tasks: [
      {
        id: "busca-infrutifera",
        title: "Busca Infrutífera",
        description: "Registrar diligências sem êxito",
        textarea: "Relate o que foi tentado e por que não houve êxito.",
      },
    ],
  },
];

export default function InvestigacaoJuriPage() {
  const [osintQuery, setOsintQuery] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const links = useMemo(() => {
    if (!osintQuery.trim()) return [];
    return osintSources.map((source) => ({
      label: source.label,
      href:
        source.label === "Instagram"
          ? `${source.base}${encodeURIComponent(osintQuery.trim())}`
          : `${source.base}${encodeURIComponent(osintQuery.trim())}`,
    }));
  }, [osintQuery]);

  const handleToggle = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <Radar className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Investigação & OSINT</h1>
            <p className="text-sm text-muted-foreground">
              Painel de providências e diligências do júri
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
          Fluxo Kanban
        </Badge>
      </div>

      <Card className="border-emerald-200/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            Radar OSINT
          </CardTitle>
          <CardDescription>
            Cole um nome e gere links diretos para fontes abertas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              value={osintQuery}
              onChange={(event) => setOsintQuery(event.target.value)}
              placeholder="Ex: João Carlos da Silva"
              className="md:flex-1"
            />
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
              <Search className="h-4 w-4" />
              Gerar Radar
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {links.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Preencha o nome para exibir os links de pesquisa.
              </p>
            )}
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:border-emerald-300 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-4">
        {kanbanColumns.map((column) => (
          <Card key={column.id} className={`border ${column.accent}`}>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{column.title}</CardTitle>
              <CardDescription>Arraste mentalmente as tarefas conforme o avanço.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {column.tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-border/60 bg-card p-3 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                      {task.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  </div>

                  {task.fields && (
                    <div className="space-y-2">
                      {task.fields.map((field) => (
                        <div key={field.id} className="flex items-center gap-2">
                          <field.icon className="h-4 w-4 text-muted-foreground" />
                          <Input placeholder={field.label} />
                        </div>
                      ))}
                    </div>
                  )}

                  {task.checklist && (
                    <div className="space-y-2">
                      {task.checklist.map((item) => (
                        <label key={item.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={!!checks[item.id]}
                            onCheckedChange={() => handleToggle(item.id)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {task.textarea && (
                    <Textarea
                      placeholder={task.textarea}
                      className="min-h-[90px]"
                    />
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Anexe referências dos autos quando possível.
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
