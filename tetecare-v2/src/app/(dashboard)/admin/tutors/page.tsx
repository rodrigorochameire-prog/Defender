"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Mail, Phone, Dog, Shield, ShieldOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { LoadingPage } from "@/components/shared/loading";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

export default function AdminTutorsPage() {
  const [search, setSearch] = useState("");
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

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

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestão de Tutores"
        description="Gerencie os tutores cadastrados no sistema"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tutores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tutors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.admins || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificados</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.verified || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tutors List */}
      <Card>
        <CardHeader>
          <CardTitle>Tutores ({tutors?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!tutors || tutors.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum tutor encontrado"
              description={
                search
                  ? "Tente ajustar sua busca"
                  : "Ainda não há tutores cadastrados"
              }
            />
          ) : (
            <div className="space-y-4">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tutor.name}</p>
                        {tutor.emailVerified && (
                          <Badge variant="success" className="text-xs">
                            Verificado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {tutor.email}
                        </span>
                        {tutor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tutor.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Dog className="h-3 w-3" />
                          {tutor.petCount} pets
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Desde {formatDate(tutor.createdAt)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUserId(tutor.id);
                        setPromoteDialogOpen(true);
                      }}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Promover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promote Dialog */}
      <ConfirmDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        title="Promover a Administrador"
        description="Tem certeza que deseja promover este usuário a administrador? Ele terá acesso completo ao sistema."
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
