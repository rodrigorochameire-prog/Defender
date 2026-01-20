"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  ArrowLeft,
  Sparkles,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Brain,
  MessageCircle,
  Quote,
  Search,
} from "lucide-react";

type SpeechAnalysis = {
  apeloRazao: string;
  apeloEmocao: string;
  frasesEfeito: string;
  conclusao: string;
  recomendacoes: string[];
};

const analogias = [
  {
    id: "a1",
    titulo: "A dúvida como sombra",
    descricao: "A sombra não é prova de luz; a dúvida não é certeza de culpa.",
    tags: ["dúvida", "razoável", "prova"],
  },
  {
    id: "a2",
    titulo: "O vaso quebrado",
    descricao: "Não se reconstrói um vaso com suposições, mas com peças concretas.",
    tags: ["prova", "fragmentos", "nexo"],
  },
  {
    id: "a3",
    titulo: "O farol na neblina",
    descricao: "A defesa precisa do farol das provas, não da neblina das versões.",
    tags: ["contradição", "prova", "consistência"],
  },
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function localSpeechAnalysis(text: string): SpeechAnalysis {
  const lower = text.toLowerCase();
  const countMatches = (keywords: string[]) =>
    keywords.reduce((acc, keyword) => (lower.includes(keyword) ? acc + 1 : acc), 0);

  const razao = countMatches(["prova", "fato", "contradição", "perícia", "artigo", "jurisprudência"]);
  const emocao = countMatches(["família", "dor", "vida", "injustiça", "medo", "humanidade", "compaixão"]);
  const efeito = countMatches(["senhores jurados", "justiça", "verdade", "dúvida", "não há certeza"]);
  const conclusao = countMatches(["portanto", "diante", "concluo", "por fim", "assim"]);

  const nivel = (value: number) => (value >= 3 ? "alto" : value === 2 ? "médio" : "baixo");

  const recomendacoes: string[] = [];
  if (razao < 2) recomendacoes.push("Inclua referências diretas às provas e aos autos.");
  if (emocao < 2) recomendacoes.push("Acrescente elementos humanos e empáticos.");
  if (efeito < 2) recomendacoes.push("Inclua uma ou duas frases de efeito memoráveis.");
  if (conclusao < 1) recomendacoes.push("Reforce uma conclusão clara e objetiva.");

  return {
    apeloRazao: `Nível ${nivel(razao)} (sinais identificados: ${razao}).`,
    apeloEmocao: `Nível ${nivel(emocao)} (sinais identificados: ${emocao}).`,
    frasesEfeito: `Nível ${nivel(efeito)} (sinais identificados: ${efeito}).`,
    conclusao: `Nível ${nivel(conclusao)} (sinais identificados: ${conclusao}).`,
    recomendacoes: recomendacoes.length
      ? recomendacoes
      : ["Discurso bem equilibrado. Ajuste apenas o ritmo e a ênfase final."],
  };
}

export default function LaboratorioOratoriaPage() {
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [draft, setDraft] = useState("");
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analogyQuery, setAnalogyQuery] = useState("");

  useEffect(() => {
    setTimeLeft(durationMinutes * 60);
    setIsRunning(false);
  }, [durationMinutes]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const progress = durationMinutes > 0 ? Math.round((timeLeft / (durationMinutes * 60)) * 100) : 0;

  const filteredAnalogias = useMemo(() => {
    if (!analogyQuery.trim()) return analogias;
    const query = analogyQuery.toLowerCase();
    return analogias.filter(
      (item) =>
        item.titulo.toLowerCase().includes(query) ||
        item.descricao.toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.includes(query))
    );
  }, [analogyQuery]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await fetch("/api/ai/strategy-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "discurso",
          input: draft,
        }),
      });
      if (!response.ok) {
        throw new Error("Falha ao consultar a IA.");
      }
      const data = await response.json();
      if (data?.analysis) {
        setAnalysis(data.analysis as SpeechAnalysis);
      } else {
        setAnalysis(localSpeechAnalysis(draft));
      }
    } catch (error) {
      setAnalysisError("IA indisponível. Usando análise local.");
      setAnalysis(localSpeechAnalysis(draft));
    } finally {
      setIsAnalyzing(false);
    }
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
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30">
            <Mic className="h-5 w-5 text-rose-600 dark:text-rose-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">Laboratório de Oratória</h1>
              <Badge className="bg-amber-500 text-white text-xs">
                <Sparkles className="w-3 h-3 mr-0.5" />
                Premium
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Treine sustentação, ritmo e impacto no plenário.
            </p>
          </div>
        </div>
      </div>

      <Card className="section-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-rose-600" />
            Simulador de Tempo
          </CardTitle>
          <CardDescription>Configure o tempo total e pratique sua fala.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={10}
                max={300}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(Number(event.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>
            <div className="flex gap-2">
              <Button className="gap-2" onClick={() => setIsRunning((prev) => !prev)}>
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setTimeLeft(durationMinutes * 60)}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-3xl font-bold tracking-[0.2em]">{formatTime(timeLeft)}</div>
            <div className="flex-1 md:px-6">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">{progress}% concluído</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="section-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-emerald-600" />
            Análise de Discurso (IA)
          </CardTitle>
          <CardDescription>
            Cole seu esboço e receba avaliação de razão, emoção e impacto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Cole aqui o esboço da sustentação oral..."
            className="min-h-[160px]"
          />
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={handleAnalyze}>
              <MessageCircle className="h-4 w-4" />
              {isAnalyzing ? "Analisando..." : "Analisar discurso"}
            </Button>
            {analysisError && (
              <Badge variant="outline" className="border-amber-300 text-amber-700">
                {analysisError}
              </Badge>
            )}
          </div>
          {analysis && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 dark:border-emerald-900/40 p-3">
                <p className="text-sm font-semibold">Apelo à Razão</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.apeloRazao}</p>
              </div>
              <div className="rounded-lg border border-rose-100 dark:border-rose-900/40 p-3">
                <p className="text-sm font-semibold">Apelo à Emoção</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.apeloEmocao}</p>
              </div>
              <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 p-3">
                <p className="text-sm font-semibold">Frases de Efeito</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.frasesEfeito}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-sm font-semibold">Conclusão</p>
                <p className="text-sm text-muted-foreground mt-1">{analysis.conclusao}</p>
              </div>
              <div className="md:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                <p className="text-sm font-semibold">Recomendações</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
                  {analysis.recomendacoes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="section-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Quote className="h-4 w-4 text-amber-600" />
            Banco de Analogias
          </CardTitle>
          <CardDescription>Pesquise metáforas úteis para o júri.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar analogias por palavra-chave..."
              value={analogyQuery}
              onChange={(event) => setAnalogyQuery(event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredAnalogias.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                <p className="text-sm font-semibold">{item.titulo}</p>
                <p className="text-sm text-muted-foreground mt-2">{item.descricao}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
