import { useState } from "react";
import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet,
  TrendingDown,
  Calendar,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TutorCredits() {
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [packageSize, setPackageSize] = useState<string>("10");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: allCredits, refetch } = trpc.credits.getHistory.useQuery(
    { petId: selectedPetId || pets?.[0]?.id || 0 },
    { enabled: !!pets && pets.length > 0 }
  );
  const { data: transactions } = trpc.credits.getTransactions.useQuery();

  const purchasePackage = trpc.credits.addPackage.useMutation({
    onSuccess: () => {
      toast.success("Pacote de créditos adicionado com sucesso!");
      setIsPurchaseDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar créditos: " + error.message);
    },
  });

  const handlePurchase = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPetId) {
      toast.error("Selecione um pet");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const amount = parseInt(formData.get("amount") as string);
    const price = parseFloat(formData.get("price") as string);

    purchasePackage.mutate({
      petId: selectedPetId,
      packageDays: amount,
      packagePrice: price,
    });
  };

  const packages = [
    { credits: 10, price: 300, discount: 0 },
    { credits: 20, price: 550, discount: 8 },
    { credits: 30, price: 750, discount: 17 },
    { credits: 50, price: 1200, discount: 20 },
  ];

  // Calcular totais
  const totalCredits = allCredits?.reduce((sum: number, c: any) => sum + c.balance, 0) || 0;
  const totalSpent = transactions?.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalPurchased = transactions?.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0) || 0;

  // Calcular média de consumo diário (últimos 30 dias)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentExpenses = transactions?.filter(
    t => t.type === "expense" && new Date(t.transactionDate) >= thirtyDaysAgo
  ) || [];
  const avgDailyConsumption = recentExpenses.length > 0 ? recentExpenses.length / 30 : 0;
  const daysRemaining = avgDailyConsumption > 0 ? Math.floor(totalCredits / avgDailyConsumption) : 0;

  if (!pets || pets.length === 0) {
    return (
      <TutorLayout>
        <div className="space-y-6 animate-fade-in">
          <Card>
            <CardContent className="empty-state">
              <Wallet className="empty-state-icon" />
              <p className="empty-state-title">Nenhum pet cadastrado</p>
              <p className="empty-state-description">
                Cadastre um pet para gerenciar créditos de creche
              </p>
            </CardContent>
          </Card>
        </div>
      </TutorLayout>
    );
  }

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pacote de Diárias</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os créditos de creche dos seus pets
            </p>
          </div>
          <Button
            onClick={() => setIsPurchaseDialogOpen(true)}
            className="gap-2"
            size="lg"
          >
            <ShoppingCart className="h-5 w-5" />
            Comprar Créditos
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalCredits}</div>
              <p className="text-xs text-muted-foreground mt-1">
                créditos disponíveis
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Consumo Médio
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {avgDailyConsumption.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                créditos por dia
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Previsão
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {daysRemaining > 0 ? daysRemaining : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                dias restantes
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Investido
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                R$ {totalPurchased.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                em pacotes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de Créditos Baixos */}
        {totalCredits < 5 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Créditos Baixos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-800">
                Seus créditos estão acabando! Recomendamos comprar um novo pacote para
                garantir que seu pet continue frequentando a creche sem interrupções.
              </p>
              <Button
                onClick={() => setIsPurchaseDialogOpen(true)}
                className="mt-4"
                variant="default"
              >
                Comprar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Saldo por Pet */}
        <Card>
          <CardHeader>
            <CardTitle>Saldo por Pet</CardTitle>
            <CardDescription>
              Créditos disponíveis para cada pet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allCredits?.map((credit: any) => {
                const pet = pets.find(p => p.id === credit.petId);
                const percentage = (credit.balance / (credit.balance + 10)) * 100;
                
                return (
                  <div key={credit.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{pet?.name}</span>
                          <Badge variant={credit.balance > 5 ? "default" : "destructive"}>
                            {credit.balance} créditos
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            credit.balance > 10
                              ? "bg-green-500"
                              : credit.balance > 5
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Transações */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>
              Compras e consumos de créditos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions && transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => {
                  const pet = pets.find(p => p.id === transaction.petId);
                  const isIncome = transaction.type === "income";
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isIncome ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          {isIncome ? (
                            <Package className="h-5 w-5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {isIncome ? "Compra de Pacote" : "Consumo de Crédito"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pet?.name} • {format(new Date(transaction.transactionDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            isIncome ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isIncome ? "+" : "-"}{Math.abs(transaction.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {transaction.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state py-8">
                  <CreditCard className="empty-state-icon" />
                  <p className="empty-state-title">Nenhuma transação</p>
                  <p className="empty-state-description">
                    Compre seu primeiro pacote de créditos
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Compra */}
        <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Comprar Pacote de Créditos</DialogTitle>
              <DialogDescription>
                Escolha um pacote e o pet para adicionar créditos
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePurchase} className="space-y-6">
              {/* Seleção de Pet */}
              <div className="space-y-2">
                <Label>Selecione o Pet</Label>
                <Select
                  value={selectedPetId?.toString()}
                  onValueChange={(value) => setSelectedPetId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um pet" />
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

              {/* Pacotes Disponíveis */}
              <div className="space-y-2">
                <Label>Escolha um Pacote</Label>
                <div className="grid grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.credits}
                      className={`cursor-pointer transition-all hover-lift ${
                        packageSize === pkg.credits.toString()
                          ? "border-primary ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setPackageSize(pkg.credits.toString())}
                    >
                      <CardContent className="p-6">
                        <div className="text-center space-y-2">
                          {pkg.discount > 0 && (
                            <Badge variant="secondary" className="mb-2">
                              {pkg.discount}% OFF
                            </Badge>
                          )}
                          <div className="text-3xl font-bold">{pkg.credits}</div>
                          <p className="text-sm text-muted-foreground">créditos</p>
                          <div className="text-2xl font-bold text-primary">
                            R$ {pkg.price.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            R$ {(pkg.price / pkg.credits).toFixed(2)} por crédito
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <input type="hidden" name="amount" value={packageSize} />
              <input
                type="hidden"
                name="price"
                value={packages.find(p => p.credits.toString() === packageSize)?.price || 0}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPurchaseDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={!selectedPetId || purchasePackage.isPending}>
                  {purchasePackage.isPending ? "Processando..." : "Confirmar Compra"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TutorLayout>
  );
}
