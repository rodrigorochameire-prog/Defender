import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon, UploadIcon, DownloadIcon, TrashIcon, FileTextIcon, ImageIcon, ClipboardIcon } from "lucide-react";
import { toast } from "sonner";

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

export default function AdminDocuments() {
  const [selectedPetId, setSelectedPetId] = useState<number>();
  const [selectedCategory, setSelectedCategory] = useState<string>();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // Upload form state
  const [uploadPetId, setUploadPetId] = useState<number>();
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.listAll.useQuery({
    petId: selectedPetId,
    category: selectedCategory as any,
  });

  const { data: pets } = trpc.pets.list.useQuery();

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
   toast.success("Documento enviado com sucesso!");
      setUploadDialogOpen(false);
      setUploadTitle("");
      setUploadCategory("");
      setUploadFile(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar documento: ${error.message}`);
    },
  });

  const deleteMutation = trpc.documents.delete.useMutation({
    onSuccess: () => {
   toast.success("Documento excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir documento: ${error.message}`);
    },
  });

  const handleUpload = async () => {
    if (!uploadPetId || !uploadTitle || !uploadCategory || !uploadFile) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validate file size (10MB)
    if (uploadFile.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O tamanho máximo é 10MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(uploadFile.type)) {
      toast.error("Tipo de arquivo não permitido. Apenas PDF, JPG e PNG são permitidos");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileData = e.target?.result as string;
      await uploadMutation.mutateAsync({
        petId: uploadPetId,
        title: uploadTitle,
        category: uploadCategory as any,
        fileData,
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este documento?")) {
      deleteMutation.mutate({ id });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <FileIcon className="h-4 w-4" />;
    if (mimeType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (mimeType === "application/pdf") return <FileTextIcon className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  };

  // Statistics
  const stats = {
    total: documents?.length || 0,
    byCategory: Object.keys(CATEGORY_LABELS).reduce((acc, cat) => {
      acc[cat] = documents?.filter((d) => d.category === cat).length || 0;
      return acc;
    }, {} as Record<string, number>),
  };

  return (
    <AdminLayout>
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Gerenciar documentos veterinários, exames e certificados</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UploadIcon className="h-4 w-4 mr-2" />
              Enviar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pet</Label>
                <Select value={uploadPetId?.toString()} onValueChange={(v) => setUploadPetId(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Título</Label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Ex: Carteira de Vacinação 2025"
                />
              </div>

              <div>
                <Label>Categoria</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
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

              <div>
                <Label>Arquivo (PDF, JPG, PNG - Máx 10MB)</Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button onClick={handleUpload} disabled={uploadMutation.isPending} className="w-full">
                {uploadMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Documentos</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <ClipboardIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>
        {Object.entries(CATEGORY_LABELS).slice(0, 3).map(([key, label]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{stats.byCategory[key]}</p>
              </div>
              <FileIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>Filtrar por Pet</Label>
            <Select value={selectedPetId?.toString() || "all"} onValueChange={(v) => setSelectedPetId(v === "all" ? undefined : Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os pets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pets</SelectItem>
                {pets?.map((pet) => (
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

      {/* Documents Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Pet</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tamanho</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : documents && documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>{getFileIcon(doc.mimeType || undefined)}</TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>{doc.petName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={CATEGORY_COLORS[doc.category as keyof typeof CATEGORY_COLORS]}>
                      {CATEGORY_LABELS[doc.category as keyof typeof CATEGORY_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatFileSize(doc.fileSize || undefined)}</TableCell>
                  <TableCell>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setViewDialogOpen(true);
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.fileUrl, "_blank")}
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum documento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* View Document Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            {selectedDocument?.mimeType?.startsWith("image/") ? (
              <img src={selectedDocument.fileUrl} alt={selectedDocument.title} className="w-full" />
            ) : selectedDocument?.mimeType === "application/pdf" ? (
              <iframe src={selectedDocument.fileUrl} className="w-full h-[70vh]" />
            ) : (
              <p className="text-center text-muted-foreground">Visualização não disponível para este tipo de arquivo</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
