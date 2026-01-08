"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  FileText,
  Eye,
  Trash2,
  Dog,
  Syringe,
  TestTube,
  Pill,
  File,
  Upload,
  X,
  Loader2,
  Link2,
} from "lucide-react";
import { BreedIcon } from "@/components/breed-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

const categoryIcons: Record<string, typeof FileText> = {
  vaccination: Syringe,
  exam: TestTube,
  prescription: Pill,
  preventive: File,
  other: File,
};

const categoryLabels: Record<string, string> = {
  vaccination: "Vacinação",
  exam: "Exame",
  prescription: "Receita",
  preventive: "Preventivo",
  other: "Outro",
};

export default function TutorDocuments() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myPets } = trpc.pets.myPets.useQuery();

  // Buscar documentos para cada pet
  const petDocumentsQueries = myPets?.map((pet) => ({
    petId: pet.id,
    petName: pet.name,
    photoUrl: pet.photoUrl,
    breed: pet.breed,
    query: trpc.documents.byPet.useQuery({ petId: pet.id }),
  })) || [];

  const saveDocumentMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setIsUploadDialogOpen(false);
      resetForm();
      petDocumentsQueries.forEach(q => q.query.refetch());
    },
    onError: (error) => {
      toast.error("Erro ao enviar documento: " + error.message);
    },
  });

  const deleteDocument = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento removido!");
      petDocumentsQueries.forEach(q => q.query.refetch());
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
    setSelectedPetId("");
    setSelectedCategory("");
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

  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground mt-2">
            Documentos veterinários dos seus pets
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Enviar Documento
        </Button>
      </div>

      {/* Pets e seus documentos */}
      {!myPets || myPets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Dog className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Você ainda não tem pets cadastrados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {petDocumentsQueries.map(({ petId, petName, photoUrl, breed, query }) => {
            const documents = query.data || [];

            return (
              <AccordionItem key={petId} value={String(petId)} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt={petName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                        <BreedIcon breed={breed} className="h-5 w-5 text-slate-500" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium">{petName}</p>
                      <p className="text-sm text-muted-foreground">
                        {documents.length} documentos
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  {query.isLoading ? (
                    <div className="flex justify-center py-8">
                      <Skeleton className="h-20 w-full rounded-[14px]" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum documento</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSelectedPetId(String(petId));
                          setIsUploadDialogOpen(true);
                        }}
                      >
                        Enviar primeiro documento
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-3 pb-4 md:grid-cols-2">
                      {documents.map((doc) => {
                        const CategoryIcon = categoryIcons[doc.category] || FileText;
                        
                        return (
                          <Card key={doc.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <CategoryIcon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{doc.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {categoryLabels[doc.category] || doc.category}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                                </Badge>
                              </div>
                              {doc.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {doc.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => window.open(doc.fileUrl, "_blank")}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Remover este documento?")) {
                                      deleteDocument.mutate({ id: Number(doc.id) });
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Upload Document Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => { setIsUploadDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUploadDocument}>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                Faça upload de um arquivo ou adicione uma URL
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pet *</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {myPets?.map((pet) => (
                      <SelectItem key={pet.id} value={String(pet.id)}>
                        {pet.name}
                      </SelectItem>
                    ))}
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
                <Label>Categoria *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaccination">Vacinação</SelectItem>
                    <SelectItem value="exam">Exame</SelectItem>
                    <SelectItem value="prescription">Receita</SelectItem>
                    <SelectItem value="preventive">Preventivo</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
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
                  <div className="space-y-2">
                    <Input name="fileUrl" type="url" placeholder="https://drive.google.com/..." />
                    <p className="text-xs text-muted-foreground">Cole o link do documento</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setIsUploadDialogOpen(false); resetForm(); }}>Cancelar</Button>
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
