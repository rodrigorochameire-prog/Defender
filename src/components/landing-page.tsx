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
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Scale className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-semibold tracking-tight">DefensorHub</span>
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
              <Scale className="w-4 h-4" />
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

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 pt-8 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">150+</div>
                <div className="text-muted-foreground">Assistidos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">280+</div>
                <div className="text-muted-foreground">Processos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">94%</div>
                <div className="text-muted-foreground">Prazos Cumpridos</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Tudo que você precisa para uma gestão eficiente
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ferramentas pensadas para otimizar o trabalho da Defensoria Pública
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Controle de Prazos</h3>
            <p className="text-muted-foreground">
              Acompanhe todos os prazos processuais com alertas automáticos e priorização por urgência.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestão de Assistidos</h3>
            <p className="text-muted-foreground">
              Cadastro completo com status prisional, contatos e histórico de atendimentos.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <Gavel className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Tribunal do Júri</h3>
            <p className="text-muted-foreground">
              Controle de sessões, designação de defensores e registro de resultados.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Calendário Integrado</h3>
            <p className="text-muted-foreground">
              Visualize audiências, júris e prazos em um calendário unificado.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Templates de Peças</h3>
            <p className="text-muted-foreground">
              Biblioteca de modelos de peças processuais para agilizar a produção.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
              <Calculator className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Calculadoras</h3>
            <p className="text-muted-foreground">
              Cálculo de pena, prescrição, progressão de regime e livramento condicional.
            </p>
          </Card>
        </div>
      </section>

      {/* Kanban Preview */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50">
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
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Visualização por status (Atender, Fila, Monitorar, Protocolado)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Destaque automático para réus presos</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span>Filtros por área (Júri, EP, VD, Substituição)</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="font-medium text-sm">Atender</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                    <div className="text-xs text-red-600 font-bold mb-1">HOJE</div>
                    <div className="text-sm font-medium">Resp. à Acusação</div>
                    <div className="text-xs text-muted-foreground">Diego Bonfim</div>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                    <div className="text-xs text-orange-600 mb-1">Amanhã</div>
                    <div className="text-sm font-medium">Habeas Corpus</div>
                    <div className="text-xs text-muted-foreground">Lucas Silva</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="font-medium text-sm">Protocolado</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="text-xs text-green-600 mb-1">Concluído</div>
                    <div className="text-sm font-medium">Memoriais</div>
                    <div className="text-xs text-muted-foreground">Roberto Lima</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Integration */}
      <section className="container mx-auto px-4 py-16 md:py-24">
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
        <Card className="max-w-4xl mx-auto p-8 md:p-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Pronto para modernizar sua Defensoria?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comece agora e transforme a gestão de processos e prazos em algo simples e eficiente.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="gap-2 text-base px-8 h-12" asChild>
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
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Scale className="h-4 w-4 text-primary" />
              </div>
              <span className="font-semibold">DefensorHub</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Termos</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Suporte</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 DefensorHub. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
