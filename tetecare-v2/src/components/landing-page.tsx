import Link from "next/link";
import Image from "next/image";
import { 
  Dog, 
  Heart, 
  Calendar, 
  Bell, 
  Shield, 
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Star
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
            <Image
              src="/tetecare-logo.png"
              alt="Tetê Care"
              width={40}
              height={40}
              className="rounded-xl object-cover shadow-sm"
            />
            <span className="text-xl font-semibold tracking-tight">Tetê Care</span>
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
              <span>Gestão Profissional de Creche para Pets</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                Cuide do seu pet com
                <br />
                <span className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 bg-clip-text text-transparent">
                  amor e tecnologia
                </span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Plataforma completa para gestão de creches de pets com controle de saúde, vacinas, 
                medicamentos e comunicação em tempo real com os tutores.
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
                <Dog className="w-5 h-5" />
                Ver Demonstração
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 border-2 border-background"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-background"></div>
                </div>
                <span className="font-medium">260+ pets cadastrados</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-orange-400 text-orange-400" />
                ))}
                <span className="ml-1 font-medium">5.0</span>
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
              Ferramentas profissionais para oferecer o melhor cuidado e tranquilidade para tutores
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg">
                <Dog className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Gestão Completa</h3>
              <p className="text-muted-foreground leading-relaxed">
                Controle de check-in/out, créditos, histórico completo e relatórios detalhados de cada pet.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-4 shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Saúde em Dia</h3>
              <p className="text-muted-foreground leading-relaxed">
                Controle de vacinas, medicamentos, preventivos e lembretes automáticos para nunca esquecer.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Calendário Inteligente</h3>
              <p className="text-muted-foreground leading-relaxed">
                Agende eventos, vacinas e compromissos com notificações automáticas para tutores.
              </p>
            </Card>

            {/* Feature 4 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Notificações Personalizadas</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sistema de mensagens automáticas editáveis para manter tutores sempre informados.
              </p>
            </Card>

            {/* Feature 5 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Segurança e Privacidade</h3>
              <p className="text-muted-foreground leading-relaxed">
                Dados protegidos com criptografia e controle de acesso por perfil (admin/tutor).
              </p>
            </Card>

            {/* Feature 6 */}
            <Card className="p-6 hover:shadow-lg transition-shadow border-2 hover:border-primary/20">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-4 shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Assistente IA</h3>
              <p className="text-muted-foreground leading-relaxed">
                Inteligência artificial para responder dúvidas dos tutores e gerar relatórios automaticamente.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-gradient-to-b from-accent/5 to-background">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Por que escolher o Tetê Care?
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Transparência Total</h4>
                    <p className="text-muted-foreground">
                      Tutores acompanham tudo em tempo real: check-in, relatórios diários e saúde do pet.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Economia de Tempo</h4>
                    <p className="text-muted-foreground">
                      Automatize notificações, relatórios e lembretes. Foque no que importa: cuidar dos pets.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Profissionalismo</h4>
                    <p className="text-muted-foreground">
                      Demonstre organização e cuidado com uma plataforma moderna e completa.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Suporte Completo</h4>
                    <p className="text-muted-foreground">
                      Documentação detalhada e sistema intuitivo para facilitar o dia a dia.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-orange-100 via-teal-50 to-blue-100 p-8 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Image
                    src="/tetecare-logo.png"
                    alt="Tetê Care"
                    width={192}
                    height={192}
                    className="rounded-3xl object-cover mx-auto shadow-2xl border-4 border-white"
                  />
                  <div className="bg-white rounded-xl p-4 shadow-lg">
                    <p className="text-2xl font-bold text-primary">260+</p>
                    <p className="text-sm text-muted-foreground">Pets felizes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 text-center bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-2 border-primary/20">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Pronto para transformar sua creche?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Comece agora e ofereça o melhor cuidado para os pets com tecnologia de ponta.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button size="lg" className="gap-2 text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all" asChild>
                  <Link href="/login">
                    Acessar Plataforma
                    <ArrowRight className="w-5 h-5" />
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
              <Image
                src="/tetecare-logo.png"
                alt="Tetê Care"
                width={32}
                height={32}
                className="rounded-lg object-cover"
              />
              <span className="text-sm text-muted-foreground">
                © 2025 Tetê Care. Todos os direitos reservados.
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Termos
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
