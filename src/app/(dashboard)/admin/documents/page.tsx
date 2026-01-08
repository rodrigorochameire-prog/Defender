"use client";

import { useState, useRef } from "react";
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
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/shared/skeletons";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });
  const { data: pets } = trpc.pets.list.useQuery();

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
    setUploadMode("file");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", 
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou DOC.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Tamanho máximo: 10MB.");
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
            <p>Documentos e registros dos pets</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsUploadOpen(true)} size="sm" className="btn-sm btn-primary rounded-lg">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Documento
          </Button>
        </div>
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
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={(open) => { setIsUploadOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
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
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" className="hidden" />
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
                      <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC (máx. 10MB)</p>
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
