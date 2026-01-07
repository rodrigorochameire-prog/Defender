import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditPackages } from "@/components/CreditPackages";
import { AlertCircle, CreditCard, History, TrendingDown, TrendingUp, Wallet, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CreditBalanceProps {
  petId: number;
}

export function CreditBalance({ petId }: CreditBalanceProps) {
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const { data: balance, isLoading: balanceLoading, refetch } = trpc.credits.getBalance.useQuery({ petId });
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.credits.getHistory.useQuery({ petId });
  const { data: usageHistory } = trpc.credits.getUsageHistory.useQuery({ petId });

  const isLowBalance = (balance || 0) < 5;

  const handlePurchaseSuccess = () => {
    setIsPurchaseDialogOpen(false);
    refetch();
    refetchHistory();
  };

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className={isLowBalance ? "border-orange-500" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Saldo de Créditos
            </span>
            <div className="flex items-center gap-2">
              {isLowBalance && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Saldo Baixo
                </Badge>
              )}
              <Button
                size="sm"
                onClick={() => setIsPurchaseDialogOpen(true)}
                className="gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Comprar Pacote
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            1 crédito = 1 dia de creche
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balanceLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando...</div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className={`text-5xl font-bold ${isLowBalance ? "text-orange-500" : "text-primary"}`}>
                  {balance || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {balance === 1 ? "crédito disponível" : "créditos disponíveis"}
                </div>
              </div>

              {isLowBalance && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                  <p className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Atenção: Saldo baixo
                  </p>
                  <p className="mt-1">
                    Recomendamos adicionar mais créditos para garantir o atendimento contínuo na creche.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="purchases" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="purchases">Compras</TabsTrigger>
              <TabsTrigger value="usage">Consumo</TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="space-y-4 mt-4">
              {historyLoading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : history && history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Pacote de {item.packageDays} créditos</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.purchaseDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          +{item.packageDays}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R$ {(item.packagePrice / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma compra registrada
                </div>
              )}
            </TabsContent>

            <TabsContent value="usage" className="space-y-4 mt-4">
              {usageHistory && usageHistory.length > 0 ? (
                <div className="space-y-2">
                  {usageHistory.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <TrendingDown className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">Dia de creche</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(item.usageDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                          {item.checkInTime && (
                            <p className="text-xs text-muted-foreground">
                              Check-in: {format(new Date(item.checkInTime), "HH:mm")}
                              {item.checkOutTime && ` • Check-out: ${format(new Date(item.checkOutTime), "HH:mm")}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">-1</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum consumo registrado
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comprar Pacote de Créditos</DialogTitle>
            <DialogDescription>
              Escolha um pacote de créditos para adicionar ao saldo do pet
            </DialogDescription>
          </DialogHeader>
          <CreditPackages petId={petId} onPurchaseSuccess={handlePurchaseSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
