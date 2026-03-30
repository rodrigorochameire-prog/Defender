"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import {
  ListTodo, Calendar, FolderOpen, FileSpreadsheet,
  CreditCard, CheckCircle2, ArrowRight, ArrowLeft, ExternalLink,
  Briefcase, AlertTriangle,
} from "lucide-react";

const AREA_INFO: Record<string, { label: string; color: string; desc: string }> = {
  CRIMINAL: { label: "Criminal", color: "bg-red-600", desc: "Delitos tipificados, calculo de beneficios (ANPP, sursis, transacao)" },
  JURI: { label: "Juri", color: "bg-purple-600", desc: "Cockpit de sessao, jurados, quesitos, teses defensivas" },
  EXECUCAO_PENAL: { label: "Execucao Penal", color: "bg-orange-600", desc: "Progressao de regime, calculo de penas" },
  VIOLENCIA_DOMESTICA: { label: "VVD", color: "bg-rose-600", desc: "Medidas protetivas, acompanhamento MPU" },
  INFANCIA_JUVENTUDE: { label: "Infancia", color: "bg-amber-600", desc: "Atos infracionais, medidas socioeducativas, remissao" },
  CIVEL: { label: "Civel", color: "bg-blue-600", desc: "Processos e demandas civeis" },
  FAMILIA: { label: "Familia", color: "bg-cyan-600", desc: "Processos de familia" },
  FAZENDA_PUBLICA: { label: "Fazenda", color: "bg-teal-600", desc: "Fazenda publica" },
};

interface Props {
  userName: string;
  userComarca: string;
  userAreas: string[];
  userId: number;
}

