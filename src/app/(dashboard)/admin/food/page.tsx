"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UtensilsCrossed, Package, TrendingDown, AlertTriangle, Plus, Dog } from "lucide-react";
import { toast } from "sonner";
import { LoadingPage } from "@/components/shared/loading";
import Image from "next/image";

export default function AdminFoodPage() {
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [stockAmount, setStockAmount] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");

  const { data: pets, isLoading } = trpc.pets.list.useQuery();

  // Calculate daily consumption
  const totalDailyConsumption = pets?.reduce((sum, pet) => {
    return sum + (pet.foodAmount || 0);
  }, 0) || 0;

  const dailyConsumptionKg = totalDailyConsumption / 1000;

  // Mock stock data
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
    toast.success("Estoque atualizado com sucesso!");
    setIsAddStockOpen(false);
    setStockAmount("");
    setPurchaseNotes("");
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <UtensilsCrossed />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Ração</h1>
            <p>Controle individual por pet</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Dialog open={isAddStockOpen} onOpenChange={setIsAddStockOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-primary">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar Estoque
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Estoque</DialogTitle>
                <DialogDescription>
                  Registre a entrada de ração no estoque
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
                    placeholder="Ex: Compra da marca XYZ"
                    value={purchaseNotes}
                    onChange={(e) => setPurchaseNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={handleAddStock} className="w-full btn-primary">
                  Confirmar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid grid-cols-3">
        <div className={`stat-card ${isCriticalStock ? "alert" : ""}`}>
          <div className="stat-card-header">
            <span className="title">Estoque Atual</span>
            <Package className={`icon ${isCriticalStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-primary"}`} />
          </div>
          <div className="stat-card-value">{currentStockKg.toFixed(1)} kg</div>
          {isCriticalStock && (
            <Badge className="badge-rose mt-2">Estoque crítico</Badge>
          )}
          {!isCriticalStock && isLowStock && (
            <Badge className="badge-amber mt-2">Estoque baixo</Badge>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Consumo Diário</span>
            <TrendingDown className="icon text-blue-500" />
          </div>
          <div className="stat-card-value">{dailyConsumptionKg.toFixed(1)} kg</div>
          <p className="stat-card-description">{pets?.length || 0} pets cadastrados</p>
        </div>

        <div className={`stat-card ${isCriticalStock ? "alert" : ""}`}>
          <div className="stat-card-header">
            <span className="title">Dias Restantes</span>
            <AlertTriangle className={`icon ${isCriticalStock ? "text-rose-500" : isLowStock ? "text-amber-500" : "text-primary"}`} />
          </div>
          <div className="stat-card-value">{daysRemaining}</div>
          <p className="stat-card-description">
            {isCriticalStock ? "Comprar urgente!" : isLowStock ? "Programar compra" : "Estoque OK"}
          </p>
        </div>
      </div>

      {/* Pets Food List */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">
            <Dog className="icon" />
            Ração por Pet
          </CardTitle>
          <CardDescription className="section-card-description">
            Cada pet tem sua própria ração fornecida pelo tutor
          </CardDescription>
        </CardHeader>
        <CardContent className="section-card-content">
          {pets && pets.length > 0 ? (
            <div className="space-y-2">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className="list-item border rounded-xl p-4"
                >
                  <div className="flex items-center gap-4">
                    {pet.photoUrl ? (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        <Image
                          src={pet.photoUrl}
                          alt={pet.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Dog className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{pet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pet.breed || "Raça não informada"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {pet.foodAmount ? `${pet.foodAmount}g` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">por dia</p>
                    </div>
                    {pet.foodBrand && (
                      <Badge className="badge-neutral">{pet.foodBrand}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Dog className="empty-state-icon" />
              <p className="empty-state-text">Nenhum pet cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
