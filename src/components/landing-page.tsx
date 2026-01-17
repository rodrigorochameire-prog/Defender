import Link from "next/link";
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
  AlertTriangle,
  Star,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/5">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center shadow-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight">DefesaHub</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button variant="default" size="sm" className="gap-2" asChild>
              <Link href="/register">
                Criar Conta
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <Sparkles className="w-4 h-4" />
              <span>Sistema de Gestão para Defensoria Pública</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                  Gestão Jurídica
                </h1>
                <p className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-primary">
                  Simplificada e Eficiente
                </p>
              </div>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Plataforma completa para gestão de processos, prazos e demandas. 
                Controle de assistidos, audiências, júris e comunicação integrada.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all" asChild>
                <Link href="/register">
                  Começar Agora
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12">
                <Scale className="w-5 h-5" />
                Ver Demonstração
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-background"></div>
                </div>
                <span className="font-medium">150+ assistidos</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                ))}
                <span className="ml-1 font-medium">5.0</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 pt-4 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">280+</div>
                <div className="text-muted-foreground">Processos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">94%</div>
                <div className="text-muted-foreground">Prazos Cumpridos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">50+</div>
                <div className="text-muted-foreground">Júris Realizados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas pensadas para otimizar o trabalho da Defensoria Pública
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Controle de Prazos</h3>
              <p className="text-muted-foreground">
                Acompanhe todos os prazos processuais com alertas automáticos e priorização por urgência.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão de Assistidos</h3>
              <p className="text-muted-foreground">
                Cadastro completo com status prisional, contatos e histórico de atendimentos.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <Gavel className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Tribunal do Júri</h3>
              <p className="text-muted-foreground">
                Controle de sessões, designação de defensores e registro de resultados.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Calendário Integrado</h3>
              <p className="text-muted-foreground">
                Visualize audiências, júris e prazos em um calendário unificado.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Templates de Peças</h3>
              <p className="text-muted-foreground">
                Biblioteca de modelos de peças processuais para agilizar a produção.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-6 hover:shadow-lg transition-all border hover:border-primary/30 bg-card/80">
              <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Calculadoras</h3>
              <p className="text-muted-foreground">
                Cálculo de pena, prescrição, progressão de regime e livramento condicional.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Kanban Preview */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-sm font-medium text-primary mb-4">
                <Target className="w-4 h-4" />
                Visualização Kanban
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Gerencie demandas de forma visual
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Organize suas demandas em colunas por status. Arraste e solte para atualizar 
                o andamento. Priorize réus presos automaticamente.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Visualização por status (Atender, Fila, Monitorar, Protocolado)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Destaque automático para réus presos</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>Filtros por área (Júri, EP, VD, Substituição)</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 space-y-3 glass-card">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-sm">Atender</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-900">
                    <div className="text-xs text-red-600 font-bold mb-1">HOJE</div>
                    <div className="text-sm font-medium">Resp. à Acusação</div>
                    <div className="text-xs text-muted-foreground">Diego Bonfim</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                    <div className="text-xs text-orange-600 mb-1">Amanhã</div>
                    <div className="text-sm font-medium">Habeas Corpus</div>
                    <div className="text-xs text-muted-foreground">Lucas Silva</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 space-y-3 glass-card">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-medium text-sm">Protocolado</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                    <div className="text-xs text-emerald-600 mb-1">Concluído</div>
                    <div className="text-sm font-medium">Memoriais</div>
                    <div className="text-xs text-muted-foreground">Roberto Lima</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Por que escolher o DefesaHub?
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Controle Total de Prazos</h4>
                    <p className="text-muted-foreground">
                      Nunca mais perca um prazo. Alertas automáticos por WhatsApp e e-mail.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Priorização Inteligente</h4>
                    <p className="text-muted-foreground">
                      Réus presos e prazos fatais em destaque automático.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Comunicação com Familiares</h4>
                    <p className="text-muted-foreground">
                      Notificações automáticas para familiares sobre andamento processual.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Relatórios Detalhados</h4>
                    <p className="text-muted-foreground">
                      Estatísticas de produtividade e desempenho da defensoria.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-100 via-teal-50 to-green-100 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-green-950/30 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-emerald-600 mx-auto flex items-center justify-center shadow-2xl">
                    <Scale className="w-16 h-16 text-white" />
                  </div>
                  <div className="bg-white dark:bg-card rounded-xl p-4 shadow-lg">
                    <p className="text-2xl font-bold text-primary">94%</p>
                    <p className="text-sm text-muted-foreground">Prazos em dia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Integration */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-sm font-medium text-green-700 dark:text-green-300 mb-4">
            <MessageCircle className="w-4 h-4" />
            Integração WhatsApp
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Comunicação direta com assistidos e familiares
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Envie notificações automáticas sobre movimentações processuais, 
            audiências e prazos diretamente pelo WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Bell className="w-4 h-4" />
              <span className="text-sm">Notificações de Prazo</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Lembretes de Audiência</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Gavel className="w-4 h-4" />
              <span className="text-sm">Avisos de Júri</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Movimentações</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-2 border-primary/20 glass-card">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pronto para modernizar sua Defensoria?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comece agora e transforme a gestão de processos e prazos em algo simples e eficiente.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link href="/register">
                    Criar Conta Gratuita
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 h-12" asChild>
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
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-muted-foreground">
                © 2026 DefesaHub. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Termos</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Suporte</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
