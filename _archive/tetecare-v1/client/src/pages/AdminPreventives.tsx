import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Shield, Plus, List, Bug, Worm } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminPreventives() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [, setLocation] = useLocation();

  // TODO: Create preventiveLibrary router
  const { data: library, refetch } = trpc.preventives?.library?.useQuery() || { data: [], refetch: () => {} };

  const addToLibrary = trpc.preventives?.addToLibrary?.useMutation({
    onSuccess: () => {
      toast.success("Produto preventivo adicionado à biblioteca!");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error("Erro: " + error.message);
    },
  }) || { mutate: () => {}, isPending: false };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const type = formData.get("type") as "flea" | "deworming";
    const manufacturer = formData.get("manufacturer") as string;
    const intervalDays = formData.get("intervalDays") as string;
    const notes = formData.get("notes") as string;

    addToLibrary.mutate({
      name,
      type,
      manufacturer: manufacturer || undefined,
      intervalDays: intervalDays ? parseInt(intervalDays) : undefined,
      notes: notes || undefined,
    });
  };

  const fleaProducts = Array.isArray(library) ? library.filter((p: any) => p.type === "flea") : [];
  const dewormingProducts = Array.isArray(library) ? library.filter((p: any) => p.type === "deworming") : [];

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Preventivos</h1>
            <p className="text-muted-foreground">
              Gerenciamento de produtos preventivos (antipulgas e vermífugos)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation("/admin/preventives-all")}>
              <List className="mr-2 h-4 w-4" />
              Ver Todos os Preventivos
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Produto Preventivo</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo produto para uso na plataforma
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Bravecto, Simparic, Drontal"
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
                        <SelectItem value="flea">Antipulgas</SelectItem>
                        <SelectItem value="deworming">Vermífugo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Fabricante</Label>
                    <Input
                      id="manufacturer"
                      name="manufacturer"
                      placeholder="Ex: MSD, Zoetis, Elanco"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="intervalDays">Intervalo Padrão (dias)</Label>
                    <Input
                      id="intervalDays"
                      name="intervalDays"
                      type="number"
                      placeholder="Ex: 30, 90"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Input
                      id="notes"
                      name="notes"
                      placeholder="Informações adicionais"
                    />
                  </div>

                  <DialogFooter>
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
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Produtos</p>
                  <p className="text-3xl font-bold">{Array.isArray(library) ? library.length : 0}</p>
                </div>
                <Shield className="h-10 w-10 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Antipulgas</p>
                  <p className="text-3xl font-bold text-orange-600">{fleaProducts.length}</p>
                </div>
                <Bug className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Vermífugos</p>
                  <p className="text-3xl font-bold text-purple-600">{dewormingProducts.length}</p>
                </div>
                <Worm className="h-10 w-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flea Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-orange-600" />
              Antipulgas
            </CardTitle>
            <CardDescription>
              Produtos para controle de pulgas e carrapatos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fleaProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto antipulgas cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Intervalo Padrão</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fleaProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.manufacturer || "-"}</TableCell>
                      <TableCell>
                        {product.intervalDays ? (
                          <Badge variant="outline">{product.intervalDays} dias</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Deworming Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Worm className="h-5 w-5 text-purple-600" />
              Vermífugos
            </CardTitle>
            <CardDescription>
              Produtos para controle de vermes e parasitas intestinais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dewormingProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum vermífugo cadastrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fabricante</TableHead>
                    <TableHead>Intervalo Padrão</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dewormingProducts.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.manufacturer || "-"}</TableCell>
                      <TableCell>
                        {product.intervalDays ? (
                          <Badge variant="outline">{product.intervalDays} dias</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {product.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
