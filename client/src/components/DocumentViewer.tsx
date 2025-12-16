import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Trash2,
  Edit,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Image as ImageIcon,
  FileCheck,
  FilePlus,
  FileQuestion,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentViewerProps {
  petId: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  vaccination_card: "Carteira de Vacinação",
  exam: "Exame",
  prescription: "Receita",
  certificate: "Certificado",
  veterinary_document: "Documento Veterinário",
  other: "Outro",
};

const CATEGORY_ICONS: Record<string, any> = {
  vaccination_card: FileCheck,
  exam: FilePlus,
  prescription: FileText,
  certificate: FileCheck,
  veterinary_document: FileText,
  other: FileQuestion,
};

export function DocumentViewer({ petId }: DocumentViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: documents, isLoading, refetch } = trpc.documents.getPetDocuments.useQuery({ petId });

  const updateMutation = trpc.documents.update.useMutation({
    onSuccess: () => {
      toast.success("Documento atualizado!");
      setEditingDoc(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento excluído!");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const filteredDocuments = selectedCategory === "all"
    ? documents
    : documents?.filter((doc: any) => doc.category === selectedCategory);

  const imageDocuments = documents?.filter((doc: any) => 
    doc.mimeType?.startsWith("image/")
  ) || [];

  const handleEdit = (doc: any) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditDescription(doc.description || "");
  };

  const handleUpdate = () => {
    if (!editingDoc) return;
    
    updateMutation.mutate({
      id: editingDoc.id,
      title: editTitle,
      description: editDescription,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const openLightbox = (imageUrl: string, index: number) => {
    setLightboxImage(imageUrl);
    setLightboxIndex(index);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    const newIndex = direction === "prev"
      ? (lightboxIndex - 1 + imageDocuments.length) % imageDocuments.length
      : (lightboxIndex + 1) % imageDocuments.length;
    
    setLightboxIndex(newIndex);
    setLightboxImage(imageDocuments[newIndex].fileUrl);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / 1024 / 1024;
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Categorias</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredDocuments?.length || 0} documento(s)
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="gallery">Galeria de Fotos</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          {filteredDocuments && filteredDocuments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDocuments.map((doc: any) => {
                const Icon = CATEGORY_ICONS[doc.category] || FileText;
                const isPDF = doc.mimeType === "application/pdf";
                const isImage = doc.mimeType?.startsWith("image/");

                return (
                  <Card key={doc.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className="h-5 w-5 text-primary mt-1" />
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {format(new Date(doc.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {CATEGORY_LABELS[doc.category]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Preview */}
                      {isImage && (
                        <div
                          className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                          onClick={() => openLightbox(doc.fileUrl, imageDocuments.findIndex((img: any) => img.id === doc.id))}
                        >
                          <img
                            src={doc.fileUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      )}

                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{doc.fileName}</span>
                        <span>{formatFileSize(doc.fileSize)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Baixar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento encontrado</p>
            </div>
          )}
        </TabsContent>

        {/* Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
          {imageDocuments.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {imageDocuments.map((doc: any, index: number) => (
                <div
                  key={doc.id}
                  className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => openLightbox(doc.fileUrl, index)}
                >
                  <img
                    src={doc.fileUrl}
                    alt={doc.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">{doc.title}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma foto encontrada</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-5xl p-0">
            <div className="relative">
              <img
                src={lightboxImage}
                alt="Preview"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              
              {/* Navigation */}
              {imageDocuments.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => navigateLightbox("prev")}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={() => navigateLightbox("next")}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </>
              )}

              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
                onClick={() => setLightboxImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>

              {/* Info */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
                <p className="font-medium">{imageDocuments[lightboxIndex]?.title}</p>
                <p className="text-sm opacity-80">
                  {lightboxIndex + 1} de {imageDocuments.length}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingDoc && (
        <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Documento</DialogTitle>
              <DialogDescription>
                Atualize o título e descrição do documento
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingDoc(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
