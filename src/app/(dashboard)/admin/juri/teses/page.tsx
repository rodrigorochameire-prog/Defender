"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GripVertical, ShieldCheck, Lightbulb, MessageSquare } from "lucide-react";

const fatosAcusacao = [
  { id: "f1", fato: "O acusado estava no local do crime.", resposta: "" },
  { id: "f2", fato: "Houve motivo fútil para a agressão.", resposta: "" },
  { id: "f3", fato: "Testemunha confirmou autoria.", resposta: "" },
];

const teses = [
  {
    id: "t1",
    titulo: "Negativa de Autoria",
    tipo: "Principal",
    argumentos: [
      "Fragilidade do reconhecimento",
      "Ausência de prova técnica conclusiva",
      "Contradições entre fase policial e judicial",
    ],
  },
  {
    id: "t2",
    titulo: "Legítima Defesa Putativa",
    tipo: "Subsidiária",
    argumentos: [
      "Percepção subjetiva de ameaça",
      "Ambiente hostil com histórico prévio",
      "Proporcionalidade dos atos",
    ],
  },
];

const argumentosMp = [
  {
    id: "mp1",
    argumento: "Motivo torpe e desproporcional.",
    contra: "Demonstrar ausência de motivo e contexto provocatório.",
  },
  {
    id: "mp2",
    argumento: "Testemunha ocular confirmou a autoria.",
    contra: "Explorar inconsistências e condições de visibilidade.",
  },
];

export default function TesesJuriPage() {
  const [narrativa, setNarrativa] = useState("");

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/juri">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Banco de Teses & Argumentos</h1>
            <p className="text-sm text-muted-foreground">
              Estruture narrativa, teses e antecipações do MP.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-indigo-300 text-indigo-700">
          Estratégia Defensiva
        </Badge>
      </div>

      <Card className="section-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            Construtor de Narrativa
          </CardTitle>
          <CardDescription>Crie a contranarrativa e rebata ponto a ponto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contranarrativa da Defesa</h3>
            <Textarea
              value={narrativa}
              onChange={(event) => setNarrativa(event.target.value)}
              placeholder="Descreva a história da defesa em linguagem clara e envolvente."
              className="min-h-[180px]"
            />
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Salvar narrativa</Button>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Fatos da Acusação</h3>
            {fatosAcusacao.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-sm font-medium">{item.fato}</p>
                <Textarea
                  placeholder="Resposta defensiva..."
                  className="mt-2 min-h-[80px]"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="teses" className="space-y-4">
        <TabsList className="bg-muted/60">
          <TabsTrigger value="teses">Cards de Tese</TabsTrigger>
          <TabsTrigger value="anticipacao">Antecipação do MP</TabsTrigger>
        </TabsList>

        <TabsContent value="teses" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {teses.map((tese) => (
              <Card key={tese.id} className="border-slate-200/60 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {tese.titulo}
                      </CardTitle>
                      <CardDescription>Tese {tese.tipo}</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-indigo-200 text-indigo-600">
                      {tese.tipo}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {tese.argumentos.map((argumento) => (
                    <div key={argumento} className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                      {argumento}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input placeholder="Adicionar sub-argumento" />
                    <Button size="sm">+</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="anticipacao" className="space-y-4">
          <Card className="section-card">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-rose-500" />
                O que o Promotor vai dizer
              </CardTitle>
              <CardDescription>
                Vincule cada argumento do MP à sua contra-argumentação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {argumentosMp.map((item) => (
                <div key={item.id} className="rounded-lg border border-rose-100 dark:border-rose-900/40 p-3">
                  <p className="text-sm font-semibold text-rose-600">MP: {item.argumento}</p>
                  <Textarea
                    className="mt-2 min-h-[90px]"
                    placeholder="Contra-argumento da defesa..."
                    defaultValue={item.contra}
                  />
                </div>
              ))}
              <Button className="bg-rose-600 hover:bg-rose-500 text-white">
                Adicionar novo argumento do MP
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
