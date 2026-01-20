"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  folder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-20 h-20",
  md: "w-32 h-32",
  lg: "w-48 h-48",
};

export function PhotoUpload({
  currentPhotoUrl,
  onUpload,
  onRemove,
  folder = "pets",
  className,
  size = "md",
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      // Preview local
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);

      // Upload para o servidor
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro no upload");
      }

      // Atualizar com URL do Supabase
      setPreviewUrl(data.url);
      onUpload(data.url);
    } catch (err) {
      console.error("Erro no upload:", err);
      setError(err instanceof Error ? err.message : "Erro no upload");
      setPreviewUrl(currentPhotoUrl || null);
    } finally {
      setIsUploading(false);
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setError(null);
    onRemove?.();
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300",
          "flex items-center justify-center cursor-pointer",
          "hover:border-primary/50 hover:bg-gray-50 transition-all",
          sizeClasses[size]
        )}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs">Enviando...</span>
          </div>
        ) : previewUrl ? (
          <Image
            src={previewUrl}
            alt="Foto do pet"
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Camera className="w-8 h-8" />
            <span className="text-xs">Adicionar foto</span>
          </div>
        )}

        {/* Overlay com ícone de upload */}
        {!isUploading && previewUrl && (
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Botão de remover */}
      {previewUrl && !isUploading && onRemove && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      {/* Input hidden */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Erro */}
      {error && (
        <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
