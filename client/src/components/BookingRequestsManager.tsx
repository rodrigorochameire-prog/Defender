import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, CheckCircle2, XCircle, Loader2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export function BookingRequestsManager() {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);

  // Queries
  const { data: pendingRequests, isLoading, refetch } = trpc.bookingRequests.pending.useQuery();
  const { data: stats } = trpc.bookingRequests.stats.useQuery();

  // Mutations
  const approveMutation = trpc.bookingRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Solicitação aprovada com sucesso!");
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao aprovar: " + error.message);
    },
  });

  const rejectMutation = trpc.bookingRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Solicitação rejeitada.");
      setSelectedRequest(null);
      setAdminNotes("");
      setActionType(null);
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao rejeitar: " + error.message);
    },
  });

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setActionType("approve");
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
    setActionType("reject");
  };

  const confirmAction = () => {
    if (!selectedRequest) return;

    if (actionType === "approve") {
      approveMutation.mutate({
        id: selectedRequest.id,
        adminNotes,
      });
    } else if (actionType === "reject") {
      rejectMutation.mutate({
        id: selectedRequest.id,
        adminNotes,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Solicitações de Reserva</CardTitle>
              <CardDescription>
                Gerencie as solicitações de agendamento dos tutores
              </CardDescription>
            </div>
            {stats && (
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                  <p className="text-xs text-muted-foreground">Aprovadas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                  <p className="text-xs text-muted-foreground">Rejeitadas</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!pendingRequests || pendingRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma solicitação pendente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {request.petPhoto && (
                        <img
                          src={request.petPhoto}
                          alt={request.petName || "Pet"}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h4 className="font-semibold text-lg">{request.petName}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span>{request.tutorName}</span>
                          {request.tutorEmail && (
                            <span className="text-xs">({request.tutorEmail})</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Solicitado em {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>

                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Datas solicitadas ({(request.requestedDates as string[]).length} dias):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(request.requestedDates as string[]).map((date, index) => (
                        <Badge key={index} variant="secondary" className="font-mono">
                          {format(new Date(date), "dd/MM/yyyy (EEE)", { locale: ptBR })}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {request.notes && (
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">Observações do tutor:</p>
                      <p className="text-sm text-blue-700">{request.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => {
        setSelectedRequest(null);
        setAdminNotes("");
        setActionType(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Aprovar Solicitação" : "Rejeitar Solicitação"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Ao aprovar, as reservas serão criadas e os créditos serão consumidos automaticamente."
                : "Informe o motivo da rejeição para o tutor."}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded">
                <p className="text-sm font-medium">Pet: {selectedRequest.petName}</p>
                <p className="text-sm text-muted-foreground">Tutor: {selectedRequest.tutorName}</p>
                <p className="text-sm text-muted-foreground">
                  Datas: {(selectedRequest.requestedDates as string[]).length} dias
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {actionType === "approve" ? "Observações (opcional)" : "Motivo da rejeição"}
                </label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    actionType === "approve"
                      ? "Adicione observações para o tutor..."
                      : "Explique o motivo da rejeição..."
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(null);
                    setAdminNotes("");
                    setActionType(null);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant={actionType === "approve" ? "default" : "destructive"}
                  onClick={confirmAction}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                  className="flex-1"
                >
                  {(approveMutation.isPending || rejectMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      {actionType === "approve" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar Aprovação
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Confirmar Rejeição
                        </>
                      )}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
