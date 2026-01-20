"use client";

import { useState, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  FileText,
  Download,
  Trash2,
  Eye,
  Dog,
  Syringe,
  TestTube,
  Pill,
  File,
  Shield,
  GraduationCap,
  Brain,
  Apple,
  ShieldCheck,
  CreditCard,
  FileCheck,
  Camera,
  FolderOpen,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  Grid3X3,
  List,
  Filter,
  SortAsc,
  Upload,
  X,
  Loader2,
  Link2,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Heart,
  Clipboard,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/shared/skeletons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

const NEUTRAL_COLORS = ["#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Categorias de documentos expandidas com módulos relacionados
const DOCUMENT_CATEGORIES = [
  { value: "vaccination", label: "Vacinação", icon: Syringe, color: "text-blue-500", bgColor: "bg-blue-100", module: "health" },
  { value: "exam", label: "Exame", icon: TestTube, color: "text-purple-500", bgColor: "bg-purple-100", module: "health" },
  { value: "prescription", label: "Receita", icon: Pill, color: "text-pink-500", bgColor: "bg-pink-100", module: "health" },
  { value: "medical_record", label: "Prontuário", icon: FileText, color: "text-red-500", bgColor: "bg-red-100", module: "health" },
  { value: "preventive", label: "Preventivo", icon: Shield, color: "text-green-500", bgColor: "bg-green-100", module: "health" },
  { value: "daily_log", label: "Log Diário", icon: Clipboard, color: "text-teal-500", bgColor: "bg-teal-100", module: "daily_log" },
  { value: "training", label: "Adestramento", icon: GraduationCap, color: "text-orange-500", bgColor: "bg-orange-100", module: "training" },
  { value: "behavior", label: "Comportamento", icon: Brain, color: "text-indigo-500", bgColor: "bg-indigo-100", module: "behavior" },
  { value: "nutrition", label: "Nutrição", icon: Apple, color: "text-lime-500", bgColor: "bg-lime-100", module: "nutrition" },
  { value: "insurance", label: "Seguro", icon: ShieldCheck, color: "text-cyan-500", bgColor: "bg-cyan-100", module: "other" },
  { value: "identification", label: "Identificação", icon: CreditCard, color: "text-amber-500", bgColor: "bg-amber-100", module: "other" },
  { value: "contract", label: "Contrato", icon: FileCheck, color: "text-slate-500", bgColor: "bg-slate-100", module: "other" },
  { value: "photo", label: "Foto", icon: Camera, color: "text-rose-500", bgColor: "bg-rose-100", module: "other" },
  { value: "other", label: "Outro", icon: File, color: "text-gray-500", bgColor: "bg-gray-100", module: "other" },
];

// Módulos do sistema
const MODULES = [
  { value: "all", label: "Todos", icon: FolderOpen },
  { value: "health", label: "Saúde", icon: Heart },
  { value: "daily_log", label: "Logs Diários", icon: Clipboard },
  { value: "behavior", label: "Comportamento", icon: Brain },
  { value: "training", label: "Treinamento", icon: GraduationCap },
  { value: "nutrition", label: "Nutrição", icon: Apple },
  { value: "other", label: "Outros", icon: File },
];

export default function AdminDocuments() {
  const [mainTab, setMainTab] = useState("documents");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const { data: allDocuments } = trpc.documents.list.useQuery({});
  const { data: pets } = trpc.pets.list.useQuery();

  // Dados para infográficos expandidos
  const chartData = useMemo(() => {
    if (!allDocuments) return { 
      byCategory: [], byPet: [], timeline: [], byModule: [],
      stats: { total: 0, thisMonth: 0, thisWeek: 0, categories: 0 },
      moduleStats: []
    };

    // Por categoria
    const categoryCount: Record<string, number> = {};
    const petCount: Record<string, number> = {};
    const monthCount: Record<string, number> = {};
    const moduleCount: Record<string, number> = {};
    
    // Contagem desta semana e mês
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let thisWeek = 0;
    let thisMonth = 0;
    
    allDocuments.forEach(doc => {
      // Por categoria
      const cat = doc.document.category || "other";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      
      // Por módulo
      const catInfo = DOCUMENT_CATEGORIES.find(c => c.value === cat);
      const docModule = catInfo?.module || "other";
      moduleCount[docModule] = (moduleCount[docModule] || 0) + 1;
      
      // Por pet
      if (doc.pet?.name) {
        petCount[doc.pet.name] = (petCount[doc.pet.name] || 0) + 1;
      }
      
      // Por mês
      const date = new Date(doc.document.createdAt);
      const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      monthCount[monthKey] = (monthCount[monthKey] || 0) + 1;
      
      // Stats
      if (date >= monthStart) thisMonth++;
      if (date >= weekStart) thisWeek++;
    });

    const byCategory = Object.entries(categoryCount).map(([key, value]) => {
      const cat = DOCUMENT_CATEGORIES.find(c => c.value === key);
      return { name: cat?.label || key, value, category: key };
    }).sort((a, b) => b.value - a.value).slice(0, 8);

    const byPet = Object.entries(petCount)
      .map(([name, value]) => ({ name: name.length > 10 ? name.slice(0, 10) + '...' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const byModule = MODULES.filter(m => m.value !== "all").map(m => ({
      name: m.label,
      value: moduleCount[m.value] || 0,
      module: m.value,
    })).filter(m => m.value > 0);

    // Últimos 6 meses
    const timeline = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      return { month: monthKey, docs: monthCount[monthKey] || 0 };
    });

    // Stats por módulo
    const moduleStats = MODULES.filter(m => m.value !== "all").map(m => ({
      ...m,
      count: moduleCount[m.value] || 0,
      percent: allDocuments.length > 0 
        ? Math.round((moduleCount[m.value] || 0) / allDocuments.length * 100) 
        : 0
    }));

    return {
      byCategory,
      byPet,
      timeline,
      byModule,
      stats: {
        total: allDocuments.length,
        thisMonth,
        thisWeek,
        categories: Object.keys(categoryCount).length,
      },
      moduleStats
    };
  }, [allDocuments]);

  // Filtrar documentos por módulo
  const filteredByModule = useMemo(() => {
    if (!documents) return [];
    if (moduleFilter === "all") return documents;
    
    return documents.filter((doc: any) => {
      const cat = DOCUMENT_CATEGORIES.find(c => c.value === doc.document.category);
      return cat?.module === moduleFilter;
    });
  }, [documents, moduleFilter]);

  // Filtrar documentos por busca
  const filteredDocuments = useMemo(() => {
    if (!filteredByModule) return [];
    if (!searchTerm) return filteredByModule;
    
    const term = searchTerm.toLowerCase();
    return filteredByModule.filter((doc: any) => 
      doc.document.title.toLowerCase().includes(term) ||
      doc.pet?.name?.toLowerCase().includes(term)
    );
  }, [filteredByModule, searchTerm]);

  const saveDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setIsUploadOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao cadastrar documento: " + error.message);
    },
  });

  const deleteDocument = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento removido!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao remover documento: " + error.message);
    },
  });

  const getUploadUrlMutation = trpc.documents.getUploadUrl.useMutation({
    onError: (error) => {
      toast.error("Erro ao gerar URL de upload: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCategory("");
    setSelectedPetId("");
    setSelectedModule("");
    setUploadMode("file");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", 
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "video/mp4", "video/quicktime", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG, PNG, DOC ou vídeo.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 100MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || undefined;

    if (!selectedPetId || !selectedCategory) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Modo URL
    if (uploadMode === "url") {
      const fileUrl = formData.get("fileUrl") as string;
      if (!fileUrl) {
        toast.error("Informe a URL do arquivo");
        return;
      }
      saveDocumentMutation.mutate({
        petId: parseInt(selectedPetId),
        title,
        description,
        category: selectedCategory as any,
        fileUrl,
        fileName: formData.get("fileName") as string || undefined,
        mimeType: formData.get("mimeType") as string || undefined,
      });
      return;
    }

    // Modo upload de arquivo
    if (!selectedFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    setUploading(true);
    try {
      // 1. Obter URL assinada do servidor
      const uploadData = await getUploadUrlMutation.mutateAsync({
        petId: parseInt(selectedPetId),
        category: selectedCategory,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
      });

      // 2. Fazer upload direto para o Supabase Storage
      const uploadResponse = await fetch(uploadData.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error("Falha no upload do arquivo");
      }

      // 3. Gerar URL pública do arquivo
      const publicUrl = `https://siwapjqndevuwsluncnr.supabase.co/storage/v1/object/public/documents/${uploadData.path}`;

      // 4. Salvar documento no banco
      await saveDocumentMutation.mutateAsync({
        petId: parseInt(selectedPetId),
        title,
        description,
        category: selectedCategory as any,
        fileUrl: publicUrl,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer upload");
    } finally {
      setUploading(false);
    }
  };

  // Agrupar por categoria para estatísticas
  const categoryStats = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    count: (documents || []).filter((d: any) => d.document.category === cat.value).length
  }));

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <FolderOpen />
          </div>
          <div className="page-header-info">
            <h1>Central de Documentos</h1>
            <p>Documentos e registros dos pets por funcionalidade</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsUploadOpen(true)} size="sm" className="btn-sm btn-primary rounded-lg">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <FolderOpen className="stat-card-icon muted" />
          </div>
          <div className="stat-card-value">{chartData.stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Esta Semana</span>
            <Calendar className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{chartData.stats.thisWeek}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Este Mês</span>
            <TrendingUp className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{chartData.stats.thisMonth}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Categorias</span>
            <BarChart3 className="stat-card-icon amber" />
          </div>
          <div className="stat-card-value">{chartData.stats.categories}</div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="documents" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="by-module" className="gap-2">
            <Activity className="h-4 w-4" />
            Por Funcionalidade
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* Tab: Documentos */}
        <TabsContent value="documents" className="space-y-4">
          {/* Filtro por Módulo */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {MODULES.map((mod) => {
                  const IconComponent = mod.icon;
                  const isActive = moduleFilter === mod.value;
                  return (
                    <Button
                      key={mod.value}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setModuleFilter(mod.value)}
                      className="gap-1.5"
                    >
                      <IconComponent className="h-3.5 w-3.5" />
                      {mod.label}
                      {mod.value !== "all" && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                          {chartData.moduleStats.find(m => m.value === mod.value)?.count || 0}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou pet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          {filteredDocuments.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {moduleFilter !== "all" 
                  ? `Não há documentos no módulo "${MODULES.find(m => m.value === moduleFilter)?.label}"`
                  : "Comece adicionando o primeiro documento"}
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Documento
              </Button>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDocuments.map((item: any) => {
                const category = DOCUMENT_CATEGORIES.find(c => c.value === item.document.category);
                const Icon = category?.icon || File;
                
                return (
                  <Card key={item.document.id} className="group hover:shadow-lg transition-all overflow-hidden">
                    <div className={`h-32 ${category?.bgColor || 'bg-gray-100'} flex items-center justify-center relative`}>
                      <Icon className={`h-16 w-16 ${category?.color || 'text-gray-400'} opacity-50`} />
                      
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="secondary" asChild>
                          <a href={item.document.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button size="sm" variant="secondary" asChild>
                          <a href={item.document.fileUrl} download>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Remover este documento?")) {
                              deleteDocument.mutate({ id: Number(item.document.id) });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium line-clamp-1">{item.document.title}</h3>
                        <Badge variant="outline" className={`shrink-0 text-xs ${category?.color}`}>
                          {category?.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Dog className="h-3 w-3" />
                        <span>{item.pet?.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.document.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredDocuments.map((item: any) => {
                    const category = DOCUMENT_CATEGORIES.find(c => c.value === item.document.category);
                    const Icon = category?.icon || File;
                    
                    return (
                      <div key={item.document.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${category?.bgColor || 'bg-gray-100'}`}>
                            <Icon className={`h-5 w-5 ${category?.color || 'text-gray-500'}`} />
                          </div>
                          <div>
                            <h3 className="font-medium">{item.document.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Dog className="h-3 w-3" />
                                {item.pet?.name}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.document.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                              <Badge variant="outline" className={category?.color}>
                                {category?.label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.document.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.document.fileUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Remover este documento?")) {
                                deleteDocument.mutate({ id: Number(item.document.id) });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Por Funcionalidade */}
        <TabsContent value="by-module" className="space-y-6">
          {/* Resumo por Módulo */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {chartData.moduleStats.map((mod) => {
              const ModIcon = mod.icon;
              return (
                <Card 
                  key={mod.value} 
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => { setModuleFilter(mod.value); setMainTab("documents"); }}
                >
                  <CardContent className="pt-6 text-center">
                    <ModIcon className="h-8 w-8 mx-auto mb-2 text-slate-500" />
                    <p className="text-2xl font-bold">{mod.count}</p>
                    <p className="text-xs text-muted-foreground">{mod.label}</p>
                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-slate-500 rounded-full transition-all" 
                        style={{ width: `${mod.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{mod.percent}%</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detalhamento por Módulo */}
          <div className="grid gap-6 lg:grid-cols-2">
            {MODULES.filter(m => m.value !== "all").map((mod) => {
              const ModIcon = mod.icon;
              const moduleDocs = (allDocuments || []).filter((d: any) => {
                const cat = DOCUMENT_CATEGORIES.find(c => c.value === d.document.category);
                return cat?.module === mod.value;
              });
              const categories = DOCUMENT_CATEGORIES.filter(c => c.module === mod.value);
              
              return (
                <Card key={mod.value} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ModIcon className="h-4 w-4" />
                      {mod.label}
                      <Badge variant="secondary" className="ml-auto">{moduleDocs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {moduleDocs.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        Nenhum documento neste módulo
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {categories.map(cat => {
                          const catDocs = moduleDocs.filter((d: any) => d.document.category === cat.value);
                          if (catDocs.length === 0) return null;
                          
                          return (
                            <div key={cat.value} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2">
                                <cat.icon className={`h-4 w-4 ${cat.color}`} />
                                <span className="text-sm">{cat.label}</span>
                              </div>
                              <Badge variant="outline">{catDocs.length}</Badge>
                            </div>
                          );
                        })}
                        
                        {/* Últimos documentos do módulo */}
                        <div className="pt-3 border-t mt-3">
                          <p className="text-xs text-muted-foreground mb-2">Últimos documentos:</p>
                          {moduleDocs.slice(0, 3).map((doc: any) => (
                            <div key={doc.document.id} className="flex items-center gap-2 text-sm py-1">
                              <span className="truncate flex-1">{doc.document.title}</span>
                              <span className="text-xs text-muted-foreground">{doc.pet?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Gráficos */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Por Módulo */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Por Funcionalidade
                </CardTitle>
                <CardDescription>Distribuição de documentos por módulo</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.byModule.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={chartData.byModule}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {chartData.byModule.map((_, index) => (
                            <Cell key={`mod-${index}`} fill={NEUTRAL_COLORS[index % NEUTRAL_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Por Pet */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Por Pet
                </CardTitle>
                <CardDescription>Pets com mais documentos</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.byPet.length > 0 ? (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.byPet} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis type="category" dataKey="name" width={80} stroke="#94a3b8" fontSize={11} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="value" name="Documentos" fill="#64748b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Sem dados disponíveis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Por Categoria */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Por Categoria
              </CardTitle>
              <CardDescription>Distribuição detalhada por tipo de documento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {chartData.byCategory.map((cat, i) => {
                  const catInfo = DOCUMENT_CATEGORIES.find(c => c.value === cat.category);
                  const CatIcon = catInfo?.icon || File;
                  const total = chartData.stats.total;
                  const percent = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                  
                  return (
                    <div key={cat.category} className={`p-4 rounded-lg ${catInfo?.bgColor || 'bg-gray-100'} text-center`}>
                      <CatIcon className={`h-6 w-6 mx-auto mb-2 ${catInfo?.color || 'text-gray-500'}`} />
                      <p className="text-xl font-bold">{cat.value}</p>
                      <p className="text-xs text-muted-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{percent}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Uploads por Mês
              </CardTitle>
              <CardDescription>Histórico de documentos enviados</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.timeline.length > 0 ? (
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }} 
                      />
                      <Area type="monotone" dataKey="docs" name="Documentos" stroke="#475569" fill="#475569" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados disponíveis
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Adicionar Documento
            </DialogTitle>
            <DialogDescription>
              Faça upload de um arquivo ou adicione uma URL
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pet *</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${cat.color}`} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" placeholder="Nome do documento" required />
            </div>

            {/* Toggle Upload/URL */}
            <div className="space-y-3">
              <Label>Arquivo</Label>
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <Button type="button" variant={uploadMode === "file" ? "default" : "ghost"} size="sm" className="flex-1 gap-2" onClick={() => setUploadMode("file")}>
                  <Upload className="h-4 w-4" />Upload
                </Button>
                <Button type="button" variant={uploadMode === "url" ? "default" : "ghost"} size="sm" className="flex-1 gap-2" onClick={() => setUploadMode("url")}>
                  <Link2 className="h-4 w-4" />URL
                </Button>
              </div>

              {uploadMode === "file" ? (
                <div 
                  className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${selectedFile ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.mp4,.mov,.webm" className="hidden" />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-primary/10 rounded-lg"><File className="h-6 w-6 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">Clique para selecionar</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC, Vídeo (máx. 100MB)</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input name="fileUrl" type="url" placeholder="https://drive.google.com/..." />
                  <p className="text-xs text-muted-foreground">Cole a URL do arquivo</p>
                  <div className="space-y-2">
                    <Label>Tipo do Arquivo</Label>
                    <Select name="mimeType">
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application/pdf">PDF</SelectItem>
                        <SelectItem value="image/jpeg">Imagem (JPG, PNG)</SelectItem>
                        <SelectItem value="video/mp4">Vídeo</SelectItem>
                        <SelectItem value="application/msword">Documento (DOC)</SelectItem>
                        <SelectItem value="application/octet-stream">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" placeholder="Descrição do documento..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsUploadOpen(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" disabled={uploading || saveDocumentMutation.isPending}>
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</> : saveDocumentMutation.isPending ? "Salvando..." : <><Upload className="h-4 w-4 mr-2" />Enviar</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
