"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { getInitials } from "@/lib/utils";

export interface PhotoUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assistidoNome: string;
  currentPhoto: string | null;
  onUpload: (file: File) => void;
}

export function PhotoUploadDialog({
  isOpen,
  onClose,
  assistidoNome,
  currentPhoto,
  onUpload,
}: PhotoUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhoto);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      onUpload(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto do Assistido</DialogTitle>
          <DialogDescription>{assistidoNome}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={preview || undefined} />
              <AvatarFallback className="text-3xl bg-muted">{getInitials(assistidoNome)}</AvatarFallback>
            </Avatar>
          </div>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFileChange(e.dataTransfer.files[0]); }}
          >
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">Arraste uma imagem ou</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Selecionar Arquivo</Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={onClose}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
