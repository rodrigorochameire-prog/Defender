import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Image,
  Calendar,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Clock,
} from "lucide-react";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentViewer } from "./DocumentViewer";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  vaccination_card: "Carteira de Vacinação",
  veterinary_document: "Documento Veterinário",
  exam: "Exame",
  certificate: "Certificado",
  prescription: "Prescrição",
  other: "Outro",
};

const CATEGORY_ICONS = {
  vaccination_card: <FileText className="h-5 w-5 text-green-600" />,
  veterinary_document: <FileText className="h-5 w-5 text-blue-600" />,
  exam: <FileText className="h-5 w-5 text-purple-600" />,
  certificate: <FileText className="h-5 w-5 text-yellow-600" />,
  prescription: <FileText className="h-5 w-5 text-orange-600" />,
  other: <FileText className="h-5 w-5 text-gray-600" />,
};

interface DocumentManagementProps {
  petId: number;
  showUpload?: boolean;
}

export function DocumentManagement({ petId, showUpload = true }: DocumentManagementProps) {
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [groupBy, setGroupBy] = useState<"category" | "date">("date");

  const { data: documents, refetch } = trpc.documents.getPetDocuments.useQuery(
    { petId },
    { enabled: !!petId }
  );

  const updateDoc = trpc.documents.update.useMutation({
    onSuccess: () => {
      toast.success("Documento atualizado!");
      setEditingDoc(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento excluído!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateDoc.mutate({
      id: editingDoc.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as any,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteDoc.mutate({ id });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group documents
  const groupedDocs = documents?.reduce((acc, doc) => {
    const key = groupBy === "category"
      ? doc.category
      : new Date(doc.createdAt).toLocaleDateString("pt-BR", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedGroups = Object.entries(groupedDocs || {}).sort(([a], [b]) => {
    if (groupBy === "date") {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos</h2>
          <p className="text-sm text-muted-foreground">
            {documents?.length || 0} documento(s) cadastrado(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Agrupar por Data</SelectItem>
              <SelectItem value="category">Agrupar por Categoria</SelectItem>
            </SelectContent>
          </Select>
          {showUpload && <DocumentUpload petId={petId} onUploadSuccess={refetch} />}
        </div>
      </div>

      {/* Timeline View */}
      {sortedGroups.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Nenhum Documento</h3>
              <p className="text-sm text-muted-foreground">
                {showUpload
                  ? "Comece enviando o primeiro documento"
                  : "Este pet não possui documentos cadastrados"}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedGroups.map(([groupKey, docs]) => (
            <div key={groupKey} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <h3 className="text-lg font-semibold px-4 bg-background">
                  {groupBy === "category" ? CATEGORY_LABELS[groupKey as keyof typeof CATEGORY_LABELS] : groupKey}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc: any) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {CATEGORY_ICONS[doc.category as keyof typeof CATEGORY_ICONS]}
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base line-clamp-2">
                              {doc.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDate(doc.createdAt)}
                              <Clock className="h-3 w-3 ml-2" />
                              {formatTime(doc.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {doc.description}
                        </p>
                      )}
                      <Badge variant="secondary" className="mb-3">
                        {CATEGORY_LABELS[doc.category as keyof typeof CATEGORY_LABELS]}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewingDoc(doc)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingDoc(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => !open && setEditingDoc(null)}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Editar Documento</DialogTitle>
              <DialogDescription>Atualize as informações do documento</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  name="title"
                  defaultValue={editingDoc?.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria *</Label>
                <Select name="category" defaultValue={editingDoc?.category} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingDoc?.description}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingDoc(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateDoc.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewingDoc && (
        <DocumentViewer
          document={viewingDoc}
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
