"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminTutorsPage() {
  const [search, setSearch] = useState("");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedTutor, setSelectedTutor] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: tutors, isLoading } = trpc.users.tutors.useQuery({ search });
  const { data: stats } = trpc.users.stats.useQuery();

  const promoteMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário promovido a admin!");
      utils.users.tutors.invalidate();
      utils.users.stats.invalidate();
      setPromoteDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const statsSummary = useMemo(() => {
    if (!tutors) return { total: 0, verified: 0, withPets: 0, totalPets: 0 };
    return {
      total: tutors.length,
      verified: tutors.filter(t => t.emailVerified).length,
      withPets: tutors.filter(t => t.petCount > 0).length,
      totalPets: tutors.reduce((acc, t) => acc + t.petCount, 0),
    };
  }, [tutors]);

  if (isLoading) {
    return <LoadingPage />;
  }

  const getInitials = (name: string) => {
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
            <p>Gerencie os tutores cadastrados</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total de Tutores</span>
            <Users className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{stats?.tutors || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Administradores</span>
            <Crown className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{stats?.admins || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Verificados</span>
            <CheckCircle2 className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{stats?.verified || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pets Cadastrados</span>
            <Dog className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{statsSummary.totalPets}</div>
        </div>
      </div>

      {/* Search */}
      <div className="section-card">
        <div className="section-card-content pt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tutors List */}
      <div className="section-card">
        <div className="section-card-header">
          <div>
            <div className="section-card-title">
              <Users />
              Tutores
            </div>
            <div className="section-card-subtitle">{tutors?.length || 0} encontrados</div>
          </div>
        </div>
        <div className="section-card-content">
          {!tutors || tutors.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Users />
              </div>
              <div className="empty-state-title">
                {search ? "Nenhum tutor encontrado" : "Nenhum tutor cadastrado"}
              </div>
              <div className="empty-state-description">
                {search ? "Tente ajustar sua busca" : "Aguardando novos cadastros"}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="p-4 rounded-xl border border-border/70 hover:border-border cursor-pointer transition-all hover:shadow-sm"
                  onClick={() => {
                    setSelectedTutor(tutor);
                    setIsDetailOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-primary/80 to-primary">
                        <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                          {getInitials(tutor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm">{tutor.name}</span>
                          {tutor.emailVerified && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate block max-w-[160px]">
                          {tutor.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTutor(tutor);
                          setIsDetailOpen(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserId(tutor.id);
                          setPromoteDialogOpen(true);
                        }}>
                          <Crown className="h-4 w-4 mr-2" />
                          Promover a Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Dog className="h-3.5 w-3.5" />
                      {tutor.petCount} pets
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(tutor.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border/50">
                    {tutor.emailVerified ? (
                      <span className="badge badge-success">Verificado</span>
                    ) : (
                      <span className="badge badge-warning">Pendente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedTutor && (
                <>
                  <Avatar className="h-9 w-9 bg-gradient-to-br from-primary/80 to-primary">
                    <AvatarFallback className="bg-transparent text-white text-xs font-semibold">
                      {getInitials(selectedTutor.name)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedTutor.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>Detalhes do tutor</DialogDescription>
          </DialogHeader>

          {selectedTutor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium text-sm truncate">{selectedTutor.email}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Phone className="h-3 w-3" /> Telefone
                  </p>
                  <p className="font-medium text-sm">{selectedTutor.phone || "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Dog className="h-3 w-3" /> Pets
                  </p>
                  <p className="font-medium text-sm">{selectedTutor.petCount} cadastrados</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                    <Calendar className="h-3 w-3" /> Cadastro
                  </p>
                  <p className="font-medium text-sm">{formatDate(selectedTutor.createdAt)}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                {selectedTutor.emailVerified ? (
                  <span className="badge badge-success flex items-center gap-1 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Email Verificado
                  </span>
                ) : (
                  <span className="badge badge-warning flex items-center gap-1 w-fit">
                    <Clock className="h-3 w-3" />
                    Aguardando Verificação
                  </span>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  setSelectedUserId(selectedTutor.id);
                  setIsDetailOpen(false);
                  setPromoteDialogOpen(true);
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Promover a Admin
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <ConfirmDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        title="Promover a Administrador"
        description="Tem certeza que deseja promover este usuário a administrador?"
        confirmLabel="Promover"
        onConfirm={() => {
          if (selectedUserId) {
            promoteMutation.mutate({ id: selectedUserId });
          }
        }}
        isLoading={promoteMutation.isPending}
      />
    </div>
  );
}
