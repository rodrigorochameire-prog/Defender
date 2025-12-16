import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Syringe, Plus, AlertCircle, Calendar, List } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminVaccines() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: library, refetch: refetchLibrary } = trpc.vaccines.library.useQuery();
  const { data: upcoming } = trpc.vaccines.upcoming.useQuery({ daysAhead: 30 });

  const addToLibrary = trpc.vaccines.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Vacina adicionada à biblioteca!");
      setIsDialogOpen(false);
      refetchLibrary();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const intervalDays = formData.get("intervalDays") as string;
    const dosesRequired = formData.get("dosesRequired") as string;

    addToLibrary.mutate({
      name,
      description: description || undefined,
      intervalDays: intervalDays ? parseInt(intervalDays) : undefined,
      dosesRequired: dosesRequired ? parseInt(dosesRequired) : 1,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vacinas</h1>
            <p className="text-muted-foreground">
              Gerenciamento de vacinas e biblioteca
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/admin/vaccines-all")}>
              <List className="mr-2 h-4 w-4" />
              Ver Todas as Vacinas
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Vacina
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Vacina à Biblioteca</DialogTitle>
                <DialogDescription>
                  Crie uma nova vacina para uso na plataforma
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Vacina *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: V10, Antirrábica, Gripe Canina"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Descrição da vacina e proteção"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="intervalDays">Intervalo (dias)</Label>
                    <Input
                      id="intervalDays"
                      name="intervalDays"
                      type="number"
                      min="1"
                      placeholder="Ex: 21, 30, 365"
                    />
                    <p className="text-xs text-muted-foreground">
                      Dias entre doses
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dosesRequired">Doses Necessárias</Label>
                    <Input
                      id="dosesRequired"
                      name="dosesRequired"
                      type="number"
                      min="1"
                      defaultValue="1"
                      placeholder="Ex: 1, 2, 3"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addToLibrary.isPending}>
                    {addToLibrary.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Upcoming Vaccinations Alert */}
        {upcoming && upcoming.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertCircle className="h-5 w-5" />
                Vacinas Próximas ({upcoming.length})
              </CardTitle>
              <CardDescription>
                Vacinas agendadas para os próximos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcoming.slice(0, 5).map((item) => {
                  const daysUntil = Math.ceil(
                    (new Date(item.vaccination.nextDueDate!).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={item.vaccination.id}
                      className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.pet.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.vaccine.name}
                          {item.vaccination.doseNumber && ` - Dose ${item.vaccination.doseNumber}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                          {daysUntil === 0
                            ? "Hoje"
                            : daysUntil === 1
                            ? "Amanhã"
                            : `${daysUntil} dias`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.vaccination.nextDueDate!).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {upcoming.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    + {upcoming.length - 5} outras vacinas agendadas
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vaccine Library */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5" />
              Biblioteca de Vacinas
            </CardTitle>
            <CardDescription>
              {library?.length || 0} vacinas cadastradas na biblioteca
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!library || library.length === 0 ? (
              <div className="empty-state">
                <Syringe className="empty-state-icon" />
                <p className="empty-state-title">Nenhuma vacina cadastrada</p>
                <p className="empty-state-description">
                  Adicione vacinas à biblioteca para uso na plataforma
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Intervalo</TableHead>
                      <TableHead>Doses</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {library.map((vaccine) => (
                      <TableRow key={vaccine.id}>
                        <TableCell className="font-medium">{vaccine.name}</TableCell>
                        <TableCell className="max-w-md">
                          {vaccine.description || "-"}
                        </TableCell>
                        <TableCell>
                          {vaccine.intervalDays ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {vaccine.intervalDays} dias
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {vaccine.dosesRequired || 1} dose(s)
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              vaccine.isCommon
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {vaccine.isCommon ? "Comum" : "Personalizada"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">💡 Sobre Vacinas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• Vacinas comuns são pré-cadastradas no sistema</p>
            <p>• Adicione vacinas personalizadas conforme necessário</p>
            <p>• O intervalo define o tempo entre doses</p>
            <p>• Tutores podem registrar vacinas aplicadas nos seus pets</p>
            <p>• Alertas automáticos são enviados para vacinas próximas</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
