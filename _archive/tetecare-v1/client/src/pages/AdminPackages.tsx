import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Package,
  CreditCard,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Users,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentHistory } from "@/components/PaymentHistory";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AdminPackages() {
  const [activeTab, setActiveTab] = useState("plans");

  // Dialog states
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isAddCreditDialogOpen, setIsAddCreditDialogOpen] = useState(false);
  const [isAddTransactionDialogOpen, setIsAddTransactionDialogOpen] = useState(false);

  // Form states
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("income");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: plans, isLoading: plansLoading } = trpc.plans.list.useQuery();
  const { data: pets, isLoading: petsLoading } = trpc.pets.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.credits.getStats.useQuery();
  const { data: transactions } = trpc.credits.getTransactions.useQuery();
  const utils = trpc.useUtils();

  // Plans Mutations
  const createPlan = trpc.plans.create.useMutation({
    onSuccess: () => {
      toast.success("Plano criado com sucesso!");
      utils.plans.list.invalidate();
      setIsCreatePlanDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao criar plano: " + error.message);
    },
  });

  const updatePlan = trpc.plans.update.useMutation({
    onSuccess: () => {
      toast.success("Plano atualizado com sucesso!");
      utils.plans.list.invalidate();
      setIsEditPlanDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar plano: " + error.message);
    },
  });

  const deletePlan = trpc.plans.delete.useMutation({
    onSuccess: () => {
      toast.success("Plano removido com sucesso!");
      utils.plans.list.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao remover plano: " + error.message);
    },
  });

  // Credits Mutations
  const addPackage = trpc.credits.addPackage.useMutation({
    onSuccess: () => {
      toast.success("Créditos adicionados com sucesso!");
      setIsAddCreditDialogOpen(false);
      setSelectedPetId("");
      utils.pets.list.invalidate();
      utils.credits.getStats.invalidate();
    },
    onError: (error) => {
      toast.error("Erro ao adicionar créditos: " + error.message);
    },
  });

  const addTransaction = trpc.credits.addTransaction.useMutation({
    onSuccess: () => {
      toast.success("Transação registrada com sucesso!");
      setIsAddTransactionDialogOpen(false);
      utils.credits.getTransactions.invalidate();
      utils.credits.getStats.invalidate();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleCreatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createPlan.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string) * 100,
      credits: parseInt(formData.get("credits") as string),
      validityDays: parseInt(formData.get("validityDays") as string),
      benefits: formData.get("benefits") as string,
    });
  };

  const handleUpdatePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    updatePlan.mutate({
      id: editingPlan.id,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: parseInt(formData.get("price") as string) * 100,
      credits: parseInt(formData.get("credits") as string),
      validityDays: parseInt(formData.get("validityDays") as string),
      benefits: formData.get("benefits") as string,
      isActive: formData.get("isActive") === "on",
    });
  };

  const handleDeletePlan = (id: number) => {
    if (confirm("Tem certeza que deseja remover este plano?")) {
      deletePlan.mutate({ id });
    }
  };

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
      petId: parseInt(selectedPetId),
      packageDays: days,
      packagePrice: price,
    });
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

  const filteredPets = pets?.filter(pet =>
    pet.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const totalCredits = pets?.reduce((sum, pet) => sum + (pet.credits || 0), 0) || 0;
  const petsWithLowCredits = pets?.filter(pet => (pet.credits || 0) < 5).length || 0;

  // Mock data for financial charts
  const monthlyRevenue = [
    { month: "Jan", revenue: 12500 },
    { month: "Fev", revenue: 15200 },
    { month: "Mar", revenue: 18900 },
    { month: "Abr", revenue: 16700 },
    { month: "Mai", revenue: 21300 },
    { month: "Jun", revenue: 19800 },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              Pacotes & Financeiro
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie planos de assinatura, créditos e finanças da creche
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Planos
            </TabsTrigger>
            <TabsTrigger value="credits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Créditos
            </TabsTrigger>
            <TabsTrigger value="finances" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
          </TabsList>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Planos de Assinatura</CardTitle>
                  <CardDescription>
                    Configure e gerencie os planos disponíveis para os tutores
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreatePlanDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plans?.map((plan: any) => (
                    <Card key={plan.id} className="relative">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          {plan.isActive ? (
                            <Badge>Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-3xl font-bold">
                          R$ {(plan.price / 100).toFixed(2)}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span>{plan.credits} créditos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Válido por {plan.validityDays} dias</span>
                          </div>
                        </div>
                        {plan.benefits && (
                          <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">{plan.benefits}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPlan(plan);
                              setIsEditPlanDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Créditos</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCredits}</div>
                  <p className="text-xs text-muted-foreground">Em todos os pets ativos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Créditos Baixos</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{petsWithLowCredits}</div>
                  <p className="text-xs text-muted-foreground">Pets com menos de 5 créditos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pets Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pets?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Total de pets cadastrados</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Créditos</CardTitle>
                  <CardDescription>
                    Adicione ou ajuste os créditos dos pets
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddCreditDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Créditos
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Buscar pet..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pet</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead>Créditos</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPets.map((pet: any) => (
                        <TableRow key={pet.id}>
                          <TableCell className="font-medium">{pet.name}</TableCell>
                          <TableCell>{pet.tutorName || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={pet.credits > 10 ? "default" : pet.credits > 5 ? "secondary" : "destructive"}>
                              {pet.credits || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pet.credits < 5 ? (
                              <Badge variant="outline" className="text-yellow-600">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Baixo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {stats?.totalRevenue?.toFixed(2) || "0.00"}</div>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +12.5% em relação ao mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {stats?.totalExpenses?.toFixed(2) || "0.00"}</div>
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    +5.2% em relação ao mês anterior
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {((stats?.totalRevenue || 0) - (stats?.totalExpenses || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">Margem de lucro</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transações</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{transactions?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Este mês</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Receita Mensal</CardTitle>
                <CardDescription>Visão geral dos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Histórico de Transações</CardTitle>
                  <CardDescription>
                    Visualize e gerencie todas as transações financeiras
                  </CardDescription>
                </div>
                <Button onClick={() => setIsAddTransactionDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </CardHeader>
              <CardContent>
                <PaymentHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Plan Dialog */}
        <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Plano</DialogTitle>
              <DialogDescription>
                Configure um novo plano de assinatura
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input id="price" name="price" type="number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credits">Créditos</Label>
                  <Input id="credits" name="credits" type="number" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validityDays">Validade (dias)</Label>
                  <Input id="validityDays" name="validityDays" type="number" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="benefits">Benefícios</Label>
                <Textarea id="benefits" name="benefits" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreatePlanDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Plano</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Credits Dialog */}
        <Dialog open={isAddCreditDialogOpen} onOpenChange={setIsAddCreditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Créditos</DialogTitle>
              <DialogDescription>
                Adicione créditos para um pet específico
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCredits} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="petId">Pet</Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="days">Quantidade de Créditos</Label>
                <Input id="days" name="days" type="number" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor Pago (R$)</Label>
                <Input id="price" name="price" type="number" step="0.01" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddCreditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Adicionar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Transaction Dialog */}
        <Dialog open={isAddTransactionDialogOpen} onOpenChange={setIsAddTransactionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Transação</DialogTitle>
              <DialogDescription>
                Adicione uma nova transação financeira
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select name="type" required>
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
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input id="category" name="category" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" name="description" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="petId">Pet (opcional)</Label>
                <Select name="petId">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pet (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet: any) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddTransactionDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
