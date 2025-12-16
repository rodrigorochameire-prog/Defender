import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { UserPlus, UserMinus, Star, Search } from "lucide-react";

interface PetTutorsManagerProps {
  petId: number;
  petName: string;
}

export function PetTutorsManager({ petId, petName }: PetTutorsManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const utils = trpc.useUtils();

  // Get current tutors
  const { data: tutors = [], isLoading } = trpc.petTutors.getTutorsByPet.useQuery({ petId });

  // Search user by email
  const searchUserMutation = trpc.petTutors.searchUserByEmail.useMutation();

  // Link tutor
  const linkTutorMutation = trpc.petTutors.linkTutor.useMutation({
    onSuccess: () => {
      toast.success("Tutor vinculado com sucesso!");
      utils.petTutors.getTutorsByPet.invalidate({ petId });
      setIsAddDialogOpen(false);
      setSearchEmail("");
      setIsPrimary(false);
    },
    onError: (error) => {
      toast.error("Erro ao vincular tutor: " + error.message);
    },
  });

  // Unlink tutor
  const unlinkTutorMutation = trpc.petTutors.unlinkTutor.useMutation({
    onSuccess: () => {
      toast.success("Tutor desvinculado com sucesso!");
      utils.petTutors.getTutorsByPet.invalidate({ petId });
    },
    onError: (error) => {
      toast.error("Erro ao desvincular tutor: " + error.message);
    },
  });

  // Set primary tutor
  const setPrimaryMutation = trpc.petTutors.setPrimary.useMutation({
    onSuccess: () => {
      toast.success("Tutor principal atualizado!");
      utils.petTutors.getTutorsByPet.invalidate({ petId });
    },
    onError: (error) => {
      toast.error("Erro ao definir tutor principal: " + error.message);
    },
  });

  const handleLinkTutor = async () => {
    if (!searchEmail.trim()) {
      toast.error("Digite um email para buscar");
      return;
    }

    try {
      // Search user
      const user = await searchUserMutation.mutateAsync({ email: searchEmail });
      
      if (!user) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Link tutor
      await linkTutorMutation.mutateAsync({
        petId,
        tutorId: user.id,
        isPrimary,
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleUnlink = (tutorId: number, tutorName: string) => {
    if (confirm(`Deseja realmente desvincular ${tutorName} de ${petName}?`)) {
      unlinkTutorMutation.mutate({ petId, tutorId });
    }
  };

  const handleSetPrimary = (tutorId: number) => {
    setPrimaryMutation.mutate({ petId, tutorId });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tutores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tutores de {petName}</CardTitle>
              <CardDescription>Gerencie os tutores responsáveis por este pet</CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Tutor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tutors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum tutor vinculado a este pet</p>
              <Button variant="link" onClick={() => setIsAddDialogOpen(true)} className="mt-2">
                Adicionar primeiro tutor
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tutors.map((tutor: any) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>
                        {tutor.name?.charAt(0).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{tutor.name || "Sem nome"}</p>
                        {tutor.isPrimary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{tutor.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Vinculado em {new Date(tutor.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!tutor.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(tutor.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Tornar Principal
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUnlink(tutor.id, tutor.name)}
                      disabled={unlinkTutorMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4 mr-1" />
                      Desvincular
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Tutor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Tutor para {petName}</DialogTitle>
            <DialogDescription>
              Busque um usuário pelo email e vincule como tutor deste pet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email do Tutor</Label>
              <div className="flex space-x-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="tutor@exemplo.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isPrimary" className="cursor-pointer">
                Definir como tutor principal
              </Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setSearchEmail("");
                  setIsPrimary(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleLinkTutor}
                disabled={linkTutorMutation.isPending || searchUserMutation.isPending}
              >
                {linkTutorMutation.isPending || searchUserMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Vincular Tutor
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
