import Link from "next/link";
import Image from "next/image";
import {
  Scale,
  Clock,
  Calendar,
  Bell,
  Shield,
  FileText,
  CheckCircle2,
  ArrowRight,
  Users,
  Gavel,
  Calculator,
  MessageCircle,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header */}
      <header className="border-b border-neutral-200/80 dark:border-border/80 bg-white/90 dark:bg-[#0f0f11]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <div className="relative w-10 h-10">
              <Image
                src="/logo-light.png"
                alt="OMBUDS"
                width={40}
                height={40}
                priority
                className="absolute inset-0 object-contain dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="OMBUDS"
                width={40}
                height={40}
                priority
                className="absolute inset-0 object-contain hidden dark:block"
              />
            </div>
            <div>
              <span className="font-serif text-xl font-semibold tracking-tight text-neutral-900 dark:text-foreground">
                OMBUDS
              </span>
              <p className="text-[10px] font-light tracking-[0.15em] uppercase text-neutral-400 dark:text-muted-foreground -mt-0.5">
                Gestão para Defesa Criminal
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900 dark:text-muted-foreground dark:hover:text-foreground" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button size="sm" className="gap-2 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors duration-200" asChild>
              <Link href="/register">
                Criar Conta
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 pt-20 pb-16 md:pt-32 md:pb-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-200/60 dark:bg-muted/60 border border-neutral-300/50 dark:border-border/50 text-xs font-medium text-neutral-600 dark:text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Gestão para Defesa Criminal</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-neutral-900 dark:text-foreground">
                Gestão Estratégica
              </h1>
              <p className="text-xl md:text-2xl font-light text-neutral-500 dark:text-muted-foreground">
                Gestão • Estratégia • Defesa
              </p>
              <p className="text-sm md:text-base text-neutral-500 dark:text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Sistema de ponta para Defensoria Pública.
                Gestão completa de processos, prazos, audiências e inteligência aplicada à defesa.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" className="gap-2 px-8 h-12 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors duration-200 shadow-lg" asChild>
                <Link href="/register">
                  Começar Agora
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 border-neutral-300 dark:border-border text-neutral-700 dark:text-foreground/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-200">
                <Scale className="w-5 h-5" />
                Ver Demonstração
              </Button>
            </div>

            {/* Stats inline */}
            <div className="flex items-center justify-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-2xl font-semibold text-neutral-900 dark:text-foreground">280+</div>
                <div className="text-xs text-neutral-400 dark:text-muted-foreground uppercase tracking-wider">Processos</div>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-muted" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-neutral-900 dark:text-foreground">94%</div>
                <div className="text-xs text-neutral-400 dark:text-muted-foreground uppercase tracking-wider">Prazos em Dia</div>
              </div>
              <div className="w-px h-8 bg-neutral-200 dark:bg-muted" />
              <div className="text-center">
                <div className="text-2xl font-semibold text-neutral-900 dark:text-foreground">50+</div>
                <div className="text-xs text-neutral-400 dark:text-muted-foreground uppercase tracking-wider">Júris</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-3 text-neutral-900 dark:text-foreground">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-sm text-neutral-500 dark:text-muted-foreground max-w-2xl mx-auto">
              Ferramentas pensadas para otimizar o trabalho da Defensoria Pública
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: Clock,
                title: "Controle de Prazos",
                desc: "Acompanhe todos os prazos processuais com alertas automáticos e priorização por urgência.",
                color: "text-rose-600 dark:text-rose-400",
                bg: "bg-rose-50 dark:bg-rose-950/30",
              },
              {
                icon: Users,
                title: "Gestão de Assistidos",
                desc: "Cadastro completo com status prisional, contatos e histórico de atendimentos.",
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
              },
              {
                icon: Gavel,
                title: "Tribunal do Júri",
                desc: "Controle de sessões, designação de defensores e registro de resultados.",
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-violet-950/30",
              },
              {
                icon: Calendar,
                title: "Calendário Integrado",
                desc: "Visualize audiências, júris e prazos em um calendário unificado.",
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-950/30",
              },
              {
                icon: FileText,
                title: "Templates de Peças",
                desc: "Biblioteca de modelos de peças processuais para agilizar a produção.",
                color: "text-sky-600 dark:text-sky-400",
                bg: "bg-sky-50 dark:bg-sky-950/30",
              },
              {
                icon: Calculator,
                title: "Calculadoras",
                desc: "Cálculo de pena, prescrição, progressão de regime e livramento condicional.",
                color: "text-cyan-600 dark:text-cyan-400",
                bg: "bg-cyan-50 dark:bg-cyan-950/30",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="p-5 bg-white dark:bg-card border-neutral-200/80 dark:border-border/80 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:shadow-md hover:shadow-neutral-200/50 dark:hover:shadow-black/20 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-sans text-sm font-semibold mb-1.5 text-neutral-900 dark:text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Kanban Preview */}
      <section className="bg-white dark:bg-card/50 border-y border-neutral-200/80 dark:border-border/80">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-muted text-xs font-medium text-neutral-600 dark:text-muted-foreground mb-4">
                  <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Visualização Kanban
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight mb-4 text-neutral-900 dark:text-foreground">
                  Gerencie demandas de forma visual
                </h2>
                <p className="text-sm text-neutral-500 dark:text-muted-foreground mb-6 leading-relaxed">
                  Organize suas demandas em colunas por status. Arraste e solte para atualizar
                  o andamento. Priorize réus presos automaticamente.
                </p>
                <ul className="space-y-3">
                  {[
                    "Visualização por status (Atender, Fila, Monitorar, Protocolado)",
                    "Destaque automático para réus presos",
                    "Filtros por área (Júri, EP, VD, Substituição)",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="text-sm text-neutral-700 dark:text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Kanban mockup */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 space-y-3 bg-neutral-50 dark:bg-card border-neutral-200/80 dark:border-border/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="font-sans text-xs font-semibold text-neutral-900 dark:text-foreground">Atender</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      <div className="text-[10px] uppercase tracking-wider text-rose-600 dark:text-rose-400 font-medium mb-1">Hoje</div>
                      <div className="text-xs font-medium text-neutral-900 dark:text-foreground">Resp. à Acusação</div>
                      <div className="text-[10px] text-neutral-400 dark:text-muted-foreground mt-0.5">Diego Bonfim</div>
                    </div>
                    <div className="p-3 bg-white dark:bg-muted/50 rounded-lg border border-neutral-200/80 dark:border-border/50">
                      <div className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-1">Amanhã</div>
                      <div className="text-xs font-medium text-neutral-900 dark:text-foreground">Habeas Corpus</div>
                      <div className="text-[10px] text-neutral-400 dark:text-muted-foreground mt-0.5">Lucas Silva</div>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 space-y-3 bg-neutral-50 dark:bg-card border-neutral-200/80 dark:border-border/80">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-sans text-xs font-semibold text-neutral-900 dark:text-foreground">Protocolado</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium mb-1">Concluído</div>
                      <div className="text-xs font-medium text-neutral-900 dark:text-foreground">Memoriais</div>
                      <div className="text-[10px] text-neutral-400 dark:text-muted-foreground mt-0.5">Roberto Lima</div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-foreground">
                Por que escolher o OMBUDS?
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: "Controle Total de Prazos",
                    desc: "Nunca mais perca um prazo. Alertas automáticos por WhatsApp e e-mail.",
                  },
                  {
                    title: "Priorização Inteligente",
                    desc: "Réus presos e prazos fatais em destaque automático.",
                  },
                  {
                    title: "Comunicação com Familiares",
                    desc: "Notificações automáticas para familiares sobre andamento processual.",
                  },
                  {
                    title: "Relatórios Detalhados",
                    desc: "Estatísticas de produtividade e desempenho da defensoria.",
                  },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-sans text-sm font-semibold mb-0.5 text-neutral-900 dark:text-foreground">
                        {benefit.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-muted-foreground">
                        {benefit.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual element */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-neutral-50 dark:bg-card border border-neutral-200/80 dark:border-border/80 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="relative w-28 h-28 mx-auto">
                    <Image
                      src="/logo-light.png"
                      alt="OMBUDS"
                      width={112}
                      height={112}
                      className="object-contain dark:hidden"
                    />
                    <Image
                      src="/logo-dark.png"
                      alt="OMBUDS"
                      width={112}
                      height={112}
                      className="object-contain hidden dark:block drop-shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                    />
                  </div>
                  <div className="bg-white dark:bg-muted rounded-xl p-4 border border-neutral-200/80 dark:border-border/50 shadow-sm">
                    <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">94%</p>
                    <p className="text-xs text-neutral-400 dark:text-muted-foreground uppercase tracking-wider">Prazos em dia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Integration */}
      <section className="bg-white dark:bg-card/50 border-y border-neutral-200/80 dark:border-border/80">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 dark:bg-muted text-xs font-medium text-neutral-600 dark:text-muted-foreground mb-4">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Integração WhatsApp
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight mb-3 text-neutral-900 dark:text-foreground">
              Comunicação direta com assistidos e familiares
            </h2>
            <p className="text-sm text-neutral-500 dark:text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Envie notificações automáticas sobre movimentações processuais,
              audiências e prazos diretamente pelo WhatsApp.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: Bell, label: "Notificações de Prazo" },
                { icon: Calendar, label: "Lembretes de Audiência" },
                { icon: Gavel, label: "Avisos de Júri" },
                { icon: FileText, label: "Movimentações" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-muted rounded-full border border-neutral-200/80 dark:border-border/50 text-neutral-700 dark:text-foreground/80"
                >
                  <item.icon className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 text-center bg-neutral-50 dark:bg-card border-neutral-200/80 dark:border-border/80 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/[0.04] rounded-full blur-[80px] pointer-events-none" />

            <div className="relative space-y-6">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-foreground">
                Pronto para modernizar sua Defensoria?
              </h2>
              <p className="text-sm text-neutral-500 dark:text-muted-foreground max-w-2xl mx-auto">
                Comece agora e transforme a gestão de processos e prazos em algo simples e eficiente.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button size="lg" className="gap-2 px-8 h-12 bg-neutral-900 hover:bg-emerald-600 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-emerald-500 dark:hover:text-white transition-colors duration-200 shadow-lg" asChild>
                  <Link href="/register">
                    Criar Conta Gratuita
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 px-8 h-12 border-neutral-300 dark:border-border text-neutral-700 dark:text-foreground/80 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors duration-200" asChild>
                  <Link href="/login">
                    Já tenho conta
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/80 dark:border-border/80 bg-white dark:bg-[#0f0f11]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <Image
                  src="/logo-light.png"
                  alt="OMBUDS"
                  width={32}
                  height={32}
                  className="absolute inset-0 object-contain dark:hidden"
                />
                <Image
                  src="/logo-dark.png"
                  alt="OMBUDS"
                  width={32}
                  height={32}
                  className="absolute inset-0 object-contain hidden dark:block"
                />
              </div>
              <span className="text-xs text-neutral-400 dark:text-muted-foreground">
                © 2026 OMBUDS. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-neutral-400 dark:text-muted-foreground">
              <Link href="/termos" className="hover:text-neutral-900 dark:hover:text-foreground transition-colors duration-200">Termos</Link>
              <Link href="/privacidade" className="hover:text-neutral-900 dark:hover:text-foreground transition-colors duration-200">Privacidade</Link>
              <Link href="mailto:rodrigorochameire@gmail.com" className="hover:text-neutral-900 dark:hover:text-foreground transition-colors duration-200">Suporte</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
