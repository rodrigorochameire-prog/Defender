"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Brain, 
  Search,
  Globe,
  MapPin,
  User,
  Users,
  Shield,
  Eye,
  FileText,
  ExternalLink,
  Camera,
  Map,
  Fingerprint,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  Network,
  Share2,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Phone,
  Mail,
  Building2,
  Car,
  CreditCard,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  Scale,
  Newspaper,
  Radio,
  Tv,
  BookOpen,
  FileSearch,
  Microscope,
  Target,
  Zap,
  Lock,
  Info,
  ChevronRight,
  Copy,
  Download,
  Bookmark,
  Star,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getInitials } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Ferramentas OSINT organizadas por categoria
const osintTools = {
  busca_geral: [
    { name: "Google", url: "https://www.google.com/search?q=", icon: Globe, color: "text-blue-600", description: "Busca geral na web" },
    { name: "Google Imagens", url: "https://www.google.com/search?tbm=isch&q=", icon: Camera, color: "text-green-600", description: "Busca reversa de imagens" },
    { name: "Bing", url: "https://www.bing.com/search?q=", icon: Globe, color: "text-cyan-600", description: "Busca alternativa" },
    { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", icon: Shield, color: "text-orange-600", description: "Busca privada" },
  ],
  redes_sociais: [
    { name: "Facebook", url: "https://www.facebook.com/search/top?q=", icon: Facebook, color: "text-blue-700", description: "Perfis e publicações" },
    { name: "Instagram", url: "https://www.instagram.com/", icon: Instagram, color: "text-pink-600", description: "Perfis e fotos" },
    { name: "Twitter/X", url: "https://twitter.com/search?q=", icon: Twitter, color: "text-sky-500", description: "Posts e menções" },
    { name: "LinkedIn", url: "https://www.linkedin.com/search/results/all/?keywords=", icon: Linkedin, color: "text-blue-800", description: "Perfil profissional" },
    { name: "TikTok", url: "https://www.tiktok.com/search?q=", icon: Radio, color: "text-black", description: "Vídeos e perfis" },
    { name: "YouTube", url: "https://www.youtube.com/results?search_query=", icon: Youtube, color: "text-red-600", description: "Vídeos" },
  ],
  documentos: [
    { name: "Consulta CPF", url: "https://servicos.receita.fazenda.gov.br/Servicos/CPF/ConsultaSituacao/ConsultaPublica.asp", icon: FileText, color: "text-emerald-600", description: "Situação cadastral CPF" },
    { name: "Consulta CNPJ", url: "https://www.receita.fazenda.gov.br/PessoaJuridica/CNPJ/cnpjreva/Cnpjreva_Solicitacao.asp", icon: Building2, color: "text-indigo-600", description: "Consulta de empresas" },
    { name: "DETRAN BA", url: "https://www.detran.ba.gov.br/", icon: Car, color: "text-amber-600", description: "Consulta de veículos" },
    { name: "Escavador", url: "https://www.escavador.com/busca?q=", icon: FileSearch, color: "text-violet-600", description: "Processos judiciais" },
    { name: "JusBrasil", url: "https://www.jusbrasil.com.br/busca?q=", icon: Scale, color: "text-slate-700", description: "Jurisprudência e processos" },
  ],
  localizacao: [
    { name: "Google Maps", url: "https://www.google.com/maps/search/", icon: Map, color: "text-green-600", description: "Mapas e endereços" },
    { name: "Google Earth", url: "https://earth.google.com/web/search/", icon: Globe, color: "text-blue-500", description: "Vista aérea/satélite" },
    { name: "Street View", url: "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=", icon: Eye, color: "text-amber-500", description: "Vista da rua" },
    { name: "Waze", url: "https://www.waze.com/live-map/directions?to=ll.", icon: MapPin, color: "text-cyan-500", description: "Trânsito e rotas" },
  ],
  noticias: [
    { name: "Google News", url: "https://news.google.com/search?q=", icon: Newspaper, color: "text-blue-600", description: "Notícias" },
    { name: "A Tarde", url: "https://atarde.com.br/?s=", icon: Newspaper, color: "text-red-700", description: "Jornal local BA" },
    { name: "Correio 24h", url: "https://www.correio24horas.com.br/busca/?q=", icon: Newspaper, color: "text-orange-600", description: "Jornal local BA" },
    { name: "G1 Bahia", url: "https://g1.globo.com/busca/?q=", icon: Tv, color: "text-red-600", description: "Portal de notícias" },
  ],
  deep_web: [
    { name: "Wayback Machine", url: "https://web.archive.org/web/*/", icon: Clock, color: "text-slate-600", description: "Histórico de sites" },
    { name: "Have I Been Pwned", url: "https://haveibeenpwned.com/", icon: Lock, color: "text-rose-600", description: "Verificar vazamentos" },
    { name: "Shodan", url: "https://www.shodan.io/search?query=", icon: Database, color: "text-red-500", description: "Dispositivos conectados" },
    { name: "Censys", url: "https://search.censys.io/search?resource=hosts&q=", icon: Network, color: "text-purple-600", description: "Infraestrutura" },
  ],
  telefone: [
    { name: "TeleBusca", url: "https://www.telebusca.com.br/", icon: Phone, color: "text-green-600", description: "Consulta telefones" },
    { name: "Quem Perturba", url: "https://www.quemperturba.com.br/", icon: Phone, color: "text-red-500", description: "Identificar números" },
    { name: "Truecaller", url: "https://www.truecaller.com/search/br/", icon: Phone, color: "text-blue-500", description: "Identificar chamadas" },
  ],
  tribunal: [
    { name: "TJBA - PJe", url: "https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam", icon: Scale, color: "text-slate-700", description: "Processos 1º grau" },
    { name: "TJBA - 2º Grau", url: "https://esaj.tjba.jus.br/cposg/open.do", icon: Scale, color: "text-slate-700", description: "Processos 2º grau" },
    { name: "TRF1", url: "https://pje1g.trf1.jus.br/consultapublica/ConsultaPublica/listView.seam", icon: Scale, color: "text-blue-800", description: "Justiça Federal" },
    { name: "TSE", url: "https://www.tse.jus.br/servicos-eleitorais/titulo-de-eleitor/situacao-eleitoral", icon: CheckCircle2, color: "text-green-700", description: "Situação eleitoral" },
  ],
};

// Assistido selecionado (mock)
const mockAssistido = {
  id: 1,
  nome: "Diego Bonfim Almeida",
  vulgo: "Diegão",
  cpf: "123.456.789-00",
  rg: "12.345.678-90 SSP/BA",
  dataNascimento: "1990-05-15",
  nomeMae: "Maria Almeida Santos",
  nomePai: "José Almeida",
  endereco: "Rua das Flores, 123, Centro, Camaçari/BA",
  bairro: "Centro",
  cidade: "Camaçari",
  telefone: "(71) 99999-1234",
  crimePrincipal: "Homicídio Qualificado (Art. 121, §2º, CP)",
  photoUrl: null,
};

export default function InteligenciaPage() {
  const searchParams = useSearchParams();
  const assistidoId = searchParams.get("assistido");
  const assistidosIds = searchParams.get("assistidos");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("busca_geral");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Se tem assistido, pré-preenche a busca
  const assistido = assistidoId ? mockAssistido : null;

  const handleSearch = (tool: typeof osintTools.busca_geral[0], query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;
    
    const url = tool.url + encodeURIComponent(searchTerm);
    window.open(url, "_blank");
    
    // Add to history
    if (!searchHistory.includes(searchTerm)) {
      setSearchHistory(prev => [searchTerm, ...prev].slice(0, 10));
    }
  };

  const quickSearches = assistido ? [
    { label: "Nome completo", value: assistido.nome },
    { label: "Nome + Vulgo", value: `${assistido.nome} "${assistido.vulgo}"` },
    { label: "CPF", value: assistido.cpf.replace(/\D/g, "") },
    { label: "Nome da Mãe", value: assistido.nomeMae },
    { label: "Endereço", value: assistido.endereco },
    { label: "Bairro + Cidade", value: `${assistido.bairro} ${assistido.cidade}` },
    { label: "Crime", value: assistido.crimePrincipal },
  ] : [];

  const categoryLabels: Record<string, { label: string; icon: React.ElementType }> = {
    busca_geral: { label: "Busca Geral", icon: Globe },
    redes_sociais: { label: "Redes Sociais", icon: Share2 },
    documentos: { label: "Documentos", icon: FileText },
    localizacao: { label: "Localização", icon: MapPin },
    noticias: { label: "Notícias", icon: Newspaper },
    deep_web: { label: "Deep Web", icon: Database },
    telefone: { label: "Telefone", icon: Phone },
    tribunal: { label: "Tribunais", icon: Scale },
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* Sub-header unificado */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
              <Brain className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            </div>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Ferramentas de investigação e OSINT
            </span>
          </div>
          
          <div className="flex items-center gap-0.5">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Exportar Relatório"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">

      {/* Assistido Context (se selecionado) */}
      {assistido && (
        <Card className="border-violet-200/50 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-violet-300 ring-offset-2">
                <AvatarImage src={assistido.photoUrl || undefined} />
                <AvatarFallback className="bg-violet-100 text-violet-700 text-lg font-semibold">
                  {getInitials(assistido.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-lg">{assistido.nome}</h2>
                  {assistido.vulgo && (
                    <Badge variant="secondary" className="text-xs">&quot;{assistido.vulgo}&quot;</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{assistido.crimePrincipal}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    CPF: {assistido.cpf}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {assistido.cidade}
                  </span>
                </div>
              </div>
              <Link href={`/admin/assistidos/${assistido.id}`}>
                <Button variant="outline" size="sm">Ver Perfil</Button>
              </Link>
            </div>

            {/* Quick Searches */}
            <div className="mt-4 pt-4 border-t border-violet-200/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Buscas Rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {quickSearches.map((qs, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1 hover:bg-violet-50 hover:border-violet-300"
                    onClick={() => setSearchQuery(qs.value)}
                  >
                    <Search className="h-3 w-3" />
                    {qs.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Múltiplos assistidos */}
      {assistidosIds && (
        <Card className="border-amber-200/50 bg-gradient-to-r from-amber-50/50 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-600" />
              <span className="font-medium">{assistidosIds.split(",").length} assistidos selecionados</span>
              <Badge variant="secondary">Análise em grupo</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Digite o termo de busca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-lg"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && osintTools[activeCategory as keyof typeof osintTools]?.[0]) {
                    handleSearch(osintTools[activeCategory as keyof typeof osintTools][0]);
                  }
                }}
              />
            </div>
            <Button 
              size="lg" 
              className="h-12 px-6 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              onClick={() => osintTools[activeCategory as keyof typeof osintTools]?.[0] && handleSearch(osintTools[activeCategory as keyof typeof osintTools][0])}
            >
              <Search className="h-5 w-5" />
              Buscar
            </Button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Recentes:</span>
              {searchHistory.slice(0, 5).map((term, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setSearchQuery(term)}
                >
                  {term.length > 20 ? term.slice(0, 20) + "..." : term}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {Object.entries(categoryLabels).map(([key, { label, icon: Icon }]) => (
                <Button
                  key={key}
                  variant={activeCategory === key ? "default" : "ghost"}
                  className={`w-full justify-start gap-2 ${activeCategory === key ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                  onClick={() => setActiveCategory(key)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {osintTools[key as keyof typeof osintTools]?.length || 0}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tools Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {categoryLabels[activeCategory] && (
                    <>
                      {(() => {
                        const Icon = categoryLabels[activeCategory].icon;
                        return <Icon className="h-5 w-5 text-violet-600" />;
                      })()}
                      {categoryLabels[activeCategory].label}
                    </>
                  )}
                </CardTitle>
                <Badge variant="outline">
                  {osintTools[activeCategory as keyof typeof osintTools]?.length || 0} ferramentas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {osintTools[activeCategory as keyof typeof osintTools]?.map((tool, i) => {
                  const Icon = tool.icon;
                  return (
                    <Card 
                      key={i} 
                      className="cursor-pointer hover:shadow-md transition-all hover:border-violet-300 group"
                      onClick={() => handleSearch(tool, searchQuery)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg ${tool.color.replace("text-", "bg-").replace("600", "100").replace("700", "100").replace("800", "100").replace("500", "100")} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <Icon className={`h-5 w-5 ${tool.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm">{tool.name}</h3>
                              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{tool.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Google Earth Integration */}
          {activeCategory === "localizacao" && assistido && (
            <Card className="mt-4 border-green-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-600" />
                  Google Earth - Localização do Assistido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden relative">
                  <iframe
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(assistido.endereco)}&zoom=17&maptype=satellite`}
                    className="w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="shadow-lg"
                      onClick={() => window.open(`https://earth.google.com/web/search/${encodeURIComponent(assistido.endereco)}`, "_blank")}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Abrir no Earth
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="shadow-lg"
                      onClick={() => window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(assistido.endereco)}`, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Street View
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {assistido.endereco}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Anotações da Investigação
          </CardTitle>
          <CardDescription>
            Registre descobertas e informações relevantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Digite suas anotações sobre a investigação..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex justify-end mt-3 gap-2">
            <Button variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button size="sm">
              <Bookmark className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-200/50 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Dicas de Investigação Defensiva</h4>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Use aspas para buscar termos exatos: &quot;nome completo&quot;</li>
                <li>• Combine nome com localidade para resultados mais precisos</li>
                <li>• Verifique redes sociais de familiares para encontrar conexões</li>
                <li>• Use o Wayback Machine para ver versões antigas de perfis</li>
                <li>• O Google Earth pode revelar características importantes do local do crime</li>
                <li>• Documente todas as descobertas com capturas de tela</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
