"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  UserPlus,
  Mail,
  Shield,
  Building2,
  Check,
  Copy,
  Send,
  ArrowLeft,
  AlertCircle,
  Users,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { NUCLEOS_CONFIG, type Nucleo } from "@/hooks/use-nucleo-filter";

export default function ConviteDefensorPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    nucleo: "" as Nucleo | "",
    oab: "",
    funcao: "defensor_titular",
    comarcaId: 0,
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
    mensagemPersonalizada: "",
  });
  const [conviteEnviado, setConviteEnviado] = useState(false);
  const [linkConvite, setLinkConvite] = useState("");

  const { data: comarcasAtivas } = trpc.comarcas.listAtivas.useQuery();

  const inviteMutation = trpc.users.invite.useMutation({
    onSuccess: (data) => {
      const link = `${window.location.origin}/register?convite=${data.token}`;
      setLinkConvite(link);
      setConviteEnviado(true);
      toast.success(`Convite gerado para ${data.nome}!`);
    },
    onError: (error) => {
      toast.error("Erro ao gerar convite", { description: error.message });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.email || !formData.nucleo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!formData.comarcaId || formData.comarcaId === 0) {
      toast.error("Selecione uma comarca");
      return;
    }

    inviteMutation.mutate({
      nome: formData.nome,
      email: formData.email,
      nucleo: formData.nucleo,
      funcao: formData.funcao,
      oab: formData.oab || undefined,
      comarcaId: formData.comarcaId,
      podeVerTodosAssistidos: formData.podeVerTodosAssistidos,
      podeVerTodosProcessos: formData.podeVerTodosProcessos,
      mensagemPersonalizada: formData.mensagemPersonalizada || undefined,
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkConvite);
    toast.success("Link copiado!");
  };

  const handleEnviarEmail = () => {
    const comarcaNome = comarcasAtivas?.find(c => c.id === formData.comarcaId)?.nome ?? "Defensoria";
    const subject = encodeURIComponent(`Convite para o Defender - Defensoria de ${comarcaNome}`);
    const body = encodeURIComponent(`
Olá ${formData.nome},

Você foi convidado(a) para acessar o Defender, sistema de gestão da Defensoria Pública de ${comarcaNome}.

${formData.mensagemPersonalizada ? `Mensagem: ${formData.mensagemPersonalizada}\n` : ""}
Clique no link abaixo para criar sua conta:
${linkConvite}

Atenciosamente,
Defensoria Pública de ${comarcaNome}
    `.trim());

    window.open(`mailto:${formData.email}?subject=${subject}&body=${body}`);
    toast.success("Abrindo cliente de email...");
  };

  if (conviteEnviado) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Link href="/admin/usuarios" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Usuários
        </Link>

        <Card className="p-8 bg-card border-border">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Convite Gerado!
            </h1>
            <p className="text-neutral-500">
              O convite para <span className="font-medium text-foreground">{formData.nome}</span> foi gerado com sucesso.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <Label className="text-xs text-neutral-500 mb-2 block">Link de Convite</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={linkConvite}
                  className="font-mono text-xs bg-card"
                />
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleEnviarEmail} className="gap-2">
                <Mail className="w-4 h-4" />
                Enviar por Email
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setConviteEnviado(false);
                  setFormData({
                    nome: "",
                    email: "",
                    nucleo: "",
                    oab: "",
                    funcao: "defensor_titular",
                    comarcaId: 0,
                    podeVerTodosAssistidos: true,
                    podeVerTodosProcessos: true,
                    mensagemPersonalizada: "",
                  });
                }}
              >
                Novo Convite
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <p className="font-medium">Configurações aplicadas:</p>
                <ul className="mt-1 text-xs space-y-0.5">
                  <li>• Comarca: {comarcasAtivas?.find(c => c.id === formData.comarcaId)?.nome ?? "—"}</li>
                  <li>• Núcleo: {NUCLEOS_CONFIG[formData.nucleo as Nucleo]?.label}</li>
                  <li>• Visualização de assistidos: {formData.podeVerTodosAssistidos ? "Todos" : "Apenas do núcleo"}</li>
                  <li>• Visualização de processos: {formData.podeVerTodosProcessos ? "Todos" : "Apenas do núcleo"}</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/admin/usuarios" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Usuários
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          Convidar Defensor
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Convide um novo defensor para acessar a plataforma com configurações personalizadas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 bg-card border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-emerald-500" />
            Dados do Defensor
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo <span className="text-rose-500">*</span></Label>
              <Input
                id="nome"
                placeholder="Dr. Nome Sobrenome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-rose-500">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="defensor@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oab">Número da OAB</Label>
              <Input
                id="oab"
                placeholder="BA12345"
                value={formData.oab}
                onChange={(e) => setFormData(prev => ({ ...prev, oab: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="funcao">Função</Label>
              <Select
                value={formData.funcao}
                onValueChange={(value) => setFormData(prev => ({ ...prev, funcao: value }))}
              >
                <SelectTrigger id="funcao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defensor_titular">Defensor Titular</SelectItem>
                  <SelectItem value="defensor_substituto">Defensor Substituto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="comarca">
                Comarca <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.comarcaId === 0 ? "" : String(formData.comarcaId)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, comarcaId: Number(value) }))}
              >
                <SelectTrigger id="comarca">
                  <SelectValue placeholder="Selecione a comarca..." />
                </SelectTrigger>
                <SelectContent>
                  {comarcasAtivas?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-500" />
            Núcleo de Atuação <span className="text-rose-500">*</span>
          </h2>

          <div className="grid grid-cols-3 gap-3">
            {Object.entries(NUCLEOS_CONFIG)
              .filter(([key]) => key !== "TODOS")
              .map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, nucleo: key as Nucleo }))}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left",
                    formData.nucleo === key
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-border hover:border-neutral-300"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full mb-2", config.bgColor)} />
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-neutral-500">{config.description}</p>
                </button>
              ))}
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-violet-500" />
            Permissões de Visualização
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ver todos os Assistidos</p>
                <p className="text-xs text-neutral-500">Pode visualizar assistidos de outros núcleos</p>
              </div>
              <Switch
                checked={formData.podeVerTodosAssistidos}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, podeVerTodosAssistidos: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ver todos os Processos</p>
                <p className="text-xs text-neutral-500">Pode visualizar processos de outros núcleos</p>
              </div>
              <Switch
                checked={formData.podeVerTodosProcessos}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, podeVerTodosProcessos: checked }))}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span className="font-medium">Demandas são sempre privadas</span> - cada defensor só vê suas próprias demandas, exceto em casos de cobertura.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-amber-500" />
            Mensagem Personalizada (opcional)
          </h2>

          <Textarea
            placeholder="Adicione uma mensagem pessoal ao convite..."
            value={formData.mensagemPersonalizada}
            onChange={(e) => setFormData(prev => ({ ...prev, mensagemPersonalizada: e.target.value }))}
            className="min-h-[100px]"
          />
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/admin/usuarios">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={inviteMutation.isPending}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            {inviteMutation.isPending ? (
              "Gerando..."
            ) : (
              <>
                <Send className="w-4 h-4 mr-1.5" />
                Gerar Convite
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
