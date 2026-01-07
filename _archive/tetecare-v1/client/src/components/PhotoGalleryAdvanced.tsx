import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Heart, Laugh, ThumbsUp, MessageCircle, Download, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface PhotoGalleryAdvancedProps {
  petId: number;
  isAdmin?: boolean;
}

export default function PhotoGalleryAdvanced({ petId, isAdmin = false }: PhotoGalleryAdvancedProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState<{ [key: number]: string }>({});
  const [commentText, setCommentText] = useState("");

  const utils = trpc.useUtils();
  const { data: photos, isLoading } = trpc.photos.list.useQuery({ petId });
  
  const uploadMutation = trpc.photos.uploadMultiple.useMutation({
    onSuccess: () => {
      toast.success("Fotos enviadas com sucesso!");
      utils.photos.list.invalidate({ petId });
      setUploadDialogOpen(false);
      setSelectedFiles([]);
      setCaptions({});
    },
    onError: () => {
      toast.error("Erro ao enviar fotos");
    },
  });

  const deleteMutation = trpc.photos.delete.useMutation({
    onSuccess: () => {
      toast.success("Foto excluída");
      utils.photos.list.invalidate({ petId });
      setLightboxOpen(false);
    },
    onError: () => {
      toast.error("Erro ao excluir foto");
    },
  });

  const addCommentMutation = trpc.photos.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado");
      utils.photos.getComments.invalidate();
      setCommentText("");
    },
  });

  const addReactionMutation = trpc.photos.addReaction.useMutation({
    onSuccess: () => {
      utils.photos.getReactions.invalidate();
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setCaptions((prev) => {
      const newCaptions = { ...prev };
      delete newCaptions[index];
      return newCaptions;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecione pelo menos uma foto");
      return;
    }

    const photosData = await Promise.all(
      selectedFiles.map(async (file, index) => {
        return new Promise<{ photoData: string; caption?: string; takenAt: Date }>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({
              photoData: reader.result as string,
              caption: captions[index],
              takenAt: new Date(),
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    uploadMutation.mutate({ petId, photos: photosData });
  };

  const openLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  const navigatePhoto = (direction: "prev" | "next") => {
    if (!photos) return;
    if (direction === "prev") {
      setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    } else {
      setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  };

  const handleReaction = (photoId: number, reactionType: "like" | "love" | "laugh") => {
    addReactionMutation.mutate({ photoId, reactionType });
  };

  const handleAddComment = (photoId: number) => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ photoId, comment: commentText });
  };

  // Group photos by date
  const photosByDate = photos?.reduce((acc: { [key: string]: typeof photos }, photo) => {
    const date = new Date(photo.takenAt).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="text-center py-8">Carregando fotos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Galeria de Fotos</h3>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Adicionar Fotos
        </Button>
      </div>

      {/* Timeline */}
      {photosByDate && Object.keys(photosByDate).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(photosByDate).map(([date, datePhotos]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-muted-foreground mb-4">{date}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {datePhotos.map((photo, index) => {
                  const globalIndex = photos?.findIndex((p) => p.id === photo.id) || 0;
                  return (
                    <Card
                      key={photo.id}
                      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openLightbox(globalIndex)}
                    >
                      <CardContent className="p-0">
                        <img
                          src={photo.photoUrl}
                          alt={photo.caption || "Pet photo"}
                          className="w-full h-48 object-cover"
                        />
                        {photo.caption && (
                          <div className="p-2 text-sm text-muted-foreground">{photo.caption}</div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma foto ainda. Adicione a primeira foto!
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Fotos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="photos">Selecionar Fotos</Label>
              <Input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium">Fotos Selecionadas ({selectedFiles.length})</h4>
                {selectedFiles.map((file, index) => (
                  <Card key={index}>
                    <CardContent className="p-4 flex gap-4">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-24 h-24 object-cover rounded"
                      />
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-medium">{file.name}</p>
                        <div>
                          <Label htmlFor={`caption-${index}`}>Legenda (opcional)</Label>
                          <Textarea
                            id={`caption-${index}`}
                            value={captions[index] || ""}
                            onChange={(e) =>
                              setCaptions((prev) => ({ ...prev, [index]: e.target.value }))
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? "Enviando..." : "Enviar Fotos"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      {photos && photos.length > 0 && (
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-4xl">
            <div className="relative">
              {/* Navigation Buttons */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10"
                onClick={() => navigatePhoto("prev")}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
                onClick={() => navigatePhoto("next")}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>

              {/* Photo */}
              <img
                src={photos[selectedPhotoIndex]?.photoUrl}
                alt={photos[selectedPhotoIndex]?.caption || "Pet photo"}
                className="w-full max-h-[60vh] object-contain"
              />

              {/* Photo Info */}
              <div className="mt-4 space-y-4">
                {photos[selectedPhotoIndex]?.caption && (
                  <p className="text-sm">{photos[selectedPhotoIndex].caption}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(photos[selectedPhotoIndex]?.takenAt).toLocaleString("pt-BR")}
                </p>

                {/* Reactions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReaction(photos[selectedPhotoIndex].id, "like")}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Curtir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReaction(photos[selectedPhotoIndex].id, "love")}
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    Amar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReaction(photos[selectedPhotoIndex].id, "laugh")}
                  >
                    <Laugh className="w-4 h-4 mr-1" />
                    Rir
                  </Button>
                </div>

                {/* Comment Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar comentário..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment(photos[selectedPhotoIndex].id);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleAddComment(photos[selectedPhotoIndex].id)}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex justify-between">
                  <Button variant="outline" size="sm" asChild>
                    <a href={photos[selectedPhotoIndex]?.photoUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-1" />
                      Baixar
                    </a>
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate({ id: photos[selectedPhotoIndex].id })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
