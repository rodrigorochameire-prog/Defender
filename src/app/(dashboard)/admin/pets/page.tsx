"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dog, 
  Check, 
  X, 
  Search,
  Filter,
  PawPrint,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Calendar,
  Eye,
  MoreVertical,
  Sparkles,
  AlertCircle,
  ArrowUpRight
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

export default function AdminPetsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();

  const approveMutation = trpc.pets.approve.useMutation({
    onSuccess: () => {
      toast.success("Pet aprovado com sucesso!");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.pets.reject.useMutation({
    onSuccess: () => {
      toast.success("Pet rejeitado");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Filtered pets
  const filteredPets = useMemo(() => {
    if (!pets) return [];
    return pets.filter((pet) => {
      const matchesSearch = 
        pet.name.toLowerCase().includes(search.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || pet.approvalStatus === statusFilter;
      const matchesSpecies = speciesFilter === "all" || pet.species === speciesFilter;
      return matchesSearch && matchesStatus && matchesSpecies;
    });
  }, [pets, search, statusFilter, speciesFilter]);

  // Stats
  const stats = useMemo(() => {
    if (!pets) return { total: 0, approved: 0, pending: 0, rejected: 0, dogs: 0 };
    return {
      total: pets.length,
      approved: pets.filter(p => p.approvalStatus === "approved").length,
      pending: pets.filter(p => p.approvalStatus === "pending").length,
      rejected: pets.filter(p => p.approvalStatus === "rejected").length,
      dogs: pets.length, // Todos são cachorros
    };
  }, [pets]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <PawPrint />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Pets</h1>
            <p>Gerencie todos os pets cadastrados</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total de Pets</span>
            <PawPrint className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats.total}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprovados</span>
            <CheckCircle2 className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats.approved}</div>
        </div>

        <div className={`stat-card ${stats.pending > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pendentes</span>
            <Clock className={`stat-card-icon ${stats.pending > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{stats.pending}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Cachorros</span>
            <Dog className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats.dogs}</div>
        </div>
      </div>

      {/* Pending Approvals - Minimalista */}
      {pendingPets && pendingPets.length > 0 && (
        <Card className="border-amber-200/50 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base font-medium text-foreground">
                  Aguardando Aprovação
                </CardTitle>
                <CardDescription>
                  {pendingPets.length} pet{pendingPets.length > 1 ? 's' : ''} precisam de sua atenção
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendingPets.slice(0, 6).map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center justify-between p-4 bg-card rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Dog className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pet.breed || "Sem raça"} • {formatDate(pet.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: pet.id })}
                      disabled={approveMutation.isPending}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: pet.id })}
                      disabled={rejectMutation.isPending}
                      className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {pendingPets.length > 6 && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setStatusFilter("pending")}>
                  Ver todos ({pendingPets.length})
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou raça..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>

              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Espécie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="dog">Cachorros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Pets Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dog className="h-5 w-5 text-primary" />
            Todos os Pets
            <Badge variant="secondary" className="ml-2">
              {filteredPets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPets.length === 0 ? (
            <div className="text-center py-12">
              <Dog className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum pet encontrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {search || statusFilter !== "all" || speciesFilter !== "all"
                  ? "Tente ajustar os filtros"
                  : "Nenhum pet cadastrado ainda"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPets.map((pet) => (
                <Card
                  key={pet.id}
                  className="group hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden cursor-pointer"
                  onClick={() => {
                    setSelectedPet(pet);
                    setIsDetailOpen(true);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Dog className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">{pet.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pet.breed || "Sem raça definida"}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPet(pet);
                            setIsDetailOpen(true);
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {pet.approvalStatus === "pending" && (
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                approveMutation.mutate({ id: pet.id });
                              }}>
                                <Check className="h-4 w-4 mr-2 text-green-500" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                rejectMutation.mutate({ id: pet.id });
                              }}>
                                <X className="h-4 w-4 mr-2 text-red-500" />
                                Rejeitar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Badge
                        variant={pet.approvalStatus === "approved" ? "default" : "secondary"}
                        className={
                          pet.approvalStatus === "approved"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                            : pet.approvalStatus === "pending"
                            ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                        }
                      >
                        {pet.approvalStatus === "approved"
                          ? "✓ Aprovado"
                          : pet.approvalStatus === "pending"
                          ? "⏳ Pendente"
                          : "✗ Rejeitado"}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        <span className="font-medium text-primary">{pet.credits}</span>
                        <span>créditos</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(pet.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pet Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center">
                <Dog className="h-5 w-5 text-primary" />
              </div>
              {selectedPet?.name}
            </DialogTitle>
            <DialogDescription>
              Detalhes do pet
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Raça</p>
                  <p className="font-medium">{selectedPet.breed || "Não informada"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Espécie</p>
                  <p className="font-medium">Cachorro</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="font-medium text-primary">{selectedPet.credits}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Cadastro</p>
                  <p className="font-medium">{formatDate(selectedPet.createdAt)}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge
                  variant={selectedPet.approvalStatus === "approved" ? "default" : "secondary"}
                  className={
                    selectedPet.approvalStatus === "approved"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                      : selectedPet.approvalStatus === "pending"
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
                  }
                >
                  {selectedPet.approvalStatus === "approved"
                    ? "Aprovado"
                    : selectedPet.approvalStatus === "pending"
                    ? "Pendente"
                    : "Rejeitado"}
                </Badge>
              </div>

              {selectedPet.approvalStatus === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      approveMutation.mutate({ id: selectedPet.id });
                      setIsDetailOpen(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                    onClick={() => {
                      rejectMutation.mutate({ id: selectedPet.id });
                      setIsDetailOpen(false);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