export default function OnboardingWizard({ userName, userComarca, userAreas, userId }: Props) {
  const [step, setStep] = useState(1);
  const router = useRouter();
  const totalSteps = 7;

  const { data: gs, refetch } = trpc.googleIntegration.myStatus.useQuery();
  const { data: authUrl } = trpc.googleIntegration.getAuthUrl.useQuery({ returnTo: "/admin/onboarding" });

  const createDrive = trpc.googleIntegration.createDrive.useMutation({ onSuccess: () => refetch() });
  const createSheets = trpc.googleIntegration.createSheets.useMutation({ onSuccess: () => refetch() });
  const complete = trpc.googleIntegration.completeOnboarding.useMutation({
    onSuccess: () => router.push("/admin/dashboard"),
  });

  const next = () => setStep(s => Math.min(s + 1, totalSteps));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-card border-border p-8">
        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < step ? "bg-emerald-500" : "bg-muted"}`} />
          ))}
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="space-y-4 text-center">
            <div className="text-4xl">&#9878;&#65039;</div>
            <h1 className="text-xl font-bold text-foreground">Bem-vindo ao OMBUDS, {userName}!</h1>
            <p className="text-muted-foreground">Comarca de {userComarca}</p>
            <p className="text-sm text-muted-foreground">Vamos configurar tudo em 3 minutos.</p>
          </div>
        )}

        {/* Step 2 — System overview */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">O que o OMBUDS faz por voce</h2>
            <div className="space-y-3">
              {[
                { icon: ListTodo, label: "Demandas", desc: "Suas intimacoes e prazos num kanban visual" },
                { icon: Briefcase, label: "Assistidos e Processos", desc: "Cadastro completo com documentos e historico" },
                { icon: Calendar, label: "Agenda", desc: "Audiencias e compromissos sincronizados" },
                { icon: FolderOpen, label: "Google Drive", desc: "Documentos organizados automaticamente" },
                { icon: FileSpreadsheet, label: "Google Sheets", desc: "Planilha sincronizada com suas demandas" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex gap-3 items-start">
                  <Icon className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — Your areas (dynamic) */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">Seus modulos especializados</h2>
            <p className="text-sm text-muted-foreground">Baseado na sua area de atuacao, voce tem acesso a:</p>
            <div className="space-y-3">
              {userAreas.map(area => {
                const info = AREA_INFO[area];
                if (!info) return null;
                return (
                  <div key={area} className="flex gap-3 items-start p-3 rounded-lg bg-muted/50 border border-border">
                    <Badge className={`${info.color} text-white text-xs shrink-0`}>{info.label}</Badge>
                    <p className="text-xs text-muted-foreground">{info.desc}</p>
                  </div>
                );
              })}
            </div>
            {userAreas.length === 0 && (
              <p className="text-sm text-muted-foreground">Suas areas ainda nao foram configuradas. Fale com o administrador.</p>
            )}
          </div>
        )}

        {/* Step 4 — Link Google Drive (MOST IMPORTANT) */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              <FolderOpen className="h-5 w-5 inline mr-2 text-emerald-500" />
              Vincular Google Drive
            </h2>
            <p className="text-sm text-muted-foreground">O Drive e o coracao do OMBUDS. Documentos, pecas, autos — tudo organizado automaticamente.</p>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-300">Use sua conta Google pessoal (@gmail.com)</p>
                  <p className="text-xs text-amber-400/70 mt-1">Contas institucionais podem ter restricoes. Sua conta pessoal garante armazenamento e acesso total.</p>
                </div>
              </div>
            </div>

            {!gs?.googleLinked ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">O que vai acontecer:</p>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Uma janela do Google abre</li>
                  <li>Voce autoriza o OMBUDS</li>
                  <li>Uma pasta &quot;OMBUDS&quot; e criada no seu Drive</li>
                  <li>Subpastas por assistido/processo surgem automaticamente</li>
                </ol>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                  if (authUrl?.url) window.location.href = authUrl.url;
                }}>
                  <FolderOpen className="h-4 w-4 mr-2" /> Vincular minha conta Google
                </Button>
              </div>
            ) : !gs?.driveFolderId ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-emerald-400">Google vinculado: {gs.googleEmail}</p>
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => createDrive.mutate()}
                  disabled={createDrive.isPending}
                >
                  {createDrive.isPending ? "Criando pasta..." : "Criar pasta OMBUDS no Drive"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-emerald-400">Drive configurado!</p>
                </div>
                <a href={gs.driveUrl!} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
                  <ExternalLink className="h-4 w-4" /> Abrir pasta no Google Drive
                </a>
              </div>
            )}

            <button onClick={next} className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline">
              Fazer depois nas configuracoes
            </button>
          </div>
        )}

        {/* Step 5 — Create Sheets */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              <FileSpreadsheet className="h-5 w-5 inline mr-2 text-emerald-500" />
              Planilha de Demandas
            </h2>
            <p className="text-sm text-muted-foreground">Suas demandas espelhadas numa planilha Google. Edite em qualquer lugar — o OMBUDS sincroniza.</p>

            {!gs?.googleLinked ? (
              <p className="text-sm text-muted-foreground">Vincule o Google primeiro (passo anterior) para criar a planilha.</p>
            ) : gs?.sheetsSpreadsheetUrl ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-sm text-emerald-400">Planilha criada!</p>
                </div>
                <a href={gs.sheetsSpreadsheetUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300">
                  <ExternalLink className="h-4 w-4" /> Abrir planilha
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Abas que serao criadas:</p>
                <div className="flex flex-wrap gap-1">
                  {userAreas.map(area => {
                    const info = AREA_INFO[area];
                    return info ? <Badge key={area} className={`${info.color} text-white text-xs`}>{info.label}</Badge> : null;
                  })}
                </div>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => createSheets.mutate()}
                  disabled={createSheets.isPending}
                >
                  {createSheets.isPending ? "Criando planilha..." : "Criar minha planilha"}
                </Button>
              </div>
            )}

            <button onClick={next} className="text-xs text-muted-foreground/50 hover:text-muted-foreground underline">
              Pular por agora
            </button>
          </div>
        )}

        {/* Step 6 — Plan & payment */}
        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              <CreditCard className="h-5 w-5 inline mr-2 text-emerald-500" />
              Plano e Pagamento
            </h2>
            <p className="text-sm text-muted-foreground">O OMBUDS funciona por assinatura mensal. Pagamento via PIX.</p>
            <div className="space-y-2 text-sm">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="font-medium text-foreground">Essencial — R$ 100/mes</p>
                <p className="text-xs text-muted-foreground">Processos, demandas, docs, agenda, Drive</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-emerald-800/50">
                <p className="font-medium text-foreground">Criminal — R$ 150/mes</p>
                <p className="text-xs text-muted-foreground">+ Modulos especializados por area</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-purple-800/50">
                <p className="font-medium text-foreground">Completo — R$ 200/mes</p>
                <p className="text-xs text-muted-foreground">+ Inteligencia artificial e enrichment</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Seu plano sera configurado pelo administrador. Voce pode ver e pagar em &quot;Minha Assinatura&quot; no menu.</p>
          </div>
        )}

        {/* Step 7 — Done */}
        {step === 7 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Tudo pronto!</h2>
            <div className="text-sm text-muted-foreground space-y-2 text-left">
              <p>Dicas rapidas:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                <li>Comece cadastrando seu primeiro assistido</li>
                <li>Ou importe demandas do PJe</li>
                <li>Duvidas? Fale com Rodrigo via WhatsApp</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 ? (
            <Button variant="ghost" onClick={prev} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          ) : <div />}
          {step < totalSteps ? (
            <Button onClick={next} className="bg-emerald-600 hover:bg-emerald-700">
              Proximo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => complete.mutate()} disabled={complete.isPending} className="bg-emerald-600 hover:bg-emerald-700">
              {complete.isPending ? "Finalizando..." : "Ir para o Dashboard"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
