import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentHistory } from "@/components/PaymentHistory";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Plus,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AdminFinances() {
  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("income");

  // Queries
  const { data: pets } = trpc.pets.list.useQuery();
  const { data: transactions } = trpc.credits.getTransactions.useQuery();
  const { data: stats } = trpc.credits.getStats.useQuery();

  // Mutations
  const addCredits = trpc.credits.add.useMutation({
    onSuccess: () => {
      toast.success("Créditos adicionados com sucesso!");
      setIsAddCreditDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const addTransaction = trpc.credits.addTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transação registrada com sucesso!");
      setIsAddTransactionDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleAddCredits = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const petId = parseInt(formData.get("petId") as string);
    const amount = parseFloat(formData.get("amount") as string);
    const description = formData.get("description") as string;

    addCredits.mutate({ petId, amount, description });
  };

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const petId = formData.get("petId") ? parseInt(formData.get("petId") as string) : undefined;
    const amount = parseFloat(formData.get("amount") as string);
    const type = formData.get("type") as "income" | "expense";
    const category = formData.get("category") as string;
    const description = formData.get("description") as string;

    addTransaction.mutate({ petId, amount, type, category, description });
  };

  // Mock data for charts
  const monthlyRevenue = [
    { month: "Jan", revenue: 12500 },
    { month: "Fev", revenue: 15200 },
    { month: "Mar", revenue: 18900 },
    { month: "Abr", revenue: 16700 },
    { month: "Mai", revenue: 21300 },
    { month: "Jun", revenue: 19800 },
  ];

  const expensesByCategory = [
    { category: "Ração", amount: 4500 },
    { category: "Medicamentos", amount: 2300 },
    { category: "Limpeza", amount: 1800 },
    { category: "Salários", amount: 8500 },
    { category: "Outros", amount: 1200 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Finanças</h1>
            <p className="text-muted-foreground">Controle financeiro e gestão de créditos</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddCreditDialogOpen} onOpenChange={setIsAddCreditDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Créditos
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Créditos</DialogTitle>
                  <DialogDescription>
                    Adicione créditos de creche para um pet
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddCredits} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="petId">Pet *</Label>
                    <Select name="petId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pet" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets?.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Quantidade de Créditos *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="Ex: 10"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Ex: Pacote mensal"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={addCredits.isPending}>
                    {addCredits.isPending ? "Adicionando..." : "Adicionar Créditos"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                  <DialogDescription>
                    Registre uma receita ou despesa
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddTransaction} className="space-y-4">
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
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedType === "income" ? (
                          <>
                            <SelectItem value="daycare">Creche</SelectItem>
                            <SelectItem value="credits">Créditos</SelectItem>
                            <SelectItem value="services">Serviços</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="food">Ração</SelectItem>
                            <SelectItem value="medication">Medicamentos</SelectItem>
                            <SelectItem value="cleaning">Limpeza</SelectItem>
                            <SelectItem value="salary">Salários</SelectItem>
                            <SelectItem value="maintenance">Manutenção</SelectItem>
                            <SelectItem value="other">Outros</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$) *</Label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="Ex: 150.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="petId">Pet (opcional)</Label>
                    <Select name="petId">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o pet (se aplicável)" />
                      </SelectTrigger>
                      <SelectContent>
                        {pets?.map((pet) => (
                          <SelectItem key={pet.id} value={pet.id.toString()}>
                            {pet.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição *</Label>
                    <Input
                      id="description"
                      name="description"
                      placeholder="Descreva a transação"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
                    {addTransaction.isPending ? "Registrando..." : "Registrar Transação"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats?.monthlyRevenue?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3" />
                  +12.5% vs mês anterior
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {stats?.monthlyExpenses?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600 flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3" />
                  -3.2% vs mês anterior
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lucro Mensal</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {((stats?.monthlyRevenue || 0) - (stats?.monthlyExpenses || 0)).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Margem: {stats?.monthlyRevenue ? (((stats.monthlyRevenue - (stats.monthlyExpenses || 0)) / stats.monthlyRevenue) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Créditos Ativos</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalActiveCredits || 0}</div>
              <p className="text-xs text-muted-foreground">
                Em {stats?.petsWithCredits || 0} pets
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="credits">Créditos</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos Stripe</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receita Mensal</CardTitle>
                  <CardDescription>Últimos 6 meses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Despesas por Categoria</CardTitle>
                  <CardDescription>Mês atual</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={expensesByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>Histórico de receitas e despesas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions && transactions.length > 0 ? (
                    transactions.map((transaction: any) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              transaction.type === "income"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {transaction.type === "income" ? (
                              <ArrowUpRight className="h-5 w-5" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.category} • {new Date(transaction.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              transaction.type === "income" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.type === "income" ? "+" : "-"}R$ {transaction.amount.toFixed(2)}
                          </p>
                          {transaction.petName && (
                            <p className="text-sm text-muted-foreground">{transaction.petName}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma transação registrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Créditos por Pet</CardTitle>
                <CardDescription>Saldo de créditos de creche</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pets?.map((pet: any) => (
                    <div
                      key={pet.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {pet.photoUrl ? (
                          <img
                            src={pet.photoUrl}
                            alt={pet.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-accent flex items-center justify-center text-white font-bold">
                            {pet.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">{pet.breed}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{pet.credits || 0}</p>
                        <p className="text-sm text-muted-foreground">créditos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
