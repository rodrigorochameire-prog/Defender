import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Image as ImageIcon, X, Calendar, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PhotoGalleryProps {
  petId: number;
  petName?: string;
}

export function PhotoGallery({ petId, petName = "seu pet" }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: photos, isLoading } = trpc.photos.list.useQuery({ petId });
  const utils = trpc.useUtils();

  const uploadPhoto = trpc.photos.upload.useMutation({
    onSuccess: () => {
      toast.success("Foto enviada com sucesso!");
      utils.photos.list.invalidate({ petId });
    },
    onError: (error) => {
      toast.error("Erro ao enviar foto: " + error.message);
    },
  });

  const deletePhoto = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto removida com sucesso!");
      utils.photos.list.invalidate({ petId });
    },
    onError: (error) => {
      toast.error("Erro ao remover foto: " + error.message);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        await uploadPhoto.mutateAsync({
          petId,
          photoData: base64,
          takenAt: new Date(),
        });
      };
      reader.readAsDataURL(file);
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = (photoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja remover esta foto?")) {
      deletePhoto.mutate({ id: photoId });
    }
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const goToPrevious = () => {
    if (lightboxIndex !== null && photos && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const goToNext = () => {
    if (lightboxIndex !== null && photos && lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const groupedByDate = photos?.reduce((acc: any, photo) => {
    const date = new Date(photo.takenAt).toLocaleDateString("pt-BR");
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {}) || {};

  if (isLoading) {
    return (
      <Card className="shadow-card border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="shadow-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="flex-1">
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-smooth">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploadPhoto.isPending ? "Enviando..." : "Clique para selecionar fotos"}
                </span>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadPhoto.isPending}
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Você pode selecionar múltiplas fotos. Formatos aceitos: JPG, PNG, WEBP
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      {Object.keys(groupedByDate).length === 0 ? (
        <Card className="shadow-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground mb-2">
              Nenhuma foto ainda
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Comece a adicionar fotos de {petName} para criar uma linda galeria de momentos
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, datePhotos]: [string, any]) => (
            <Card key={date} className="shadow-card border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{date}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {datePhotos.map((photo: any, idx: number) => {
                    const globalIndex = photos?.findIndex(p => p.id === photo.id) ?? 0;
                    return (
                      <div
                        key={photo.id}
                        className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer hover-lift"
                        onClick={() => openLightbox(globalIndex)}
                      >
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || `Foto de ${petName}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="destructive"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDelete(photo.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {photo.caption && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-xs text-white truncate">{photo.caption}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && photos && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {lightboxIndex < photos.length - 1 && (
            <button
              className="absolute right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          <div className="max-w-6xl max-h-[90vh] px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[lightboxIndex].photoUrl}
              alt={photos[lightboxIndex].caption || "Foto"}
              className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
            />
            {photos[lightboxIndex].caption && (
              <p className="text-white text-center mt-4">{photos[lightboxIndex].caption}</p>
            )}
            <p className="text-white/60 text-center text-sm mt-2">
              {new Date(photos[lightboxIndex].takenAt).toLocaleString("pt-BR")}
            </p>
            <p className="text-white/40 text-center text-xs mt-1">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
