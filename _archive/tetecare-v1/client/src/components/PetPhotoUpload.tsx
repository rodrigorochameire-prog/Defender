import { useState, useRef } from "react";
import { trpc } from "../lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Upload, X, Check } from "lucide-react";
import { toast } from "sonner";

interface PetPhotoUploadProps {
  currentPhotoUrl?: string | null;
  petId: number;
  petName: string;
  onPhotoUpdated: (newPhotoUrl: string) => void;
}

export function PetPhotoUpload({ currentPhotoUrl, petId, petName, onPhotoUpdated }: PetPhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadPhotoMutation = trpc.pets.uploadPhoto.useMutation({
    onSuccess: (data) => {
      onPhotoUpdated(data.photoUrl);
      toast.success("Foto atualizada com sucesso!");
      setIsOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da foto");
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(",")[1];

        // Upload via tRPC
        await uploadPhotoMutation.mutateAsync({
          petId,
          fileName: selectedFile.name,
          fileContent: base64Content,
          mimeType: selectedFile.type,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      // Error already handled in mutation
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative group">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
          {currentPhotoUrl ? (
            <img src={currentPhotoUrl} alt={petName} className="w-full h-full object-cover" />
          ) : (
            <div className="text-4xl font-bold text-gray-400">
              {petName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Upload className="h-8 w-8 text-white" />
        </button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Foto de {petName}</DialogTitle>
            <DialogDescription>
              Selecione uma nova foto de perfil. Tamanho máximo: 5MB. Formatos aceitos: JPG, PNG.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {previewUrl ? (
              <div className="relative">
                <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer flex flex-col items-center justify-center bg-gray-50"
              >
                <Upload className="h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">Clique para selecionar uma foto</p>
                <p className="text-xs text-gray-400 mt-1">JPG ou PNG, máx. 5MB</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Salvar Foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
