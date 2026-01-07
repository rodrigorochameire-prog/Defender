"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, User, Trash2, UserPlus, UserMinus, AlertCircle, Loader2, Shield } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
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
  login: {
    label: "Login",
    icon: User,
    color: "text-blue-600",
  },
  logout: {
    label: "Logout",
    icon: User,
    color: "text-gray-600",
  },
};

export default function AdminAuditLogsPage() {
  const { data: logsData, isLoading } = trpc.auditLogs.list.useQuery({ limit: 100 });
  const { data: stats } = trpc.auditLogs.stats.useQuery();

  const logs = logsData?.logs || [];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Shield />
          </div>
          <div className="page-header-info">
            <h1>Logs de Auditoria</h1>
            <p>Ações críticas dos administradores</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid grid-cols-4">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Total de Logs</span>
            <FileText className="icon text-primary" />
          </div>
          <div className="stat-card-value">{stats?.total || 0}</div>
          <p className="stat-card-description">Últimos 30 dias</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Bem-sucedidas</span>
            <UserPlus className="icon text-green-500" />
          </div>
          <div className="stat-card-value">{stats?.successful || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Com Erro</span>
            <AlertCircle className="icon text-rose-500" />
          </div>
          <div className="stat-card-value">{stats?.failed || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Usuários Únicos</span>
            <User className="icon text-blue-500" />
          </div>
          <div className="stat-card-value">{stats?.uniqueUsers || 0}</div>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">
            <FileText className="icon" />
            Histórico de Ações
          </CardTitle>
          <CardDescription className="section-card-description">
            {logs.length} ações registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="section-card-content">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <AlertCircle />
              </div>
              <p className="empty-state-text">Nenhum log registrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Administrador</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any, index: number) => {
                    const config = ACTION_CONFIG[log.action] || {
                      label: log.action,
                      icon: FileText,
                      color: "text-gray-600",
                    };
                    const Icon = config.icon;

                    return (
                      <TableRow key={log.id || index}>
                        <TableCell className="font-mono text-xs">
                          {log.created_at 
                            ? format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                            : "-"
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              Usuário #{log.user_id || "?"}
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
                          {log.success ? (
                            <Badge variant="outline" className="text-green-600">
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">
                              {log.error_code || "Erro"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {log.ip_address || "-"}
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
  );
}
