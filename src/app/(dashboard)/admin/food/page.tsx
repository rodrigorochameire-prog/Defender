"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingBag, Package, TrendingDown, AlertTriangle, Plus, Loader2, Apple } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminFoodPage() {
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockAmount, setStockAmount] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  // Queries
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();

  // Calculate daily consumption
  const totalDailyConsumption = pets?.reduce((sum, pet) => {
    return sum + (pet.foodAmount || 0);
  }, 0) || 0;

  const dailyConsumptionKg = totalDailyConsumption / 1000;

  // Mock stock data (será implementado com o router correto)
  const currentStockKg = 25;
  const daysRemaining = dailyConsumptionKg > 0 ? Math.floor(currentStockKg / dailyConsumptionKg) : 0;

  const isCriticalStock = daysRemaining < 7;
  const isLowStock = daysRemaining < 25;

  const handleAddStock = () => {
    const amount = parseFloat(stockAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Por favor, insira uma quantidade válida.");
      return;
    }

    // TODO: Implementar mutation
    toast.success("Estoque atualizado com sucesso!");
    setIsAddStockOpen(false);
    setStockAmount("");
    setPurchaseNotes("");
  };

  if (petsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Apple />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Ração</h1>
            <p>Controle individual de ração por pet</p>
          </div>
        </div>
        <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Estoque
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Estoque de Ração</DialogTitle>
              <DialogDescription>
                Registre a compra ou entrada de ração no estoque da creche
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Quantidade (kg)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.1"
                  placeholder="Ex: 20.0"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Ex: Compra da marca XYZ, nota fiscal 12345"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button onClick={handleAddStock} className="w-full">
                Adicionar ao Estoque
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className={isCriticalStock ? "border-red-200 bg-red-50/50" : isLowStock ? "border-orange-200 bg-orange-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className={`w-5 h-5 ${isCriticalStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-primary"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{currentStockKg.toFixed(1)} kg</div>
            <div className="flex items-center gap-2 mt-2">
              {isCriticalStock && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Estoque crítico
                </Badge>
              )}
              {!isCriticalStock && isLowStock && (
                <Badge className="gap-1 bg-orange-100 text-orange-800 border-orange-300">
                  <AlertTriangle className="w-3 h-3" />
                  Estoque baixo
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consumo Diário</CardTitle>
            <TrendingDown className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dailyConsumptionKg.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalDailyConsumption}g total dos {pets?.length || 0} pets
            </p>
          </CardContent>
        </Card>

        <Card className={isCriticalStock ? "border-red-200 bg-red-50/50" : isLowStock ? "border-orange-200 bg-orange-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dias Restantes</CardTitle>
            <ShoppingBag className={`w-5 h-5 ${isCriticalStock ? "text-red-600" : isLowStock ? "text-orange-600" : "text-primary"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${isCriticalStock ? "text-red-600" : isLowStock ? "text-orange-600" : ""}`}>
              {daysRemaining}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isCriticalStock
                ? "Comprar ração urgente!"
                : isLowStock
                ? "Programar compra em breve"
                : "Estoque suficiente"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pets Food Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Ração Individual por Pet</CardTitle>
          <CardDescription>
            Cada pet tem sua própria ração (marca e quantidade) fornecida pelo tutor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pets && pets.length > 0 ? (
            <div className="space-y-3">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {pet.photoUrl ? (
                      <img
                        src={pet.photoUrl}
                        alt={pet.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{pet.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {pet.breed || "Raça não informada"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {pet.foodAmount ? `${pet.foodAmount}g` : "Não configurado"}
                      </div>
                      <div className="text-xs text-muted-foreground">por dia</div>
                    </div>
                    {pet.foodBrand && (
                      <Badge variant="outline" className="ml-2">
                        {pet.foodBrand}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pet cadastrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
