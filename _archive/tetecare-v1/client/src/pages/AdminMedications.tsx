import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Pill, Plus, List } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminMedications() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");

  const { data: library, refetch } = trpc.medications.library.useQuery();

  const addToLibrary = trpc.medications.addToLibrary.useMutation({
    onSuccess: () => {
      toast.success("Medicamento adicionado à biblioteca!");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const type = formData.get("type") as "preventive" | "treatment" | "supplement";
    const description = formData.get("description") as string;
    const commonDosage = formData.get("commonDosage") as string;

    addToLibrary.mutate({
      name,
      type,
      description: description || undefined,
      commonDosage: commonDosage || undefined,
    });
  };

  const preventive = library?.filter((m) => m.type === "preventive") || [];
  const treatment = library?.filter((m) => m.type === "treatment") || [];
  const supplement = library?.filter((m) => m.type === "supplement") || [];

  const [, setLocation] = useLocation();

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Medicamentos</h1>
            <p className="text-muted-foreground">
              Gerenciamento de medicamentos e biblioteca
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/admin/medications-all")}>
              <List className="mr-2 h-4 w-4" />
              Ver Todos os Medicamentos
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Medicamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Medicamento à Biblioteca</DialogTitle>
                <DialogDescription>
                  Crie um novo medicamento para uso na plataforma
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Medicamento *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Bravecto, Drontal, Advocate"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    name="type"
                    value={selectedType}
                    onValueChange={setSelectedType}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventivo</SelectItem>
                      <SelectItem value="treatment">Tratamento</SelectItem>
                      <SelectItem value="supplement">Suplemento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Descrição do medicamento, indicação, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commonDosage">Dosagem Comum</Label>
                  <Input
                    id="commonDosage"
                    name="commonDosage"
                    placeholder="Ex: 1 comprimido, 5ml, 1 aplicação"
                  />
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{library?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Medicamentos cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preventivos</CardTitle>
              <Pill className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{preventive.length}</div>
              <p className="text-xs text-muted-foreground">Antipulgas, vermífugos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tratamentos</CardTitle>
              <Pill className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{treatment.length}</div>
              <p className="text-xs text-muted-foreground">Antibióticos, anti-inflamatórios</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suplementos</CardTitle>
              <Pill className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{supplement.length}</div>
              <p className="text-xs text-muted-foreground">Vitaminas, probióticos</p>
            </CardContent>
          </Card>
        </div>

        {/* Preventive Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-blue-500" />
              Medicamentos Preventivos
            </CardTitle>
            <CardDescription>
              Antipulgas, vermífugos e prevenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {preventive.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum medicamento preventivo cadastrado
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Dosagem Comum</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preventive.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell className="max-w-md">
                          {med.description || "-"}
                        </TableCell>
                        <TableCell>{med.commonDosage || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              med.isCommon
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {med.isCommon ? "Comum" : "Personalizado"}
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

        {/* Treatment Medications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-orange-500" />
              Medicamentos de Tratamento
            </CardTitle>
            <CardDescription>
              Antibióticos, anti-inflamatórios e medicações específicas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {treatment.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum medicamento de tratamento cadastrado
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Dosagem Comum</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treatment.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell className="max-w-md">
                          {med.description || "-"}
                        </TableCell>
                        <TableCell>{med.commonDosage || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              med.isCommon
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {med.isCommon ? "Comum" : "Personalizado"}
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

        {/* Supplements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-green-500" />
              Suplementos
            </CardTitle>
            <CardDescription>
              Vitaminas, probióticos e suplementos nutricionais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {supplement.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum suplemento cadastrado
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Dosagem Comum</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplement.map((med) => (
                      <TableRow key={med.id}>
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell className="max-w-md">
                          {med.description || "-"}
                        </TableCell>
                        <TableCell>{med.commonDosage || "-"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              med.isCommon
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-gray-100 text-gray-700 border-gray-200"
                            }
                          >
                            {med.isCommon ? "Comum" : "Personalizado"}
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
            <CardTitle className="text-base">💡 Sobre Medicamentos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>• Medicamentos comuns são pré-cadastrados no sistema</p>
            <p>• Adicione medicamentos personalizados conforme necessário</p>
            <p>• Tutores podem registrar tratamentos ativos nos seus pets</p>
            <p>• A dosagem comum serve como referência, mas pode ser ajustada</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
