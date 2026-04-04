"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Scale,
  XCircle,
  Database,
  Users,
  FileText,
  MessageSquare,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { AVALIACAO_STORAGE_KEY, type AvaliacaoState } from "./avaliacao-inline";

interface ConselhoJurado {
  id?: number;
  nome: string;
  cadeira: number;
  profissao?: string;
  [key: string]: unknown;
}

interface Anotacao {
  id: string;
  categoria: string;
  texto: string;
  horario: string;
  fase: string;
  importante: boolean;
}

interface EncerrarSessaoProps {
  sessaoJuriId: number | null;
  isDarkMode: boolean;
  conselhoSentenca: (any | null)[];
  anotacoes: Anotacao[];
  onSucessoEncerramento: () => void;
}

export function EncerrarSessaoButton({
  sessaoJuriId,
  isDarkMode,
  conselhoSentenca,
  anotacoes,
  onSucessoEncerramento,
}: EncerrarSessaoProps) {
  const [open, setOpen] = useState(false);
  const [resultado, setResultado] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const encerrar = trpc.avaliacaoJuri.encerrarSessao.useMutation();

  // Ler avaliação do localStorage
  const getAvaliacao = (): AvaliacaoState | null => {
    try {
      const raw = localStorage.getItem(AVALIACAO_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Contar campos preenchidos
  const getPreenchimento = () => {
    const av = getAvaliacao();
    if (!av) return { total: 0, preenchidos: 0 };

    let total = 0;
    let preenchidos = 0;

    // Campos simples
    const camposSimples = [
      av.observador, av.descricaoAmbiente, av.disposicaoFisica,
      av.climaEmocionalInicial, av.presencaPublicoMidia,
      av.interrogatorio?.reacaoGeral, av.mpEstrategiaGeral,
      av.defesaEstrategiaGeral, av.replica?.refutacoes,
      av.treplica?.refutacoes, av.analise?.ladoMaisPersuasivo,
    ];
    camposSimples.forEach(c => { total++; if (c?.trim()) preenchidos++; });

    // Jurados com nome
    av.jurados.forEach(j => { total++; if (j.nome?.trim()) preenchidos++; });

    // Testemunhas com nome
    av.testemunhas.forEach(t => { total++; if (t.nome?.trim()) preenchidos++; });

    return { total, preenchidos };
  };

  const handleEncerrar = async () => {
    if (!sessaoJuriId || !resultado) return;

    setSaving(true);
    setError(null);

    try {
      const av = getAvaliacao();
      if (!av) {
        setError("Nenhum dado do formulário encontrado. A estagiária preencheu o formulário?");
        setSaving(false);
        return;
      }

      // Montar jurados com IDs do conselho
      const juradosPayload = av.jurados.map((j, i) => {
        const conselhoMatch = conselhoSentenca.find(c => c && c.cadeira === i + 1);
        // Pegar previsão de voto da análise final
        const previsao = av.analise?.previsaoVoto?.[i];
        return {
          juradoId: conselhoMatch?.id,
          posicao: i + 1,
          nome: j.nome || conselhoMatch?.nome || "",
          profissao: j.profissao || conselhoMatch?.profissao || "",
          idadeAproximada: j.idadeAproximada,
          sexo: j.sexo,
          aparenciaPrimeiraImpressao: j.aparenciaPrimeiraImpressao,
          linguagemCorporalInicial: j.linguagemCorporalInicial,
          tendenciaVoto: previsao?.tendencia || "",
          confianca: previsao?.confianca || "",
          justificativa: previsao?.justificativa || "",
        };
      });

      // Montar testemunhas
      const testemunhasPayload = av.testemunhas
        .map((t, i) => ({
          nome: t.nome,
          ordem: i + 1,
          resumoDepoimento: t.resumoDepoimento,
          reacaoJurados: t.reacaoJurados,
          expressoesFaciaisLinguagem: t.expressoesFaciaisLinguagem,
          credibilidade: t.credibilidade,
          observacoesComplementares: t.observacoesComplementares,
        }));

      // Montar argumentos MP
      const argumentosMpPayload = av.mpArgumentos
        .map((a, i) => ({
          ordem: i + 1,
          descricao: a.descricao,
          reacaoJurados: a.reacaoJurados,
          nivelPersuasao: a.nivelPersuasao,
        }));

      // Montar argumentos Defesa
      const argumentosDefesaPayload = av.defesaArgumentos
        .map((a, i) => ({
          ordem: i + 1,
          descricao: a.descricao,
          reacaoJurados: a.reacaoJurados,
          nivelPersuasao: a.nivelPersuasao,
        }));

      // Montar anotações como texto
      const anotacoesTexto = anotacoes
        .map(a => `[${a.fase}] ${a.horario} - ${a.texto}${a.importante ? " ⚠️" : ""}`)
        .join("\n");

      const result = await encerrar.mutateAsync({
        sessaoJuriId,
        resultado: resultado as "absolvicao" | "condenacao" | "desclassificacao" | "nulidade",
        avaliacao: {
          processoNumero: av.processoNumero,
          nomeReu: av.nomeReu,
          dataJulgamento: av.dataJulgamento || new Date().toISOString().split("T")[0],
          observador: av.observador || "Estagiária",
          horarioInicio: av.horarioInicio,
          duracaoEstimada: av.duracaoEstimada,
          descricaoAmbiente: av.descricaoAmbiente,
          disposicaoFisica: av.disposicaoFisica,
          climaEmocionalInicial: av.climaEmocionalInicial,
          presencaPublicoMidia: av.presencaPublicoMidia,
          interrogatorio: av.interrogatorio,
          mpEstrategiaGeral: av.mpEstrategiaGeral,
          mpImpactoGeral: av.mpImpactoGeral,
          mpInclinacaoCondenar: av.mpInclinacaoCondenar,
          defesaEstrategiaGeral: av.defesaEstrategiaGeral,
          defesaImpactoGeral: av.defesaImpactoGeral,
          defesaDuvidaRazoavel: av.defesaDuvidaRazoavel,
          replica: av.replica,
          treplica: av.treplica,
          analise: av.analise,
        },
        jurados: juradosPayload,
        testemunhas: testemunhasPayload,
        argumentosMp: argumentosMpPayload,
        argumentosDefesa: argumentosDefesaPayload,
        anotacoes: anotacoesTexto,
      });

      setSuccess(true);
      const avId = result.avaliacaoId;

      // Limpar localStorage após salvar com sucesso
      const keysToClean = [
        AVALIACAO_STORAGE_KEY,
        "defender_cockpit_conselho",
        "defender_cockpit_anotacoes",
        "defender_cockpit_recusados",
        "defender_cockpit_fase",
        "defender_cockpit_timeleft",
        "defender_cockpit_elapsed",
        "defender_cockpit_timer_since",
      ];
      keysToClean.forEach(k => localStorage.removeItem(k));

      // Redirecionar para o relatório gerado
      setTimeout(() => {
        window.location.href = `/admin/juri/relatorio/${avId}`;
      }, 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao encerrar sessão";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const { preenchidos, total } = open ? getPreenchimento() : { preenchidos: 0, total: 0 };
  const percentual = total > 0 ? Math.round((preenchidos / total) * 100) : 0;

  const cardClass = isDarkMode
    ? "bg-neutral-900/80 border border-neutral-800 rounded-xl"
    : "bg-white border border-neutral-200 rounded-xl shadow-sm";

  const resultadoOptions = [
    { value: "absolvicao", label: "Absolvição", icon: ThumbsUp, color: "text-emerald-600" },
    { value: "condenacao", label: "Condenação", icon: ThumbsDown, color: "text-rose-600" },
    { value: "desclassificacao", label: "Desclassificação", icon: Scale, color: "text-amber-600" },
    { value: "nulidade", label: "Nulidade", icon: XCircle, color: "text-neutral-500" },
  ];

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="default"
        size="sm"
        className="bg-rose-600 hover:bg-rose-700 text-white"
        disabled={!sessaoJuriId}
      >
        <Save className="w-3.5 h-3.5 mr-1.5" />
        <span className="hidden sm:inline">Encerrar Sessão</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("max-w-lg", isDarkMode ? "bg-neutral-900 text-neutral-100 border-neutral-800" : "")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-rose-500" />
              Encerrar Sessão do Júri
            </DialogTitle>
            <DialogDescription>
              Salva todos os dados do cockpit no banco e atualiza o histórico dos jurados.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Sessão Encerrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Todos os dados foram salvos. Redirecionando...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo do que será salvo */}
              <div className={cn("p-4 rounded-lg space-y-2", isDarkMode ? "bg-neutral-800" : "bg-neutral-50")}>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Dados que serão salvos
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-emerald-500" />
                    Formulário: {percentual}% preenchido
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-blue-500" />
                    {conselhoSentenca.filter(Boolean).length} jurados no conselho
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-violet-500" />
                    {anotacoes.length} anotações
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Gavel className="w-3 h-3 text-amber-500" />
                    Votos dos jurados serão atualizados
                  </div>
                </div>
              </div>

              {/* Selecionar resultado */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Resultado do Julgamento *
                </label>
                <Select value={resultado} onValueChange={setResultado}>
                  <SelectTrigger className={isDarkMode ? "bg-neutral-800 border-neutral-700" : ""}>
                    <SelectValue placeholder="Selecione o resultado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resultadoOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={cn("flex items-center gap-2", opt.color)}>
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Aviso */}
              {percentual < 30 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    O formulário está com menos de 30% preenchido. Você pode salvar assim mesmo, mas recomendamos preencher mais campos.
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-800 dark:text-rose-300">{error}</p>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEncerrar}
                  disabled={!resultado || saving}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Encerrar e Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
