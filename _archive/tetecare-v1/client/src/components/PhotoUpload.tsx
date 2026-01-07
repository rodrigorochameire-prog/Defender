import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PhotoUploadProps {
  currentPhotoUrl?: string;
  petName: string;
  onUploadComplete: (photoUrl: string, photoKey: string) => void;
}

export function PhotoUpload({ currentPhotoUrl, petName, onUploadComplete }: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    await uploadPhoto(file);
  };

  const uploadPhoto = async (file: File) => {
    setIsUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Call upload API
        const response = await fetch("/api/upload-photo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64,
          }),
        });

        if (!response.ok) {
          throw new Error("Erro ao fazer upload");
        }

        const data = await response.json();
        onUploadComplete(data.url, data.key);
        toast.success("Foto atualizada com sucesso!");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da foto");
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreview = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="w-32 h-32 border-4 border-background shadow-lg transition-transform group-hover:scale-105">
          <AvatarImage src={displayUrl || undefined} alt={petName} />
          <AvatarFallback className="text-4xl bg-gradient-primary text-white">
            {petName[0]}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {previewUrl && !isUploading && (
          <button
            onClick={handleRemovePreview}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              {currentPhotoUrl ? "Alterar Foto" : "Adicionar Foto"}
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Formatos aceitos: JPG, PNG, GIF<br />
        Tamanho máximo: 5MB
      </p>
    </div>
  );
}
