"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  LayoutGrid,
  MapPin,
  Briefcase,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";

const mockJurados = [
  { id: 1, nome: "Maria Silva", profissao: "Assistente Social", idade: 41, bairro: "Centro", tendencia: 4 },
  { id: 2, nome: "José Almeida", profissao: "Policial Aposentado", idade: 62, bairro: "Gleba B", tendencia: -6 },
  { id: 3, nome: "Ana Souza", profissao: "Professora", idade: 36, bairro: "Vila Nova", tendencia: 2 },
  { id: 4, nome: "Paulo Costa", profissao: "Empresário", idade: 53, bairro: "Phoc III", tendencia: -2 },
  { id: 5, nome: "Carla Mendes", profissao: "Psicóloga", idade: 39, bairro: "Centro", tendencia: 5 },
  { id: 6, nome: "Roberto Lima", profissao: "Comerciante", idade: 47, bairro: "Alto", tendencia: -1 },
  { id: 7, nome: "Fernanda Dias", profissao: "Enfermeira", idade: 44, bairro: "Parque Verde", tendencia: 3 },
  { id: 8, nome: "Bruno Reis", profissao: "Motorista", idade: 50, bairro: "Piatã", tendencia: 0 },
];

const tesesDisponiveis = [
  "Violência Policial",
  "Legítima Defesa",
  "Inexigibilidade de Conduta",
  "Negativa de Autoria",
  "Excesso de Prazo",
];

function getRiskLabel(score: number) {
  if (score >= 6) return { label: "Risco Baixo", color: "text-emerald-600", bg: "bg-emerald-100" };
  if (score >= 2) return { label: "Risco Moderado", color: "text-amber-600", bg: "bg-amber-100" };
  if (score >= -2) return { label: "Risco Elevado", color: "text-orange-600", bg: "bg-orange-100" };
  return { label: "Risco Altíssimo", color: "text-rose-600", bg: "bg-rose-100" };
}

function getTrendIcon(score: number) {
  if (score >= 3) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (score <= -3) return <TrendingDown className="h-4 w-4 text-rose-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

export default function ProfilerJuradosPage() {
  const [profissao, setProfissao] = useState("");
  const [idade, setIdade] = useState(45);
  const [bairro, setBairro] = useState("");
  const [tese, setTese] = useState(tesesDisponiveis[0]);
  const [assentos, setAssentos] = useState<(typeof mockJurados[0] | null)[]>(Array(7).fill(null));
  const [assentoSelecionado, setAssentoSelecionado] = useState<number | null>(null);
  const [statusJurados, setStatusJurados] = useState<Record<number, string>>({});

  const veredictoScore = useMemo(() => {
    let score = 0;
    const prof = profissao.toLowerCase();
    if (prof.includes("policial")) score -= 4;
    if (prof.includes("militar")) score -= 3;
    if (prof.includes("assistente social") || prof.includes("psicóloga")) score += 3;
    if (prof.includes("professor") || prof.includes("enfermeira")) score += 2;
    if (idade >= 60) score -= 2;
    if (idade <= 30) score += 1;
    if (bairro.toLowerCase().includes("centro")) score += 1;

    if (tese === "Violência Policial") score -= 3;
    if (tese === "Inexigibilidade de Conduta") score += 2;
    if (tese === "Legítima Defesa") score += 1;
    if (tese === "Negativa de Autoria") score += 1;

    return Math.max(-10, Math.min(10, score));
  }, [profissao, idade, bairro, tese]);

  const risk = getRiskLabel(veredictoScore + 5);
  const remainingRecusas = 3 - Object.values(statusJurados).filter((s) => s === "recusado_defesa").length;

  const handleAssign = (jurado: typeof mockJurados[0]) => {
    if (assentoSelecionado === null) return;
    setAssentos((prev) => prev.map((item, idx) => (idx === assentoSelecionado ? jurado : item)));
    setAssentoSelecionado(null);
  };

  const handleRemove = (index: number) => {
    setAssentos((prev) => prev.map((item, idx) => (idx === index ? null : item)));
  };

  const handleStatus = (id: number, status: string) => {
    setStatusJurados((prev) => ({ ...prev, [id]: status }));
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/jurados">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Brain className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">Profiler de Jurados 2.0</h1>
              <Badge className="bg-amber-500 text-white text-[10px]">
                <Sparkles className="w-3 h-3 mr-0.5" />
                Premium
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Tendência de voto, assentos e modo recusa.
            </p>
          </div>
        </div>
      </div>

      <Card className="section-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Veredictômetro (Tendência de Risco)
          </CardTitle>
          <CardDescription>Simule o impacto do perfil do jurado na tese.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Profissão</label>
              <Input value={profissao} onChange={(event) => setProfissao(event.target.value)} placeholder="Ex: policial aposentado" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Idade</label>
              <Input type="number" value={idade} onChange={(event) => setIdade(Number(event.target.value))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Bairro</label>
              <Input value={bairro} onChange={(event) => setBairro(event.target.value)} placeholder="Ex: Centro" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Tese aplicada</label>
              <Select value={tese} onValueChange={setTese}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tese" />
                </SelectTrigger>
                <SelectContent>
                  {tesesDisponiveis.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <p className="text-sm font-semibold">Pontuação de risco</p>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${risk.color}`}>{veredictoScore}</span>
              <Badge className={`${risk.bg} ${risk.color} border-0`}>{risk.label}</Badge>
            </div>
            <Progress value={(veredictoScore + 10) * 5} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Quanto maior a pontuação, maior a tendência favorável à defesa.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="section-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-blue-500" />
              Mapa de Lugares (Seat Map)
            </CardTitle>
            <CardDescription>Selecione um assento e associe o jurado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {assentos.map((jurado, index) => (
                <button
                  key={index}
                  onClick={() => setAssentoSelecionado(index)}
                  className={`rounded-lg border p-3 text-xs font-semibold ${
                    assentoSelecionado === index ? "border-blue-500 bg-blue-50" : "border-slate-200"
                  }`}
                >
                  <span className="block text-slate-500">Assento {index + 1}</span>
                  <span className="block mt-1">{jurado ? jurado.nome : "Vazio"}</span>
                  {jurado && (
                    <span className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                      {getTrendIcon(jurado.tendencia)} {jurado.tendencia}
                    </span>
                  )}
                  {jurado && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemove(index);
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </button>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {mockJurados.map((jurado) => (
                <button
                  key={jurado.id}
                  onClick={() => handleAssign(jurado)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-left hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{jurado.nome}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {jurado.profissao}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {jurado.bairro}
                      </p>
                    </div>
                    {getTrendIcon(jurado.tendencia)}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="section-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-500" />
              Modo Recusa
            </CardTitle>
            <CardDescription>
              Controle rápido durante o sorteio (3 recusas imotivadas).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-200 text-emerald-600">
                Recusas restantes: {remainingRecusas}
              </Badge>
            </div>
            {mockJurados.slice(0, 6).map((jurado) => (
              <div key={jurado.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{jurado.nome}</p>
                    <p className="text-xs text-muted-foreground">{jurado.profissao}</p>
                  </div>
                  <Badge variant="outline">
                    {statusJurados[jurado.id] ? statusJurados[jurado.id] : "pendente"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleStatus(jurado.id, "aceito")}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleStatus(jurado.id, "recusado_defesa")}
                  >
                    <XCircle className="h-4 w-4 text-rose-500" />
                    Recusar Defesa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => handleStatus(jurado.id, "recusado_mp")}
                  >
                    <XCircle className="h-4 w-4 text-orange-500" />
                    Recusar MP
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
