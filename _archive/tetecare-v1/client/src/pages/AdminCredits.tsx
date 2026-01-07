import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreditCard, Plus, AlertCircle, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { SearchAndFilter } from "@/components/SearchAndFilter";

export default function AdminCredits() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);

  const { data: pets, isLoading: petsLoading, error: petsError } = trpc.pets.list.useQuery();
  const { data: stats, isLoading: statsLoading, error: statsError } = trpc.credits.getStats.useQuery();
  const utils = trpc.useUtils();

  if (petsError || statsError) {
    console.error("Error loading credits page:", petsError || statsError);
  }

  const addPackage = trpc.credits.addPackage.useMutation({
    onSuccess: () => {
      toast.success("Créditos adicionados com sucesso!");
      setIsAddCreditDialogOpen(false);
      setSelectedPetId(null);
      utils.pets.list.invalidate();
      utils.credits.getStats.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar créditos: " + error.message);
    },
  });

  const handleAddCredits = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) {
      toast.error("Selecione um pet");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const days = Number(formData.get("days"));
    const price = Number(formData.get("price"));
    
    addPackage.mutate({
      petId: selectedPetId,
      packageDays: days,
      packagePrice: price,
    });
  };

  const filteredPets = pets?.filter(pet =>
    pet.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calcular estatísticas
  const totalCredits = pets?.reduce((sum, pet) => sum + (pet.credits || 0), 0) || 0;
  const petsWithLowCredits = pets?.filter(pet => (pet.credits || 0) < 5).length || 0;

  if (petsError || statsError) {
    return (
      <AdminLayout>
        <div className="container py-8">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-600 font-medium mb-2">Erro ao carregar créditos</p>
                <p className="text-sm text-muted-foreground">
                  {(petsError || statsError)?.message}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (petsLoading || statsLoading) {
    return (
      <AdminLayout>
        <div className="container py-8 flex justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão de Diárias</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie créditos de diárias dos pets e controle financeiro
            </p>
          </div>
          <Button onClick={() => setIsAddCreditDialogOpen(true)} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Diárias
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Diárias</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCredits}</div>
              <p className="text-xs text-muted-foreground">
                Saldo total de todos os pets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Baixo</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{petsWithLowCredits}</div>
              <p className="text-xs text-muted-foreground">
                Pets com menos de 5 diárias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {((stats?.monthlyRevenue || 0) / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Vendas de pacotes este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pets com Créditos</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.petsWithCredits || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Pets com saldo ativo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Saldo dos Pets */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Saldo de Diárias por Pet</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <SearchAndFilter
                searchPlaceholder="Buscar pet..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                onClearFilters={() => setSearchQuery("")}
              />
              <div className="space-y-2">
                {filteredPets.map((pet) => {
                  const balance = pet.credits || 0;
                  const isLow = balance < 5;
                  return (
                    <div
                      key={pet.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {pet.photoUrl ? (
                          <img
                            src={pet.photoUrl}
                            alt={pet.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold">
                            {pet.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">{pet.breed || "Sem raça definida"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isLow ? "text-orange-500" : "text-primary"}`}>
                            {balance} {balance === 1 ? "diária" : "diárias"}
                          </p>
                          {isLow && (
                            <p className="text-xs text-orange-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Saldo baixo
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPetId(pet.id);
                            setIsAddCreditDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filteredPets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum pet encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dicas de Uso */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Como Funciona o Sistema de Diárias
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-2">
            <p>• Cada diária representa um dia de creche para o pet</p>
            <p>• O saldo é consumido automaticamente no check-in</p>
            <p>• Tutores podem comprar pacotes de diárias com desconto</p>
            <p>• Configure alertas quando o saldo estiver baixo (menos de 5 diárias)</p>
            <p>• Acompanhe o consumo e receitas na página de Finanças</p>
          </CardContent>
        </Card>

        {/* Dialog: Adicionar Créditos */}
        <Dialog open={isAddCreditDialogOpen} onOpenChange={setIsAddCreditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Diárias</DialogTitle>
              <DialogDescription>
                Adicione um pacote de diárias ao pet selecionado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCredits}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pet">Pet</Label>
                  <Select
                    value={selectedPetId?.toString() || ""}
                    onValueChange={(value) => setSelectedPetId(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um pet" />
                    </SelectTrigger>
                    <SelectContent>
                      {pets?.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id.toString()}>
                          {pet.name} - {pet.credits || 0} {pet.credits === 1 ? "diária" : "diárias"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days">Quantidade de Diárias</Label>
                  <Input
                    id="days"
                    name="days"
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Valor Total (R$)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Ex: 500.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    O valor será registrado nas finanças como receita
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddCreditDialogOpen(false);
                    setSelectedPetId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={addPackage.isPending}>
                  {addPackage.isPending ? "Adicionando..." : "Adicionar Diárias"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
