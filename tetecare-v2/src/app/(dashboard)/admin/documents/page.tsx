"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  File
} from "lucide-react";
import { toast } from "sonner";
import { DocumentUpload } from "@/components/document-upload";

const categoryIcons: Record<string, typeof FileText> = {
  vaccination: Syringe,
  exam: TestTube,
  prescription: Pill,
  other: File,
};

const categoryLabels: Record<string, string> = {
  vaccination: "Vacinação",
  exam: "Exame",
  prescription: "Receita",
  other: "Outro",
};

export default function AdminDocuments() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    path: string;
    fileType: string;
    fileSize: number;
  } | null>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({
    category: categoryFilter === "all" ? undefined : categoryFilter,
  });

  const { data: allPets } = trpc.pets.list.useQuery();

  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento cadastrado!");
      setIsUploadDialogOpen(false);
      setUploadedFile(null);
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

  const handleSubmitDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      toast.error("Por favor, envie um arquivo primeiro");
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    uploadDocument.mutate({
      petId: Number(formData.get("petId")),
      title: formData.get("title") as string,
      description: formData.get("description") as string || undefined,
      category: formData.get("category") as "vaccination" | "exam" | "prescription" | "other",
      fileUrl: uploadedFile.url,
      fileType: uploadedFile.fileType,
      fileSize: uploadedFile.fileSize,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground mt-2">
            Documentos veterinários dos pets
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Categoria:</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vaccination">Vacinação</SelectItem>
                <SelectItem value="exam">Exames</SelectItem>
                <SelectItem value="prescription">Receitas</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      {!documents || documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum documento encontrado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((item) => {
            const CategoryIcon = categoryIcons[item.document.category] || FileText;
            
            return (
              <Card key={item.document.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.document.title}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1">
                          <Dog className="h-3 w-3" />
                          {item.pet?.name}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {categoryLabels[item.document.category]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.document.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.document.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mb-3">
                    {item.document.fileType && (
                      <span className="uppercase">{item.document.fileType}</span>
                    )}
                    {item.document.fileSize && (
                      <span> • {(item.document.fileSize / 1024).toFixed(1)} KB</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(item.document.fileUrl, "_blank")}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm("Remover este documento?")) {
                          deleteDocument.mutate({ id: item.document.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(item.document.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmitDocument}>
            <DialogHeader>
              <DialogTitle>Novo Documento</DialogTitle>
              <DialogDescription>
                Envie um documento veterinário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet *</Label>
                <Select name="petId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPets?.map((pet) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaccination">Vacinação</SelectItem>
                    <SelectItem value="exam">Exame</SelectItem>
                    <SelectItem value="prescription">Receita</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Ex: Carteira de vacinação"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Arquivo *</Label>
                <DocumentUpload
                  onUploadComplete={(data) => setUploadedFile(data)}
                  onUploadError={() => setUploadedFile(null)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                  placeholder="Informações adicionais sobre o documento"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  setUploadedFile(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={uploadDocument.isPending || !uploadedFile}
              >
                {uploadDocument.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
