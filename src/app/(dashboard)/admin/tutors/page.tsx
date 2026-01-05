"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  Dog, 
  Crown,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Eye,
  Clock,
  Check,
  X,
  AlertCircle,
  Filter,
  Plus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

export default function AdminTutorsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: tutors, isLoading } = trpc.users.tutors.useQuery({ 
    search,
    approvalStatus: statusFilter !== "all" ? statusFilter as "pending" | "approved" | "rejected" : undefined,
  });
  const { data: stats } = trpc.users.stats.useQuery();
  const { data: pendingTutors } = trpc.users.pendingTutors.useQuery();

  const promoteMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário promovido a admin!");
      utils.users.tutors.invalidate();
      utils.users.stats.invalidate();
      setPromoteDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const approveMutation = trpc.users.approveTutor.useMutation({
    onSuccess: () => {
      toast.success("Tutor aprovado!");
      utils.users.tutors.invalidate();
      utils.users.stats.invalidate();
      utils.users.pendingTutors.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.users.rejectTutor.useMutation({
    onSuccess: () => {
      toast.success("Tutor rejeitado!");
      utils.users.tutors.invalidate();
      utils.users.stats.invalidate();
      utils.users.pendingTutors.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("Tutor criado com sucesso!");
      setIsCreateOpen(false);
      utils.users.tutors.invalidate();
      utils.users.stats.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreateTutor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      phone: formData.get("phone") as string || undefined,
      role: "user",
    });
  };

  const statsSummary = useMemo(() => {
    if (!tutors) return { total: 0, pending: 0, approved: 0, withPets: 0 };
    return {
      total: tutors.length,
      pending: stats?.pendingTutors || 0,
      approved: stats?.approvedTutors || 0,
      withPets: tutors.filter(t => t.petCount > 0).length,
    };
  }, [tutors, stats]);

  if (isLoading) {
    return <LoadingPage />;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Users />
          </div>
          <div className="page-header-info">
            <h1>Gestão de Tutores</h1>
            <p>Gerencie os tutores e aprovações</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button onClick={() => setIsCreateOpen(true)} size="sm" className="btn-sm btn-primary">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Novo Tutor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <Users className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats?.tutors || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprovados</span>
            <CheckCircle2 className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{statsSummary.approved}</div>
        </div>

        <div className={`stat-card ${statsSummary.pending > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pendentes</span>
            <Clock className={`stat-card-icon ${statsSummary.pending > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{statsSummary.pending}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Com Pets</span>
            <Dog className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{statsSummary.withPets}</div>
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingTutors && pendingTutors.length > 0 && (
        <div className="section-card border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
          <div className="section-card-header">
            <div className="section-card-title">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Aguardando Aprovação ({pendingTutors.length})
            </div>
          </div>
          <div className="section-card-content">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pendingTutors.map((tutor) => (
                <div key={tutor.id} className="flex items-center justify-between p-3 bg-card rounded-xl border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-amber-100 text-amber-700">
                        {getInitials(tutor.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{tutor.name}</p>
                      <p className="text-xs text-muted-foreground">{tutor.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: tutor.id })}
                      disabled={approveMutation.isPending}
                      className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: tutor.id })}
                      disabled={rejectMutation.isPending}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
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
      </div>

      {/* Tutors List */}
      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <Users />
            Todos os Tutores
            <Badge variant="secondary" className="ml-2">{tutors?.length || 0}</Badge>
          </div>
        </div>
        <div className="section-card-content">
          {!tutors || tutors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users /></div>
              <p className="empty-state-text">Nenhum tutor encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => (
                <div key={tutor.id} className="p-4 rounded-xl border bg-card hover:border-primary/30 transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(tutor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{tutor.name}</p>
                        <p className="text-sm text-muted-foreground">{tutor.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setSelectedTutor(tutor); setIsDetailOpen(true); }}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
                        </DropdownMenuItem>
                        {tutor.approvalStatus !== "approved" && (
                          <DropdownMenuItem onClick={() => approveMutation.mutate({ id: tutor.id })}>
                            <Check className="h-4 w-4 mr-2 text-green-500" /> Aprovar
                          </DropdownMenuItem>
                        )}
                        {tutor.approvalStatus === "approved" && (
                          <DropdownMenuItem onClick={() => { setSelectedUserId(tutor.id); setPromoteDialogOpen(true); }}>
                            <Crown className="h-4 w-4 mr-2 text-amber-500" /> Promover a Admin
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {tutor.approvalStatus !== "rejected" && (
                          <DropdownMenuItem 
                            onClick={() => rejectMutation.mutate({ id: tutor.id })}
                            className="text-destructive"
                          >
                            <X className="h-4 w-4 mr-2" /> Rejeitar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge className={
                      tutor.approvalStatus === "approved" ? "badge-green" :
                      tutor.approvalStatus === "pending" ? "badge-amber" : "badge-rose"
                    }>
                      {tutor.approvalStatus === "approved" ? "Aprovado" :
                       tutor.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm">
                      <Dog className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{tutor.petCount} pets</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Tutor Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Tutor</DialogTitle>
            <DialogDescription>Cadastre um tutor diretamente (já aprovado)</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTutor} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input id="password" name="password" type="password" required minLength={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tutor Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {selectedTutor?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTutor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="font-medium text-sm">{selectedTutor.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</p>
                  <p className="font-medium text-sm">{selectedTutor.phone || "Não informado"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <Badge className={
                    selectedTutor.approvalStatus === "approved" ? "badge-green" :
                    selectedTutor.approvalStatus === "pending" ? "badge-amber" : "badge-rose"
                  }>
                    {selectedTutor.approvalStatus === "approved" ? "Aprovado" :
                     selectedTutor.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pets</p>
                  <p className="font-medium text-sm">{selectedTutor.petCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Cadastro</p>
                  <p className="font-medium text-sm">{formatDate(selectedTutor.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                {selectedTutor.approvalStatus !== "approved" && (
                  <Button 
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => { approveMutation.mutate({ id: selectedTutor.id }); setIsDetailOpen(false); }}
                  >
                    <Check className="h-4 w-4 mr-2" /> Aprovar
                  </Button>
                )}
                {selectedTutor.approvalStatus === "approved" && (
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setSelectedUserId(selectedTutor.id); setPromoteDialogOpen(true); setIsDetailOpen(false); }}
                  >
                    <Crown className="h-4 w-4 mr-2" /> Promover a Admin
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <ConfirmDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        title="Promover a Administrador"
        description="Tem certeza que deseja promover este usuário a administrador? Ele terá acesso total ao sistema."
        confirmLabel="Promover"
        onConfirm={() => selectedUserId && promoteMutation.mutate({ id: selectedUserId })}
        isLoading={promoteMutation.isPending}
      />
    </div>
  );
}
