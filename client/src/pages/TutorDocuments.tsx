import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TutorLayout from "@/components/TutorLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon, DownloadIcon, FileTextIcon, ImageIcon, ClipboardIcon, FolderIcon } from "lucide-react";

const CATEGORY_LABELS = {
  vaccination_card: "Carteira de Vacinação",
  veterinary_document: "Documento Veterinário",
  exam: "Exame",
  certificate: "Certificado",
  prescription: "Prescrição",
  other: "Outro",
};

const CATEGORY_COLORS = {
  vaccination_card: "bg-green-500/20 text-green-700 border-green-300",
  veterinary_document: "bg-blue-500/20 text-blue-700 border-blue-300",
  exam: "bg-purple-500/20 text-purple-700 border-purple-300",
  certificate: "bg-yellow-500/20 text-yellow-700 border-yellow-300",
  prescription: "bg-orange-500/20 text-orange-700 border-orange-300",
  other: "bg-gray-500/20 text-gray-700 border-gray-300",
};

export default function TutorDocuments() {
  const [selectedPetId, setSelectedPetId] = useState<number>();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const { data: pets } = trpc.pets.list.useQuery();

  const { data: documents, isLoading } = trpc.documents.getPetDocuments.useQuery(
    { petId: selectedPetId! },
    { enabled: !!selectedPetId }
  );

  // Filter documents by category
  const filteredDocuments = selectedCategory
    ? documents?.filter((d) => d.category === selectedCategory)
    : documents;

  // Group documents by category
  const documentsByCategory = filteredDocuments?.reduce((acc, doc) => {
    const cat = doc.category as keyof typeof CATEGORY_LABELS;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileIcon className="h-8 w-8 text-muted-foreground" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-8 w-8 text-blue-500" />;
    if (mimeType === "application/pdf") return <FileTextIcon className="h-8 w-8 text-red-500" />;
    return <FileIcon className="h-8 w-8 text-muted-foreground" />;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Visualize documentos veterinários, exames e certificados dos seus pets</p>
        </div>

        {/* Pet and Category Filters */}
        <Card className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Selecione o Pet</Label>
              <Select value={selectedPetId?.toString()} onValueChange={(v) => setSelectedPetId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um pet" />
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

            <div className="flex-1">
              <Label>Filtrar por Categoria</Label>
              <Select value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Content */}
        {!selectedPetId ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <FolderIcon className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Selecione um Pet</h3>
                <p className="text-sm text-muted-foreground">Escolha um pet acima para visualizar seus documentos</p>
              </div>
            </div>
          </Card>
        ) : isLoading ? (
          <Card className="p-12">
            <div className="text-center">
              <p className="text-muted-foreground">Carregando documentos...</p>
            </div>
          </Card>
        ) : !filteredDocuments || filteredDocuments.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <ClipboardIcon className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Nenhum Documento Encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCategory
                    ? "Não há documentos nesta categoria para este pet"
                    : "Este pet ainda não possui documentos cadastrados"}
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{filteredDocuments.length}</p>
                  </div>
                  <ClipboardIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              </Card>
              {Object.entries(CATEGORY_LABELS).slice(0, 3).map(([key, label]) => {
                const count = documentsByCategory?.[key]?.length || 0;
                return (
                  <Card key={key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{count}</p>
                      </div>
                      <FileIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      {getFileIcon(doc.mimeType || undefined)}
                      <Badge variant="outline" className={CATEGORY_COLORS[doc.category as keyof typeof CATEGORY_COLORS]}>
                        {CATEGORY_LABELS[doc.category as keyof typeof CATEGORY_LABELS]}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-semibold line-clamp-2">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize || undefined)}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setViewDialogOpen(true);
                        }}
                      >
                        Visualizar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* View Document Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDocument?.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto">
              {selectedDocument?.mimeType?.startsWith("image/") ? (
                <img src={selectedDocument.fileUrl} alt={selectedDocument.title} className="w-full rounded-lg" />
              ) : selectedDocument?.mimeType === "application/pdf" ? (
                <iframe src={selectedDocument.fileUrl} className="w-full h-[70vh] rounded-lg" />
              ) : (
                <div className="text-center py-12">
                  <FileIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Visualização não disponível para este tipo de arquivo</p>
                  <Button
                    className="mt-4"
                    onClick={() => window.open(selectedDocument?.fileUrl, "_blank")}
                  >
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TutorLayout>
  );
}
