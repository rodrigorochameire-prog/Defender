// @ts-nocheck
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { NUCLEOS_CONFIG, type Nucleo } from "@/hooks/use-nucleo-filter";

export default function ConviteDefensorPage() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    nucleo: "" as Nucleo | "",
    oab: "",
    funcao: "defensor_titular",
    podeVerTodosAssistidos: true,
    podeVerTodosProcessos: true,
    mensagemPersonalizada: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conviteEnviado, setConviteEnviado] = useState(false);
  const [linkConvite, setLinkConvite] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.email || !formData.nucleo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Chamar API real
      // await trpc.users.convidar.mutate(formData);
      
      // Simular geração de link
      const token = btoa(JSON.stringify({ email: formData.email, nucleo: formData.nucleo }));
      const link = `${window.location.origin}/register?convite=${token}`;
      setLinkConvite(link);
      setConviteEnviado(true);
      
      toast.success(`Convite gerado para ${formData.nome}!`);
    } catch (error) {
      toast.error("Erro ao gerar convite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkConvite);
    toast.success("Link copiado!");
  };

  const handleEnviarEmail = () => {
    const subject = encodeURIComponent("Convite para o Defender - Defensoria de Camaçari");
    const body = encodeURIComponent(`
Olá ${formData.nome},

Você foi convidado(a) para acessar o Defender, sistema de gestão da Defensoria Pública de Camaçari.

${formData.mensagemPersonalizada ? `Mensagem: ${formData.mensagemPersonalizada}\n` : ""}
Clique no link abaixo para criar sua conta:
${linkConvite}

Atenciosamente,
Defensoria Pública de Camaçari
    `.trim());
    
    window.open(`mailto:${formData.email}?subject=${subject}&body=${body}`);
    toast.success("Abrindo cliente de email...");
  };

  if (conviteEnviado) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <Link href="/admin/usuarios" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Usuários
        </Link>

        <Card className="p-8 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Convite Gerado!
            </h1>
            <p className="text-zinc-500">
              O convite para <span className="font-medium text-zinc-700 dark:text-zinc-300">{formData.nome}</span> foi gerado com sucesso.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <Label className="text-xs text-zinc-500 mb-2 block">Link de Convite</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={linkConvite}
                  className="font-mono text-xs bg-white dark:bg-zinc-900"
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
      <Link href="/admin/usuarios" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700">
        <ArrowLeft className="w-4 h-4" />
        Voltar para Usuários
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          Convidar Defensor
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Convide um novo defensor para acessar a plataforma com configurações personalizadas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
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
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
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
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full mb-2", config.bgColor)} />
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-zinc-500">{config.description}</p>
                </button>
              ))}
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-violet-500" />
            Permissões de Visualização
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ver todos os Assistidos</p>
                <p className="text-xs text-zinc-500">Pode visualizar assistidos de outros núcleos</p>
              </div>
              <Switch
                checked={formData.podeVerTodosAssistidos}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, podeVerTodosAssistidos: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ver todos os Processos</p>
                <p className="text-xs text-zinc-500">Pode visualizar processos de outros núcleos</p>
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

        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 mb-4">
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
            disabled={isSubmitting}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
          >
            {isSubmitting ? (
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
