"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Copy,
  Check,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generatePixBrCode, PIX_CONFIG } from "@/lib/pix";
import { QRCodeSVG } from "qrcode.react";

// ─── TIPOS ──────────────────────────────────────────────────────
type SubscriptionStatus = "ativo" | "pendente" | "vencido" | "cancelado" | "isento";
type Plano = "essencial" | "criminal" | "completo";

const PLANO_INFO: Record<Plano, { label: string; valor: number; desc: string }> = {
  essencial: {
    label: "Essencial",
    valor: 100,
    desc: "Processos, demandas, documentos, agenda, Drive",
  },
  criminal: {
    label: "Criminal",
    valor: 150,
    desc: "Tudo do Essencial + Criminal, Juri, Execucao Penal, VVD, Infancia",
  },
  completo: {
    label: "Completo",
    valor: 200,
    desc: "Tudo do Criminal + Enrichment IA, Radar, Investigacao, Analise Cruzada",
  },
};

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; icon: React.ElementType }> = {
  ativo: { label: "Ativo", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  pendente: { label: "Pendente", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  vencido: { label: "Vencido", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle },
  cancelado: { label: "Cancelado", color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/30", icon: AlertTriangle },
  isento: { label: "Isento", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
};

const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  aguardando_confirmacao: { label: "Aguardando confirmacao", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  confirmado: { label: "Confirmado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  pendente: { label: "Pendente", color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20" },
  rejeitado: { label: "Rejeitado", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  expirado: { label: "Expirado", color: "bg-neutral-500/15 text-neutral-400 border-neutral-500/20" },
  estornado: { label: "Estornado", color: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default function MinhaAssinaturaPage() {
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [nota, setNota] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedBrCode, setCopiedBrCode] = useState(false);

  const { data: subscription, isLoading: subLoading } = trpc.subscriptions.getMySubscription.useQuery();
  const { data: paymentHistory, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.subscriptions.myPayments.useQuery();

  const reportPayment = trpc.subscriptions.reportPayment.useMutation({
    onSuccess: () => {
      toast.success("Pagamento reportado!", {
        description: "Aguardando confirmacao do administrador.",
      });
      setShowPayDialog(false);
      setNota("");
      refetchPayments();
    },
    onError: (e) => toast.error("Erro ao reportar pagamento", { description: e.message }),
  });

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Minha Assinatura</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e pagamentos</p>
        </div>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground/80 mb-2">Nenhum plano atribuido</h3>
            <p className="text-sm text-muted-foreground">
              Entre em contato com o administrador para atribuir um plano a sua conta.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plano = (subscription.plano || "essencial") as Plano;
  const planoInfo = PLANO_INFO[plano];
  const status = (subscription.status || "pendente") as SubscriptionStatus;
  const statusInfo = STATUS_CONFIG[status];
  const StatusIcon = statusInfo.icon;
  const valorFinal = parseFloat(subscription.valorFinal);
  const desconto = subscription.descontoPercentual ?? 0;

  // Generate PIX BR Code
  const brCode = generatePixBrCode({
    pixKey: PIX_CONFIG.key,
    merchantName: PIX_CONFIG.merchantName,
    merchantCity: PIX_CONFIG.merchantCity,
    amount: valorFinal,
    description: "OMBUDS",
  });

  function handleCopyPixKey() {
    navigator.clipboard.writeText(PIX_CONFIG.key);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCopyBrCode() {
    navigator.clipboard.writeText(brCode);
    setCopiedBrCode(true);
    toast.success("Codigo PIX Copia e Cola copiado!");
    setTimeout(() => setCopiedBrCode(false), 2000);
  }

  function handleReportPayment() {
    reportPayment.mutate({ nota: nota.trim() || undefined });
  }

  // Check if there's already a pending payment this month
  const now = new Date();
  const currentRefMes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hasPendingThisMonth = paymentHistory?.some(
    (p) => p.referenciaMes === currentRefMes && p.status === "aguardando_confirmacao"
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Minha Assinatura</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e pagamentos</p>
      </div>

      {/* Plan + Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground/80 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              Plano {planoInfo.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{planoInfo.desc}</p>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-emerald-400">
                  R$ {valorFinal.toFixed(2).replace(".", ",")}
                </span>
                <span className="text-sm text-muted-foreground">/mes</span>
                {desconto > 0 && (
                  <span className="ml-2 text-xs text-emerald-600">
                    ({desconto}% desconto)
                  </span>
                )}
              </div>
              <Badge variant="outline" className={cn("flex items-center gap-1", statusInfo.color)}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>

            {subscription.dataVencimento && (
              <div className="text-sm text-muted-foreground">
                <span className="text-muted-foreground">Proximo vencimento:</span>{" "}
                {new Date(subscription.dataVencimento + "T00:00:00").toLocaleDateString("pt-BR")}
              </div>
            )}
            {subscription.dataUltimoPagamento && (
              <div className="text-sm text-muted-foreground">
                <span className="text-muted-foreground">Ultimo pagamento:</span>{" "}
                {new Date(subscription.dataUltimoPagamento + "T00:00:00").toLocaleDateString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIX Payment Card */}
        <Card className="bg-card/50 border-emerald-800/40 border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground/80 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-emerald-400" />
              Pagamento via PIX
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* PIX Info */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Chave PIX (Celular):</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{PIX_CONFIG.key}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-400"
                    onClick={handleCopyPixKey}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Titular:</span>
                <span className="text-foreground">{PIX_CONFIG.merchantName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="text-emerald-400 font-semibold">
                  R$ {valorFinal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-3">
              <div className="bg-white dark:bg-neutral-900 p-3 rounded-lg">
                <QRCodeSVG
                  value={brCode}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-800"
                onClick={handleCopyBrCode}
              >
                {copiedBrCode ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                Copiar Copia e Cola
              </Button>
            </div>

            {/* Report Payment Button */}
            {hasPendingThisMonth ? (
              <div className="text-center">
                <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Pagamento deste mes aguardando confirmacao
                </Badge>
              </div>
            ) : (
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setShowPayDialog(true)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Ja paguei
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-foreground/80">Historico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !paymentHistory || paymentHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum pagamento registrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Data</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Referencia</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Valor</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => {
                    const pStatus = PAYMENT_STATUS_MAP[p.status] || { label: p.status, color: "bg-neutral-500/15 text-neutral-400" };
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-foreground/80">
                          {p.createdAt ? new Date(p.createdAt).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                          {p.referenciaMes || "-"}
                        </td>
                        <td className="py-2.5 px-3 text-foreground/80">
                          R$ {parseFloat(p.valor).toFixed(2).replace(".", ",")}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", pStatus.color)}>
                            {pStatus.label}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-xs max-w-[200px] truncate">
                          {p.nota || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Informe que voce ja realizou o pagamento PIX. O administrador ira confirmar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="text-emerald-400 font-semibold">
                  R$ {valorFinal.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referencia:</span>
                <span className="text-foreground/80 font-mono">{currentRefMes}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nota" className="text-muted-foreground text-sm">
                Nota ou referencia (opcional)
              </Label>
              <Input
                id="nota"
                placeholder="Ex: Comprovante enviado por WhatsApp..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="bg-muted/50 border-border text-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPayDialog(false)}
              className="border-border text-muted-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReportPayment}
              disabled={reportPayment.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {reportPayment.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
