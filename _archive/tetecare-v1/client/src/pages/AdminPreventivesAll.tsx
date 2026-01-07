import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Shield, Search, AlertCircle, CheckCircle2 } from "lucide-react";
import { RecentChangeIndicator } from "@/components/RecentChangeIndicator";

export default function AdminPreventivesAll() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: allChanges } = trpc.changeHistory.getRecentChanges.useQuery({ limit: 200 });

  // Get all flea treatments for all pets
  const petFleaTreatments = pets?.map(pet => {
    const { data: treatments } = trpc.flea.list.useQuery({ petId: pet.id });
    return { pet, treatments: treatments || [], type: "flea" as const };
  }).filter(Boolean) || [];

  // Get all deworming treatments for all pets
  const petDewormingTreatments = pets?.map(pet => {
    const { data: treatments } = trpc.deworming.list.useQuery({ petId: pet.id });
    return { pet, treatments: treatments || [], type: "deworming" as const };
  }).filter(Boolean) || [];

  // Combine all preventive treatments
  const allPreventives = [
    ...petFleaTreatments.flatMap(({ pet, treatments }) =>
      treatments.map(treatment => ({
        id: treatment.id,
        petName: pet.name,
        petId: pet.id,
        type: "Antipulgas" as const,
        product: treatment.productName,
        lastApplication: treatment.applicationDate,
        nextApplication: treatment.nextDueDate,
        notes: treatment.notes,
      }))
    ),
    ...petDewormingTreatments.flatMap(({ pet, treatments }) =>
      treatments.map(treatment => ({
        id: treatment.id,
        petName: pet.name,
        petId: pet.id,
        type: "Vermífugo" as const,
        product: treatment.productName,
        lastApplication: treatment.applicationDate,
        nextApplication: treatment.nextDueDate,
        notes: treatment.notes,
      }))
    ),
  ];

  // Helper to check if treatment is overdue
  const isOverdue = (nextDate: Date | null) => {
    if (!nextDate) return false;
    return new Date(nextDate) < new Date();
  };

  // Helper to check if treatment is upcoming (within 7 days)
  const isUpcoming = (nextDate: Date | null) => {
    if (!nextDate) return false;
    const next = new Date(nextDate);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return next >= today && next <= weekFromNow;
  };

  // Filter preventives
  const filteredPreventives = allPreventives.filter(prev => {
    const matchesSearch =
      prev.petName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prev.product.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "flea" && prev.type === "Antipulgas") ||
      (typeFilter === "deworming" && prev.type === "Vermífugo");

    const overdue = isOverdue(prev.nextApplication);
    const upcoming = isUpcoming(prev.nextApplication);
    const active = !overdue && !upcoming;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue" && overdue) ||
      (statusFilter === "upcoming" && upcoming) ||
      (statusFilter === "active" && active);

    return matchesSearch && matchesType && matchesStatus;
  });

  // Statistics
  const totalPreventives = allPreventives.length;
  const overduePreventives = allPreventives.filter(p => isOverdue(p.nextApplication)).length;
  const upcomingPreventives = allPreventives.filter(p => isUpcoming(p.nextApplication)).length;
  const activePreventives = allPreventives.filter(p => !isOverdue(p.nextApplication) && !isUpcoming(p.nextApplication)).length;

  // Helper to get recent changes for a preventive
  const getRecentChanges = (preventiveId: number) => {
    if (!allChanges) return [];
    return allChanges.filter(
      change =>
        change.resourceId === preventiveId &&
        (change.resourceType === "flea" || change.resourceType === "deworming")
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Todos os Preventivos</h1>
          <p className="text-muted-foreground mt-2">
            Visualize e gerencie tratamentos antipulgas e vermífugos de todos os pets
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPreventives}</div>
              <p className="text-xs text-muted-foreground">Tratamentos registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{overduePreventives}</div>
              <p className="text-xs text-muted-foreground">Necessitam aplicação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximos (7 dias)</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{upcomingPreventives}</div>
              <p className="text-xs text-muted-foreground">Aplicação em breve</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Dia</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activePreventives}</div>
              <p className="text-xs text-muted-foreground">Próxima aplicação agendada</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tratamentos Preventivos</CardTitle>
            <CardDescription>
              Lista completa de antipulgas e vermífugos de todos os pets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pet ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="flea">Antipulgas</SelectItem>
                  <SelectItem value="deworming">Vermífugo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="upcoming">Próximos (7 dias)</SelectItem>
                  <SelectItem value="active">Em dia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {filteredPreventives.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum tratamento encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Ajuste os filtros ou adicione tratamentos preventivos aos pets
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Última Aplicação</TableHead>
                      <TableHead>Próxima Aplicação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Alterações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPreventives.map((prev) => {
                      const overdue = isOverdue(prev.nextApplication);
                      const upcoming = isUpcoming(prev.nextApplication);

                      return (
                        <TableRow key={`${prev.type}-${prev.id}`}>
                          <TableCell className="font-medium">{prev.petName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {prev.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{prev.product}</TableCell>
                          <TableCell>
                            {new Date(prev.lastApplication).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            {prev.nextApplication
                              ? new Date(prev.nextApplication).toLocaleDateString("pt-BR")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {overdue && (
                              <Badge variant="destructive">Atrasado</Badge>
                            )}
                            {upcoming && !overdue && (
                              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                                Próximo
                              </Badge>
                            )}
                            {!overdue && !upcoming && (
                              <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                                Em dia
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <RecentChangeIndicator
                              changes={getRecentChanges(prev.id)}
                              resourceType="preventive"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
