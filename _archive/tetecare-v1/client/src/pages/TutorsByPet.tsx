import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Dog, Users, ChevronDown, ChevronRight, Mail, MessageCircle, 
  Phone, Bell, Send 
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function TutorsByPet() {
  const [expandedPets, setExpandedPets] = useState<Set<number>>(new Set());
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [notificationMessage, setNotificationMessage] = useState("");

  const { data: petsWithTutors, isLoading } = trpc.tutors.getPetsWithTutors.useQuery();
  
  const notifyTutorsMutation = trpc.tutors.notifyPetTutors.useMutation({
    onSuccess: () => {
      toast.success("Notificações enviadas com sucesso!");
      setNotifyDialogOpen(false);
      setNotificationMessage("");
      setSelectedPet(null);
    },
    onError: (error) => {
      toast.error(`Erro ao enviar notificações: ${error.message}`);
    },
  });

  const togglePet = (petId: number) => {
    const newExpanded = new Set(expandedPets);
    if (newExpanded.has(petId)) {
      newExpanded.delete(petId);
    } else {
      newExpanded.add(petId);
    }
    setExpandedPets(newExpanded);
  };

  const handleNotifyTutors = (pet: any) => {
    setSelectedPet(pet);
    setNotifyDialogOpen(true);
  };

  const handleSendNotifications = () => {
    if (!selectedPet || !notificationMessage.trim()) {
      toast.error("Digite uma mensagem para enviar");
      return;
    }

    notifyTutorsMutation.mutate({
      petId: selectedPet.id,
      title: `Atualização sobre ${selectedPet.name}`,
      message: notificationMessage,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Tutores por Pet
          </h1>
          <p className="text-muted-foreground mt-2">
            Visualize e gerencie tutores agrupados por pet
          </p>
        </div>

        <div className="space-y-4">
          {!petsWithTutors || petsWithTutors.length === 0 ? (
            <Card className="p-12 text-center">
              <Dog className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pet cadastrado ainda</p>
            </Card>
          ) : (
            petsWithTutors.map((pet: any) => {
              const isExpanded = expandedPets.has(pet.id);
              
              return (
                <Card key={pet.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePet(pet.id)}
                          className="p-0 h-8 w-8"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                        
                        <Avatar className="h-12 w-12 bg-primary/10">
                          <AvatarFallback className="text-primary font-bold">
                            {pet.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <CardTitle className="text-xl">{pet.name}</CardTitle>
                          <CardDescription>
                            {pet.breed} • {pet.tutorCount} {pet.tutorCount === 1 ? "tutor" : "tutores"}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNotifyTutors(pet)}
                          disabled={pet.tutorCount === 0}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Notificar Todos
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && pet.tutors && pet.tutors.length > 0 && (
                    <CardContent>
                      <div className="space-y-3">
                        {pet.tutors.map((tutor: any) => (
                          <div
                            key={tutor.tutorId}
                            className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-10 w-10 bg-orange-100">
                                <AvatarFallback className="text-orange-600 font-semibold">
                                  {tutor.tutorName?.charAt(0) || "T"}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{tutor.tutorName}</p>
                                  {tutor.isPrimary && (
                                    <Badge variant="default" className="text-xs">
                                      Principal
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  {tutor.tutorEmail && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {tutor.tutorEmail}
                                    </span>
                                  )}
                                  {tutor.tutorPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {tutor.tutorPhone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Notify Tutors Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Tutores de {selectedPet?.name}</DialogTitle>
            <DialogDescription>
              Envie uma notificação para todos os tutores deste pet ({selectedPet?.tutorCount} {selectedPet?.tutorCount === 1 ? "tutor" : "tutores"})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Digite a mensagem da notificação..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSendNotifications}
              disabled={notifyTutorsMutation.isPending || !notificationMessage.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Notificações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
