import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, CheckCircle, XCircle, Calendar, Weight, ShoppingBag, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function AdminPetApproval() {
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  const utils = trpc.useUtils();
  const { data: pendingPets, isLoading } = trpc.pets.listPending.useQuery();

  const approvePet = trpc.pets.approve.useMutation({
    onSuccess: () => {
      toast.success("Pet aprovado com sucesso!");
      setSelectedPet(null);
      setActionType(null);
      utils.pets.listPending.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar pet: ${error.message}`);
    },
  });

  const rejectPet = trpc.pets.reject.useMutation({
    onSuccess: () => {
      toast.success("Pet rejeitado. O tutor foi notificado.");
      setSelectedPet(null);
      setActionType(null);
      utils.pets.listPending.invalidate();
    },
    onError: (error) => {
      toast.error(`Erro ao rejeitar pet: ${error.message}`);
    },
  });

  const handleAction = () => {
    if (!selectedPet) return;

    if (actionType === "approve") {
      approvePet.mutate({ petId: selectedPet.id });
    } else if (actionType === "reject") {
      rejectPet.mutate({ petId: selectedPet.id });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Aprovações Pendentes</h1>
          {pendingPets && pendingPets.length > 0 && (
            <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
              {pendingPets.length} {pendingPets.length === 1 ? "pet" : "pets"}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Revise e aprove os pets cadastrados pelos tutores
        </p>
      </div>

      {/* Empty State */}
      {!pendingPets || pendingPets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle className="h-16 w-16 text-green-500/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pet pendente</h3>
            <p className="text-muted-foreground text-center">
              Todos os pets cadastrados já foram aprovados ou rejeitados
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pendingPets.map((pet: any) => (
            <Card key={pet.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {pet.photoUrl ? (
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                        <Dog className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-xl">{pet.name}</CardTitle>
                      {pet.breed && (
                        <CardDescription className="mt-1">{pet.breed}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {pet.age && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{pet.age}</span>
                    </div>
                  )}
                  {pet.weight && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Weight className="h-4 w-4" />
                      <span>{(pet.weight / 1000).toFixed(1)} kg</span>
                    </div>
                  )}
                </div>

                {pet.foodBrand && (
                  <div className="flex items-start gap-2 text-sm">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="font-medium">Ração:</span> {pet.foodBrand}
                      {pet.foodAmount && (
                        <span className="text-muted-foreground"> ({pet.foodAmount}g/dia)</span>
                      )}
                    </div>
                  </div>
                )}

                {pet.notes && (
                  <div className="text-sm">
                    <span className="font-medium">Observações:</span>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{pet.notes}</p>
                  </div>
                )}

                {/* Tutor Info */}
                {pet.tutorName && (
                  <div className="pt-3 border-t text-sm text-muted-foreground">
                    <span className="font-medium">Tutor:</span> {pet.tutorName}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-green-500/20 text-green-700 hover:bg-green-500/10"
                    onClick={() => {
                      setSelectedPet(pet);
                      setActionType("approve");
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-500/20 text-red-700 hover:bg-red-500/10"
                    onClick={() => {
                      setSelectedPet(pet);
                      setActionType("reject");
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedPet} onOpenChange={() => {
        setSelectedPet(null);
        setActionType(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar Pet" : "Rejeitar Pet"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Tem certeza que deseja aprovar ${selectedPet?.name}? O tutor será notificado e poderá começar a usar os serviços da creche.`
                : `Tem certeza que deseja rejeitar ${selectedPet?.name}? O tutor será notificado e poderá editar as informações para reenviar.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPet(null);
                setActionType(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={approvePet.isPending || rejectPet.isPending}
              className={actionType === "reject" ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {approvePet.isPending || rejectPet.isPending
                ? "Processando..."
                : actionType === "approve"
                ? "Confirmar Aprovação"
                : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
}
