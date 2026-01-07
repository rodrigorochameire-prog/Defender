import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, FileText, X, CheckCircle } from "lucide-react";

interface DocumentUploadProps {
  petId: number;
  onUploadSuccess?: () => void;
}

const CATEGORIES = [
  { value: "vaccination_card", label: "Carteira de Vacinação" },
  { value: "exam", label: "Exame" },
  { value: "prescription", label: "Receita" },
  { value: "certificate", label: "Certificado" },
  { value: "veterinary_document", label: "Documento Veterinário" },
  { value: "other", label: "Outro" },
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain", // .txt
  "text/csv", // .csv
];

export function DocumentUpload({ petId, onUploadSuccess }: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.documents.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento enviado com sucesso!");
      setIsOpen(false);
      resetForm();
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar documento");
      setUploadProgress(0);
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setCategory("");
    setUploadProgress(0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Tipo de arquivo não permitido. Use PDF, imagens (JPG, PNG, WEBP), documentos do Office (DOC, DOCX, XLS, XLSX) ou arquivos de texto (TXT, CSV).");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Tamanho máximo: 25MB");
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setUploadProgress(10);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = event.target?.result as string;
      setUploadProgress(50);

      uploadMutation.mutate({
        petId,
        title,
        description,
        category: category as any,
        fileData,
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
      });
      
      setUploadProgress(100);
    };

    reader.readAsDataURL(selectedFile);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Enviar Documento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
          <DialogDescription>
            Faça upload de documentos veterinários, exames ou certificados
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.txt,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-4">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left flex-1">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, Imagens, Office ou Texto até 25MB
                </p>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Carteira de Vacinação 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione observações sobre este documento..."
              rows={3}
            />
          </div>

          {/* Progress Bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                Enviando... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={uploadMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || !category || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "Enviando..." : "Enviar Documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
