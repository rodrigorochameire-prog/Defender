"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  ShoppingBag,
  Plus,
  Edit,
  AlertCircle,
  CheckCircle2,
  Package,
  Scale,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FoodInfo {
  id: number;
  petId: number;
  brand: string;
  type: string;
  quantity: number;
  dailyAmount: number;
  lastPurchase: Date;
  notes?: string;
}

export default function TutorFoodPage() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodInfo | null>(null);

  const { data: pets, isLoading } = trpc.pets.myPets.useQuery();

  // Mock data - substituir por query real quando implementar no backend
  const [foodData, setFoodData] = useState<FoodInfo[]>([]);

  const handleAddFood = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newFood: FoodInfo = {
      id: Date.now(),
      petId: selectedPetId!,
      brand: formData.get("brand") as string,
      type: formData.get("type") as string,
      quantity: parseFloat(formData.get("quantity") as string) * 1000, // kg para g
      dailyAmount: parseFloat(formData.get("dailyAmount") as string),
      lastPurchase: new Date(),
      notes: formData.get("notes") as string || undefined,
    };

    setFoodData([...foodData, newFood]);
    toast.success("Informações de ração adicionadas!");
    setIsAddDialogOpen(false);
    setSelectedPetId(null);
  };

  const calculateDaysRemaining = (food: FoodInfo) => {
    return Math.floor(food.quantity / food.dailyAmount);
  };

  const calculateEstimatedEndDate = (food: FoodInfo) => {
    const daysRemaining = calculateDaysRemaining(food);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);
    return endDate;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pets || pets.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">Nenhum pet cadastrado</p>
            <p className="text-muted-foreground">
              Cadastre um pet para gerenciar informações de ração
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Ração</h1>
          <p className="text-muted-foreground mt-2">
            Controle o estoque e consumo de ração dos seus pets
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="gap-2"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Adicionar Ração
        </Button>
      </div>

      {/* Cards de Ração por Pet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pets.map((pet) => {
          const petFood = foodData.find(f => f.petId === pet.id);
          
          if (!petFood) {
            return (
              <Card key={pet.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {pet.name}
                  </CardTitle>
                  <CardDescription>Nenhuma informação de ração cadastrada</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedPetId(pet.id);
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Ração
                  </Button>
                </CardContent>
              </Card>
            );
          }

          const daysRemaining = calculateDaysRemaining(petFood);
          const estimatedEndDate = calculateEstimatedEndDate(petFood);
          const isLowStock = daysRemaining < 7;
          const quantityKg = petFood.quantity / 1000;

          return (
            <Card key={pet.id} className={`hover:shadow-md transition-shadow ${isLowStock ? "border-orange-200" : ""}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {pet.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {petFood.brand}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingFood(petFood)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alerta de Estoque Baixo */}
                {isLowStock && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900">Estoque Baixo</p>
                      <p className="text-sm text-orange-800 mt-1">
                        Restam apenas {daysRemaining} dias de ração. Considere comprar mais!
                      </p>
                    </div>
                  </div>
                )}

                {/* Informações Principais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Scale className="h-4 w-4" />
                      Estoque Atual
                    </div>
                    <p className="text-2xl font-bold">{quantityKg.toFixed(1)} kg</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      Duração
                    </div>
                    <p className="text-2xl font-bold">
                      {daysRemaining} dias
                    </p>
                  </div>
                </div>

                {/* Barra de Progresso */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Consumo diário: {petFood.dailyAmount}g</span>
                    <span className={`font-medium ${isLowStock ? "text-orange-600" : "text-green-600"}`}>
                      {((petFood.quantity / (petFood.quantity + petFood.dailyAmount * 30)) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        daysRemaining > 14
                          ? "bg-green-500"
                          : daysRemaining > 7
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min((petFood.quantity / (petFood.quantity + petFood.dailyAmount * 30)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Detalhes Adicionais */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="secondary">{petFood.type}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última compra:</span>
                    <span className="font-medium">
                      {format(new Date(petFood.lastPurchase), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Previsão de término:</span>
                    <span className={`font-medium ${isLowStock ? "text-orange-600" : ""}`}>
                      {format(estimatedEndDate, "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>

                {/* Notas */}
                {petFood.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                    <p className="text-sm">{petFood.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dicas de Alimentação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Dicas de Alimentação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Mantenha a ração em local fresco e seco, protegida da luz solar</p>
          <p>• Sempre forneça água fresca e limpa junto com a alimentação</p>
          <p>• Respeite a quantidade diária recomendada para evitar sobrepeso</p>
          <p>• Divida a porção diária em 2-3 refeições para melhor digestão</p>
          <p>• Consulte o veterinário sobre a ração mais adequada para seu pet</p>
          <p>• Verifique a data de validade antes de comprar novos pacotes</p>
          <p>• Faça a transição gradual ao mudar de marca ou tipo de ração</p>
        </CardContent>
      </Card>

      {/* Dialog de Adicionar/Editar */}
      <Dialog
        open={isAddDialogOpen || !!editingFood}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingFood(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingFood ? "Editar Informações de Ração" : "Adicionar Ração"}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações sobre a ração do pet
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddFood} className="space-y-4">
            {!editingFood && (
              <div className="space-y-2">
                <Label>Pet</Label>
                <Select
                  value={selectedPetId?.toString()}
                  onValueChange={(value) => setSelectedPetId(parseInt(value))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brand">Marca e Produto</Label>
              <Input
                id="brand"
                name="brand"
                placeholder="Ex: Royal Canin Golden Retriever Adult"
                defaultValue={editingFood?.brand}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Ração</Label>
              <Select name="type" defaultValue={editingFood?.type} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ração Seca Premium">Ração Seca Premium</SelectItem>
                  <SelectItem value="Ração Seca Standard">Ração Seca Standard</SelectItem>
                  <SelectItem value="Ração Úmida">Ração Úmida</SelectItem>
                  <SelectItem value="Ração Natural">Ração Natural</SelectItem>
                  <SelectItem value="Ração Grain-Free">Ração Grain-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade (kg)</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="0.1"
                  placeholder="15.0"
                  defaultValue={editingFood ? editingFood.quantity / 1000 : undefined}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyAmount">Consumo Diário (g)</Label>
                <Input
                  id="dailyAmount"
                  name="dailyAmount"
                  type="number"
                  placeholder="400"
                  defaultValue={editingFood?.dailyAmount}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Informações adicionais sobre a ração..."
                defaultValue={editingFood?.notes}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingFood(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingFood ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
