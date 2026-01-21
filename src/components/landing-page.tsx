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
    <div className="min-h-screen bg-gradient-to-b from-[hsl(150_15%_99%)] via-[hsl(150_12%_98%)] to-[hsl(155_10%_96%)] dark:from-[hsl(160_15%_5%)] dark:via-[hsl(160_12%_6%)] dark:to-[hsl(155_10%_8%)]">
      {/* Header */}
      <header className="border-b border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_14%)] bg-[hsl(150_15%_99%)]/90 dark:bg-[hsl(160_15%_5%)]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(158_55%_42%)] to-[hsl(160_50%_35%)] flex items-center justify-center shadow-lg">
              <div className="relative w-5 h-5">
                <div 
                  className="absolute inset-0 text-white font-bold text-xl flex items-center justify-center"
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  ×
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-0">
              <span className="text-xl font-bold tracking-tight text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_90%)]">
                Intel
              </span>
              <span className="text-xl font-light tracking-tight text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_90%)]">
                ex
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[hsl(158_40%_94%)] dark:bg-[hsl(158_30%_12%)] border border-[hsl(158_35%_85%)] dark:border-[hsl(158_25%_20%)] text-sm font-medium text-[hsl(158_50%_35%)] dark:text-[hsl(158_45%_60%)]">
              <Sparkles className="w-4 h-4" />
              <span>Sistema Institucional de Inteligência Jurídica</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
                  Gestão Estratégica
                </h1>
                <p className="text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]">
                  Inteligência • Lei • Defesa
                </p>
              </div>
              <p className="text-lg md:text-xl text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)] max-w-2xl mx-auto leading-relaxed">
                Sistema de ponta para Defensoria Pública. 
                Gestão completa de processos, prazos, audiências e inteligência aplicada à defesa.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg" asChild>
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
            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(158_50%_50%)] to-[hsl(158_55%_40%)] border-2 border-white dark:border-[hsl(160_15%_8%)]"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(165_45%_50%)] to-[hsl(165_50%_40%)] border-2 border-white dark:border-[hsl(160_15%_8%)]"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(150_45%_50%)] to-[hsl(150_50%_40%)] border-2 border-white dark:border-[hsl(160_15%_8%)]"></div>
                </div>
                <span className="font-medium">150+ assistidos</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[hsl(158_55%_45%)] text-[hsl(158_55%_45%)]" />
                ))}
                <span className="ml-1 font-medium">5.0</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 pt-4 text-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]">280+</div>
                <div className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Processos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]">94%</div>
                <div className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Prazos Cumpridos</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]">50+</div>
                <div className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Júris Realizados</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)] max-w-2xl mx-auto">
              Ferramentas pensadas para otimizar o trabalho da Defensoria Pública
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(0_60%_92%)] to-[hsl(0_55%_88%)] dark:from-[hsl(0_50%_18%)] dark:to-[hsl(0_45%_14%)] flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-[hsl(0_55%_50%)] dark:text-[hsl(0_50%_60%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Controle de Prazos</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Acompanhe todos os prazos processuais com alertas automáticos e priorização por urgência.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(158_50%_92%)] to-[hsl(158_45%_88%)] dark:from-[hsl(158_40%_15%)] dark:to-[hsl(158_35%_11%)] flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[hsl(158_55%_40%)] dark:text-[hsl(158_50%_55%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Gestão de Assistidos</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Cadastro completo com status prisional, contatos e histórico de atendimentos.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(270_50%_92%)] to-[hsl(270_45%_88%)] dark:from-[hsl(270_40%_18%)] dark:to-[hsl(270_35%_14%)] flex items-center justify-center mb-4">
                <Gavel className="w-6 h-6 text-[hsl(270_50%_50%)] dark:text-[hsl(270_45%_60%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Tribunal do Júri</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Controle de sessões, designação de defensores e registro de resultados.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(35_80%_92%)] to-[hsl(35_75%_88%)] dark:from-[hsl(35_60%_18%)] dark:to-[hsl(35_55%_14%)] flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-[hsl(35_75%_45%)] dark:text-[hsl(35_70%_55%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Calendário Integrado</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Visualize audiências, júris e prazos em um calendário unificado.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(158_50%_92%)] to-[hsl(158_45%_88%)] dark:from-[hsl(158_40%_15%)] dark:to-[hsl(158_35%_11%)] flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-[hsl(158_55%_40%)] dark:text-[hsl(158_50%_55%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Templates de Peças</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Biblioteca de modelos de peças processuais para agilizar a produção.
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-6 hover:border-[hsl(158_35%_80%)] dark:hover:border-[hsl(158_25%_22%)] bg-white/80 dark:bg-[hsl(160_12%_9%)]/80 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(175_50%_92%)] to-[hsl(175_45%_88%)] dark:from-[hsl(175_40%_15%)] dark:to-[hsl(175_35%_11%)] flex items-center justify-center mb-4">
                <Calculator className="w-6 h-6 text-[hsl(175_50%_40%)] dark:text-[hsl(175_45%_55%)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Calculadoras</h3>
              <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                Cálculo de pena, prescrição, progressão de regime e livramento condicional.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Kanban Preview */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-b from-[hsl(155_12%_96%)] to-[hsl(150_10%_98%)] dark:from-[hsl(160_10%_7%)] dark:to-[hsl(155_8%_5%)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(158_40%_94%)] dark:bg-[hsl(158_30%_12%)] text-sm font-medium text-[hsl(158_50%_35%)] dark:text-[hsl(158_45%_60%)] mb-4">
                <Target className="w-4 h-4" />
                Visualização Kanban
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
                Gerencie demandas de forma visual
              </h2>
              <p className="text-lg text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)] mb-6">
                Organize suas demandas em colunas por status. Arraste e solte para atualizar 
                o andamento. Priorize réus presos automaticamente.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(158_55%_42%)]" />
                  <span className="text-[hsl(160_10%_25%)] dark:text-[hsl(150_8%_75%)]">Visualização por status (Atender, Fila, Monitorar, Protocolado)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(158_55%_42%)]" />
                  <span className="text-[hsl(160_10%_25%)] dark:text-[hsl(150_8%_75%)]">Destaque automático para réus presos</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(158_55%_42%)]" />
                  <span className="text-[hsl(160_10%_25%)] dark:text-[hsl(150_8%_75%)]">Filtros por área (Júri, EP, VD, Substituição)</span>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 space-y-3 bg-white/90 dark:bg-[hsl(160_12%_9%)]/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(0_60%_55%)]" />
                  <span className="font-medium text-sm text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Atender</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-[hsl(0_55%_96%)] dark:bg-[hsl(0_45%_12%)] rounded-xl border border-[hsl(0_50%_90%)] dark:border-[hsl(0_40%_18%)]">
                    <div className="text-xs text-[hsl(0_55%_50%)] dark:text-[hsl(0_50%_60%)] font-bold mb-1">HOJE</div>
                    <div className="text-sm font-medium text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Resp. à Acusação</div>
                    <div className="text-xs text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Diego Bonfim</div>
                  </div>
                  <div className="p-3 bg-[hsl(155_15%_97%)] dark:bg-[hsl(160_12%_11%)] rounded-xl border border-[hsl(155_12%_92%)] dark:border-[hsl(160_10%_16%)]">
                    <div className="text-xs text-[hsl(35_75%_45%)] dark:text-[hsl(35_70%_55%)] mb-1">Amanhã</div>
                    <div className="text-sm font-medium text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Habeas Corpus</div>
                    <div className="text-xs text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Lucas Silva</div>
                  </div>
                </div>
              </Card>
              <Card className="p-4 space-y-3 bg-white/90 dark:bg-[hsl(160_12%_9%)]/90 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(158_55%_42%)]" />
                  <span className="font-medium text-sm text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Protocolado</span>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-[hsl(158_50%_96%)] dark:bg-[hsl(158_35%_10%)] rounded-xl border border-[hsl(158_45%_90%)] dark:border-[hsl(158_30%_16%)]">
                    <div className="text-xs text-[hsl(158_55%_40%)] dark:text-[hsl(158_50%_55%)] mb-1">Concluído</div>
                    <div className="text-sm font-medium text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Memoriais</div>
                    <div className="text-xs text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Roberto Lima</div>
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
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
                Por que escolher o DefesaHub?
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[hsl(158_55%_42%)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Controle Total de Prazos</h4>
                    <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                      Nunca mais perca um prazo. Alertas automáticos por WhatsApp e e-mail.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[hsl(158_55%_42%)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Priorização Inteligente</h4>
                    <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                      Réus presos e prazos fatais em destaque automático.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[hsl(158_55%_42%)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Comunicação com Familiares</h4>
                    <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                      Notificações automáticas para familiares sobre andamento processual.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[hsl(158_55%_42%)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1 text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_88%)]">Relatórios Detalhados</h4>
                    <p className="text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                      Estatísticas de produtividade e desempenho da defensoria.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-[hsl(158_45%_94%)] via-[hsl(165_40%_92%)] to-[hsl(150_40%_90%)] dark:from-[hsl(158_35%_12%)] dark:via-[hsl(165_30%_10%)] dark:to-[hsl(150_30%_8%)] p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[hsl(158_55%_42%)] to-[hsl(160_50%_35%)] mx-auto flex items-center justify-center shadow-2xl">
                    <Scale className="w-16 h-16 text-white" />
                  </div>
                  <div className="bg-white dark:bg-[hsl(160_12%_10%)] rounded-xl p-4 shadow-lg">
                    <p className="text-2xl font-bold text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]">94%</p>
                    <p className="text-sm text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">Prazos em dia</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp Integration */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-b from-[hsl(155_12%_96%)] to-[hsl(150_10%_98%)] dark:from-[hsl(160_10%_7%)] dark:to-[hsl(155_8%_5%)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[hsl(158_40%_94%)] dark:bg-[hsl(158_30%_12%)] text-sm font-medium text-[hsl(158_50%_35%)] dark:text-[hsl(158_45%_60%)] mb-4">
            <MessageCircle className="w-4 h-4" />
            Integração WhatsApp
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
            Comunicação direta com assistidos e familiares
          </h2>
          <p className="text-lg text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)] mb-8 max-w-2xl mx-auto">
            Envie notificações automáticas sobre movimentações processuais, 
            audiências e prazos diretamente pelo WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(155_15%_95%)] dark:bg-[hsl(160_12%_12%)] rounded-full text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_70%)]">
              <Bell className="w-4 h-4" />
              <span className="text-sm">Notificações de Prazo</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(155_15%_95%)] dark:bg-[hsl(160_12%_12%)] rounded-full text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_70%)]">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Lembretes de Audiência</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(155_15%_95%)] dark:bg-[hsl(160_12%_12%)] rounded-full text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_70%)]">
              <Gavel className="w-4 h-4" />
              <span className="text-sm">Avisos de Júri</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[hsl(155_15%_95%)] dark:bg-[hsl(160_12%_12%)] rounded-full text-[hsl(160_10%_30%)] dark:text-[hsl(150_8%_70%)]">
              <FileText className="w-4 h-4" />
              <span className="text-sm">Movimentações</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-[hsl(158_40%_96%)] via-[hsl(158_35%_94%)] to-[hsl(155_30%_95%)] dark:from-[hsl(158_30%_10%)] dark:via-[hsl(158_25%_8%)] dark:to-[hsl(155_20%_7%)] border-2 border-[hsl(158_35%_85%)] dark:border-[hsl(158_25%_18%)]">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-[hsl(160_15%_12%)] dark:text-[hsl(150_10%_92%)]">
                Pronto para modernizar sua Defensoria?
              </h2>
              <p className="text-lg text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)] max-w-2xl mx-auto">
                Comece agora e transforme a gestão de processos e prazos em algo simples e eficiente.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg" asChild>
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
      <footer className="border-t border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_14%)] bg-[hsl(155_12%_97%)] dark:bg-[hsl(160_12%_6%)]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(158_55%_42%)] to-[hsl(160_50%_35%)] flex items-center justify-center">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
                © 2026 DefesaHub. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_55%)]">
              <Link href="#" className="hover:text-[hsl(160_15%_15%)] dark:hover:text-[hsl(150_10%_85%)] transition-colors">Termos</Link>
              <Link href="#" className="hover:text-[hsl(160_15%_15%)] dark:hover:text-[hsl(150_10%_85%)] transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-[hsl(160_15%_15%)] dark:hover:text-[hsl(150_10%_85%)] transition-colors">Suporte</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
