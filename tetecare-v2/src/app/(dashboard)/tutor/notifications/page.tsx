"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function TutorNotificationsPage() {
  // TODO: Implementar sistema de notificações

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificações"
        description="Acompanhe as atualizações dos seus pets"
        actions={
          <Button variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Marcar todas como lidas
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Todas as Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            description="Você não tem notificações no momento. Quando houver atualizações sobre seus pets, elas aparecerão aqui."
          />
        </CardContent>
      </Card>
    </div>
  );
}
