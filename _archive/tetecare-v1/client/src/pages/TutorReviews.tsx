import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star, MessageSquare, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorReviews() {
  const { data: allPets = [], isLoading: loadingPets } = trpc.pets.list.useQuery();
  const pets = allPets;
  
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const selectedPet = pets.find((p: any) => p.id === selectedPetId);

  const { data: reviews = [], refetch } = trpc.reviews.list.useQuery(
    { petId: selectedPetId ?? undefined },
    { enabled: !!selectedPetId }
  );

  const { data: averageRating = 0 } = trpc.reviews.getAverageRating.useQuery();

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      toast.success("Avaliação enviada com sucesso!");
      setRating(0);
      setComment("");
      setVisitDate(new Date().toISOString().split("T")[0]);
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao enviar avaliação: " + error.message);
    },
  });

  const handleSubmitReview = () => {
    if (!selectedPetId || rating === 0) {
      toast.error("Selecione um pet e uma avaliação");
      return;
    }

    createReview.mutate({
      petId: selectedPetId,
      rating,
      comment,
      visitDate: new Date(visitDate),
    });
  };

  const renderStars = (count: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            className={`transition-colors ${interactive ? "cursor-pointer" : "cursor-default"}`}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (interactive ? (hoveredRating || rating) : count)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loadingPets) {
    return (
      <TutorLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-6xl py-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Avaliações e Feedback</h1>
          <p className="text-muted-foreground">
            Compartilhe sua experiência e ajude a melhorar nossos serviços
          </p>
        </div>

        {/* Average Rating Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Avaliação Média da Creche</p>
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-bold">{averageRating.toFixed(1)}</span>
                  <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pet Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selecione o Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pets.map((pet: any) => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedPetId === pet.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🐕</div>
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">{pet.breed}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedPet && (
          <div className="space-y-6">
            {/* Create Review Button */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <Star className="mr-2 h-5 w-5" />
                  Avaliar Visita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Avaliar Visita de {selectedPet.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Data da Visita</Label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                    />
                  </div>

                  <div>
                    <Label>Avaliação</Label>
                    <div className="mt-2">{renderStars(rating, true)}</div>
                  </div>

                  <div>
                    <Label>Comentário (opcional)</Label>
                    <Textarea
                      placeholder="Conte-nos sobre sua experiência..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="mt-2"
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={handleSubmitReview}
                    disabled={createReview.isPending || rating === 0}
                    className="w-full"
                  >
                    {createReview.isPending ? "Enviando..." : "Enviar Avaliação"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Reviews History */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Avaliações</CardTitle>
                <CardDescription>Suas avaliações anteriores</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhuma avaliação ainda</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {renderStars(review.rating)}
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4" />
                              {format(new Date(review.visitDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), "dd/MM/yyyy")}
                          </span>
                        </div>

                        {review.comment && (
                          <p className="text-sm mb-3">{review.comment}</p>
                        )}

                        {review.response && (
                          <div className="mt-3 p-3 rounded-lg bg-muted">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Resposta da Creche:
                            </p>
                            <p className="text-sm">{review.response}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(review.respondedAt), "dd/MM/yyyy")}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </TutorLayout>
  );
}
