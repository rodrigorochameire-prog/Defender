"use client";

import { useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

// Categorias de documentos expandidas
const DOCUMENT_CATEGORIES = [
  { value: "vaccination", label: "Vacinação", icon: Syringe, color: "text-blue-500", bgColor: "bg-blue-100" },
  { value: "exam", label: "Exame", icon: TestTube, color: "text-purple-500", bgColor: "bg-purple-100" },
  { value: "prescription", label: "Receita", icon: Pill, color: "text-pink-500", bgColor: "bg-pink-100" },
  { value: "medical_record", label: "Prontuário", icon: FileText, color: "text-red-500", bgColor: "bg-red-100" },
  { value: "preventive", label: "Preventivo", icon: Shield, color: "text-green-500", bgColor: "bg-green-100" },
  { value: "training", label: "Adestramento", icon: GraduationCap, color: "text-orange-500", bgColor: "bg-orange-100" },
  { value: "behavior", label: "Comportamento", icon: Brain, color: "text-indigo-500", bgColor: "bg-indigo-100" },
  { value: "nutrition", label: "Nutrição", icon: Apple, color: "text-lime-500", bgColor: "bg-lime-100" },
  { value: "insurance", label: "Seguro", icon: ShieldCheck, color: "text-cyan-500", bgColor: "bg-cyan-100" },
  { value: "identification", label: "Identificação", icon: CreditCard, color: "text-amber-500", bgColor: "bg-amber-100" },
  { value: "contract", label: "Contrato", icon: FileCheck, color: "text-slate-500", bgColor: "bg-slate-100" },
  { value: "photo", label: "Foto", icon: Camera, color: "text-rose-500", bgColor: "bg-rose-100" },
  { value: "other", label: "Outro", icon: File, color: "text-gray-500", bgColor: "bg-gray-100" },
];

export default function AdminDocuments() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const { data: pets } = trpc.pets.list.useQuery();

  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento cadastrado com sucesso!");
      setIsUploadOpen(false);
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

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    uploadDocument.mutate({
      petId: parseInt(formData.get("petId") as string),
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category: selectedCategory as any,
      fileUrl: formData.get("fileUrl") as string,
      fileType: formData.get("fileType") as string || undefined,
    });
  };

  // Filtrar documentos
  const filteredDocuments = (documents || []).filter((doc: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        doc.document.title.toLowerCase().includes(term) ||
        doc.pet?.name?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Agrupar por categoria para estatísticas
  const categoryStats = DOCUMENT_CATEGORIES.map(cat => ({
    ...cat,
    count: (documents || []).filter((d: any) => d.document.category === cat.value).length
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FolderOpen className="h-8 w-8 text-primary" />
            Central de Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Todos os documentos e registros dos pets em um só lugar
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Stats Cards por Categoria */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {categoryStats.slice(0, 6).filter(cat => cat.count > 0).map((cat) => {
          const Icon = cat.icon;
          return (
            <Card 
              key={cat.value} 
              className={`cursor-pointer transition-all hover:shadow-md ${categoryFilter === cat.value ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === cat.value ? "all" : cat.value)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg ${cat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${cat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{cat.count}</p>
                  <p className="text-xs text-muted-foreground">{cat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs por Categoria */}
      <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs gap-1">
              <FolderOpen className="h-3 w-3" />
              Todos
            </TabsTrigger>
            <TabsTrigger value="vaccination" className="text-xs gap-1">
              <Syringe className="h-3 w-3" />
              Vacinas
            </TabsTrigger>
            <TabsTrigger value="exam" className="text-xs gap-1">
              <TestTube className="h-3 w-3" />
              Exames
            </TabsTrigger>
            <TabsTrigger value="prescription" className="text-xs gap-1">
              <Pill className="h-3 w-3" />
              Receitas
            </TabsTrigger>
            <TabsTrigger value="preventive" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              Preventivos
            </TabsTrigger>
            <TabsTrigger value="training" className="text-xs gap-1">
              <GraduationCap className="h-3 w-3" />
              Adestramento
            </TabsTrigger>
            <TabsTrigger value="photo" className="text-xs gap-1">
              <Camera className="h-3 w-3" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="other" className="text-xs gap-1">
              <File className="h-3 w-3" />
              Outros
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-48"
              />
            </div>

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
        </div>

        <TabsContent value={categoryFilter} className="mt-6">
          {filteredDocuments.length === 0 ? (
            <Card className="p-12 text-center">
              <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum documento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {categoryFilter !== "all" 
                  ? `Não há documentos na categoria "${DOCUMENT_CATEGORIES.find(c => c.value === categoryFilter)?.label}"`
                  : "Comece adicionando o primeiro documento"}
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Documento
              </Button>
            </Card>
          ) : viewMode === "grid" ? (
            /* Grid View */
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDocuments.map((item: any) => {
                const category = DOCUMENT_CATEGORIES.find(c => c.value === item.document.category);
                const Icon = category?.icon || File;
                
                return (
                  <Card key={item.document.id} className="group hover:shadow-lg transition-all overflow-hidden">
                    {/* Preview Area */}
                    <div className={`h-32 ${category?.bgColor || 'bg-gray-100'} flex items-center justify-center relative`}>
                      <Icon className={`h-16 w-16 ${category?.color || 'text-gray-400'} opacity-50`} />
                      
                      {/* Quick Actions Overlay */}
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
                              deleteDocument.mutate({ id: item.document.id });
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
                        <Badge variant="outline" className={`shrink-0 ${category?.color}`}>
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
                      
                      {item.document.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {item.document.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* List View */
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
                                deleteDocument.mutate({ id: item.document.id });
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
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Adicionar Documento
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo documento ou registro
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
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
                <Label htmlFor="category">Categoria *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="fileUrl">URL do Arquivo *</Label>
              <Input id="fileUrl" name="fileUrl" type="url" placeholder="https://..." required />
              <p className="text-xs text-muted-foreground">
                Cole a URL do arquivo (Google Drive, Dropbox, etc.)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fileType">Tipo do Arquivo</Label>
              <Select name="fileType">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="image">Imagem (JPG, PNG)</SelectItem>
                  <SelectItem value="doc">Documento (DOC, DOCX)</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" name="description" placeholder="Descrição do documento..." rows={2} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={uploadDocument.isPending}>
                {uploadDocument.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
