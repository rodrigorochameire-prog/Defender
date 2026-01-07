"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  onUploadComplete: (data: {
    url: string;
    path: string;
    fileType: string;
    fileSize: number;
  }) => void;
  onUploadError?: (error: string) => void;
}

export function DocumentUpload({ onUploadComplete, onUploadError }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tamanho (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }

      // Validar tipo
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("Tipo de arquivo não permitido. Use PDF, imagens ou documentos Word.");
        return;
      }

      setFile(selectedFile);
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (fileToUpload: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao fazer upload");
      }

      const data = await response.json();
      
      toast.success("Arquivo enviado com sucesso!");
      onUploadComplete(data);
    } catch (error) {
      console.error("Erro no upload:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao fazer upload";
      toast.error(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
      setFile(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {!file ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-32 border-dashed"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Clique para enviar</span>
              <br />
              ou arraste e solte
            </div>
            <div className="text-xs text-muted-foreground">
              PDF, imagens ou Word (máx. 10MB)
            </div>
          </div>
        </Button>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isUploading && (
            <div className="mt-3">
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {uploadProgress < 100 ? "Enviando..." : "Concluído!"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
