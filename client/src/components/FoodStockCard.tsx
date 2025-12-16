import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Package, Plus, TrendingDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FoodStockCardProps {
  petId: number;
  petName: string;
}

export function FoodStockCard({ petId, petName }: FoodStockCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);

  const { data: stock, refetch } = trpc.petFoodStock.get.useQuery({ petId });

  const upsertStock = trpc.petFoodStock.upsert.useMutation({
    onSuccess: () => {
      toast.success("Estoque atualizado com sucesso!");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar estoque: " + error.message);
    },
  });

  const registerPurchase = trpc.petFoodStock.registerPurchase.useMutation({
    onSuccess: () => {
      toast.success("Compra registrada com sucesso!");
      setIsPurchaseDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao registrar compra: " + error.message);
    },
  });

  const handleSetupSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    upsertStock.mutate({
      petId,
      brandName: formData.get("brandName") as string,
      currentStock: parseInt(formData.get("currentStock") as string),
      dailyConsumption: parseInt(formData.get("dailyConsumption") as string),
      alertThresholdDays: parseInt(formData.get("alertThresholdDays") as string) || 15,
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  const handlePurchaseSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    registerPurchase.mutate({
      petId,
      amount: parseInt(formData.get("amount") as string),
      notes: (formData.get("notes") as string) || undefined,
    });
  };

  if (!stock) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque de Ração
          </CardTitle>
          <CardDescription>Configure o controle de estoque de ração</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Configurar Estoque
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar Estoque de Ração</DialogTitle>
                <DialogDescription>
                  Configure o controle de estoque para receber alertas antes da ração acabar
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSetupSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Marca da Ração *</Label>
                  <Input
                    id="brandName"
                    name="brandName"
                    placeholder="Ex: Royal Canin Medium Adult"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">Estoque Atual (g) *</Label>
                    <Input
                      id="currentStock"
                      name="currentStock"
                      type="number"
                      min="0"
                      placeholder="Ex: 15000"
                      required
                    />
                    <p className="text-xs text-muted-foreground">15kg = 15000g</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dailyConsumption">Consumo Diário (g) *</Label>
                    <Input
                      id="dailyConsumption"
                      name="dailyConsumption"
                      type="number"
                      min="1"
                      placeholder="Ex: 300"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Quantidade por dia</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alertThresholdDays">Alertar com Antecedência (dias)</Label>
                  <Input
                    id="alertThresholdDays"
                    name="alertThresholdDays"
                    type="number"
                    min="1"
                    defaultValue="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você será alertado quando faltar este número de dias para acabar
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Ex: Comprar no Pet Shop XYZ"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={upsertStock.isPending}>
                    {upsertStock.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  const stockPercentage = (stock.currentStock / (stock.currentStock + stock.dailyConsumption * stock.alertThresholdDays)) * 100;
  const daysText = stock.daysRemaining === 1 ? "dia" : "dias";

  return (
    <Card className={stock.needsRestock ? "border-orange-500" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Estoque de Ração
          </div>
          <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Registrar Compra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Compra de Ração</DialogTitle>
                <DialogDescription>
                  Adicione a quantidade comprada ao estoque atual
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Quantidade Comprada (g) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="1"
                    placeholder="Ex: 15000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    15kg = 15000g | Estoque atual: {(stock.currentStock / 1000).toFixed(1)}kg
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Input
                    id="notes"
                    name="notes"
                    placeholder="Ex: Comprado no Pet Shop XYZ"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={registerPurchase.isPending}>
                    {registerPurchase.isPending ? "Registrando..." : "Registrar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
        <CardDescription>{stock.brandName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stock.needsRestock && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estoque baixo! Compre ração até{" "}
              {new Date(stock.restockDate).toLocaleDateString("pt-BR")}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estoque Atual</span>
            <span className="font-medium">{(stock.currentStock / 1000).toFixed(1)} kg</span>
          </div>
          <Progress value={Math.min(stockPercentage, 100)} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              {stock.dailyConsumption}g/dia
            </span>
            <span>
              {stock.daysRemaining} {daysText} restantes
            </span>
          </div>
        </div>

        {stock.lastPurchaseDate && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Última compra: {new Date(stock.lastPurchaseDate).toLocaleDateString("pt-BR")}
            {stock.lastPurchaseAmount && ` (${(stock.lastPurchaseAmount / 1000).toFixed(1)}kg)`}
          </div>
        )}

        {stock.notes && (
          <div className="pt-2 border-t text-sm text-muted-foreground">
            {stock.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
