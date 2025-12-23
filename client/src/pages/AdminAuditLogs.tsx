import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Trash2, UserPlus, UserMinus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  promote_admin: {
    label: "Promover Admin",
    icon: UserPlus,
    color: "text-green-600",
  },
  demote_admin: {
    label: "Remover Admin",
    icon: UserMinus,
    color: "text-orange-600",
  },
  delete_user: {
    label: "Deletar Usuário",
    icon: Trash2,
    color: "text-red-600",
  },
};

export default function AdminAuditLogs() {
  const { data: logs, isLoading } = trpc.adminLogs.list.useQuery({ limit: 100 });
  const { data: users } = trpc.userManagement.list.useQuery();

  const getUserName = (userId: number) => {
    const user = users?.find((u) => u.id === userId);
    return user?.name || `Usuário #${userId}`;
  };

  return (
    <AdminLayout>
      <div className="container max-w-7xl py-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground mt-2">
            Auditoria de ações críticas realizadas por administradores
          </p>
        </div>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Ações Administrativas
            </CardTitle>
            <CardDescription>
              {logs?.length || 0} ações registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando logs...
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum log registrado ainda</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Administrador</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const config = ACTION_CONFIG[log.action] || {
                        label: log.action,
                        icon: FileText,
                        color: "text-gray-600",
                      };
                      const Icon = config.icon;

                      let details = null;
                      try {
                        details = log.details ? JSON.parse(log.details) : null;
                      } catch (e) {
                        details = null;
                      }

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-xs">
                            {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {getUserName(log.adminId)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={config.color}>
                              <Icon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.targetType && log.targetId && (
                              <span className="text-sm text-muted-foreground">
                                {log.targetType} #{log.targetId}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {details && (
                              <div className="text-xs text-muted-foreground max-w-xs truncate">
                                {details.email && `Email: ${details.email}`}
                                {details.newRole && `Novo papel: ${details.newRole}`}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {log.ipAddress || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
