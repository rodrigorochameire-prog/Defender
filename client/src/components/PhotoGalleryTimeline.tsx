import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, X, Heart, MessageCircle, Trash2, Calendar, User, Link2 } from "lucide-react";
import { toast } from "sonner";
import { storagePut } from "../../../server/storage";

interface PhotoGalleryTimelineProps {
  petId: number;
  canUpload?: boolean;
  canDelete?: boolean;
}

export function PhotoGalleryTimeline({ petId, canUpload = true, canDelete = false }: PhotoGalleryTimelineProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().split('T')[0]);
  const [caption, setCaption] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: timeline, isLoading } = trpc.photos.getTimeline.useQuery({ petId });
  const uploadMutation = trpc.photos.uploadMultiple.useMutation({
    onSuccess: () => {
      utils.photos.getTimeline.invalidate({ petId });
      toast.success("Fotos enviadas com sucesso!");
      setSelectedFiles([]);
      setCaption("");
    },
    onError: (error) => {
      toast.error(`Erro ao enviar fotos: ${error.message}`);
    },
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      utils.photos.getTimeline.invalidate({ petId });
      toast.success("Foto excluída com sucesso!");
      setSelectedPhoto(null);
    },
    onError: (error) => {
      toast.error(`Erro ao excluir foto: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > 10) {
      toast.error("Máximo de 10 fotos por vez");
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos uma foto");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedPhotos = [];

      for (const file of selectedFiles) {
        // Convert file to base64
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        uploadedPhotos.push({
          photoData: base64,
          caption: caption || undefined,
          takenAt: new Date(uploadDate),
        });
      }

      await uploadMutation.mutateAsync({
        petId,
        photos: uploadedPhotos,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload das fotos");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (photoId: number) => {
    if (confirm("Tem certeza que deseja excluir esta foto?")) {
      deleteMutation.mutate({ id: photoId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const timelineEntries = timeline ? Object.entries(timeline).sort((a, b) => b[0].localeCompare(a[0])) : [];

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {canUpload && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Adicionar Fotos
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data das Fotos</label>
              <Input
                type="date"
                value={uploadDate}
                onChange={(e) => setUploadDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Legenda (opcional)</label>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Adicione uma legenda para as fotos..."
                rows={2}
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Fotos (máx. 10)
              </Button>
            </div>

            {/* Preview Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? "Enviando..." : `Enviar ${selectedFiles.length} foto(s)`}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Timeline */}
      <div className="space-y-8">
        {timelineEntries.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Calendar className="h-16 w-16 opacity-50" />
              <div>
                <p className="text-lg font-medium">Nenhuma foto ainda</p>
                <p className="text-sm">Comece adicionando fotos do seu pet!</p>
              </div>
            </div>
          </Card>
        ) : (
          timelineEntries.map(([date, photos]) => (
            <div key={date} className="space-y-4">
              {/* Date Header */}
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h3>
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-sm text-muted-foreground">{photos.length} foto(s)</span>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo: any) => (
                  <Card
                    key={photo.id}
                    className="group cursor-pointer overflow-hidden hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <div className="relative aspect-square">
                      <img
                        src={photo.photoUrl}
                        alt={photo.caption || 'Pet photo'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1 text-white">
                          <Heart className="h-4 w-4" />
                          <span className="text-sm">{photo.reactionCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-white">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-sm">{photo.commentCount || 0}</span>
                        </div>
                      </div>
                    </div>
                    {photo.caption && (
                      <div className="p-2">
                        <p className="text-sm text-muted-foreground line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Photo Detail Dialog */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span>{selectedPhoto.uploaderName || 'Usuário'}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Funcionalidade em desenvolvimento");
                    }}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Anexar ao Calendário
                  </Button>
                  {canDelete && (
                    <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(selectedPhoto.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <img
                src={selectedPhoto.photoUrl}
                alt={selectedPhoto.caption || 'Pet photo'}
                className="w-full rounded-lg"
              />

              {selectedPhoto.caption && (
                <p className="text-sm">{selectedPhoto.caption}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {new Date(selectedPhoto.takenAt).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              {/* Comments section will be added in next phase */}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
