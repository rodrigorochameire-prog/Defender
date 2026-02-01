"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Save,
  Plus,
  Lock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Componente de alerta de duplicados
function DuplicateWarningModal({
  isOpen,
  onClose,
  onConfirm,
  onUseExisting,
  duplicados,
  nomeDigitado,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onUseExisting: (id: number) => void;
  duplicados: Array<{
    id: number;
    nome: string;
    cpf: string | null;
    similaridade: number;
    tipo: "exato" | "cpf" | "similar";
  }>;
  nomeDigitado: string;
}) {
  const hasDuplicadoExato = duplicados.some(d => d.tipo === "exato" || d.tipo === "cpf");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            {hasDuplicadoExato ? "Possível Duplicado Detectado" : "Nomes Similares Encontrados"}
          </DialogTitle>
          <DialogDescription>
            {hasDuplicadoExato 
              ? "Encontramos um cadastro que pode ser a mesma pessoa. Verifique antes de continuar."
              : "Encontramos cadastros com nomes parecidos. Verifique se não é a mesma pessoa."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {duplicados.map((dup) => (
            <div 
              key={dup.id}
              className={cn(
                "p-3 rounded-lg border flex items-center justify-between gap-3",
                dup.tipo === "cpf" 
                  ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800"
                  : dup.tipo === "exato"
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {dup.nome}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px]",
                      dup.tipo === "cpf" 
                        ? "border-rose-300 text-rose-600"
                        : dup.tipo === "exato"
                          ? "border-amber-300 text-amber-600"
                          : "border-zinc-300 text-zinc-500"
                    )}
                  >
                    {dup.tipo === "cpf" ? "CPF Igual" : 
                     dup.tipo === "exato" ? "Nome Igual" : 
                     `${Math.round(dup.similaridade * 100)}% similar`}
                  </Badge>
                </div>
                {dup.cpf && (
                  <p className="text-xs text-zinc-500 mt-0.5">CPF: {dup.cpf}</p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-shrink-0"
                onClick={() => onUseExisting(dup.id)}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Usar este
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Voltar e Corrigir
          </Button>
          {!hasDuplicadoExato && (
            <Button onClick={onConfirm} className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Novo Mesmo Assim
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NovoAssistidoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicados, setDuplicados] = useState<any[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    rg: "",
    dataNascimento: "",
    genero: "",
    statusPrisional: "SOLTO" as const,
    unidadePrisional: "",
    telefone: "",
    telefoneContato: "",
    endereco: "",
    bairro: "",
    cidade: "",
    cep: "",
    observacoes: "",
  });
  
  const [preso, setPreso] = useState(false);

  // tRPC mutations
  const checkDuplicates = trpc.assistidos.checkDuplicates.useQuery(
    { nome: formData.nome, cpf: formData.cpf || undefined },
    { enabled: false }
  );
  
  const createAssistido = trpc.assistidos.create.useMutation({
    onSuccess: (data) => {
      toast.success("Assistido cadastrado com sucesso!");
      router.push(`/admin/assistidos/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckDuplicates = async () => {
    if (!formData.nome || formData.nome.length < 2) {
      toast.error("Digite o nome do assistido primeiro");
      return false;
    }

    setIsCheckingDuplicates(true);
    
    try {
      const result = await checkDuplicates.refetch();
      
      if (result.data?.hasDuplicates) {
        setDuplicados(result.data.duplicados);
        setShowDuplicateModal(true);
        setIsCheckingDuplicates(false);
        return false;
      }
      
      setIsCheckingDuplicates(false);
      return true;
    } catch (error) {
      setIsCheckingDuplicates(false);
      return true; // Continua se houver erro na verificação
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar duplicados primeiro
    const canProceed = await handleCheckDuplicates();
    if (!canProceed) return;
    
    submitForm();
  };

  const submitForm = () => {
    setIsLoading(true);
    
    createAssistido.mutate({
      nome: formData.nome,
      cpf: formData.cpf || undefined,
      rg: formData.rg || undefined,
      dataNascimento: formData.dataNascimento || undefined,
      statusPrisional: preso ? (formData.statusPrisional as any) : "SOLTO",
      unidadePrisional: preso ? formData.unidadePrisional : undefined,
      telefone: formData.telefone || undefined,
      telefoneContato: formData.telefoneContato || undefined,
      endereco: formData.endereco || undefined,
      observacoes: formData.observacoes || undefined,
    });
  };

  const handleUseExisting = (id: number) => {
    router.push(`/admin/assistidos/${id}`);
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/assistidos">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Novo Assistido
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Cadastre um novo assistido
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input 
                id="nome" 
                placeholder="Nome completo do assistido" 
                required 
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input 
                  id="cpf" 
                  placeholder="000.000.000-00" 
                  value={formData.cpf}
                  onChange={(e) => handleInputChange("cpf", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input 
                  id="rg" 
                  placeholder="Número do RG"
                  value={formData.rg}
                  onChange={(e) => handleInputChange("rg", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input 
                  id="dataNascimento" 
                  type="date"
                  value={formData.dataNascimento}
                  onChange={(e) => handleInputChange("dataNascimento", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="genero">Gênero</Label>
                <Select value={formData.genero} onValueChange={(v) => handleInputChange("genero", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="O">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="preso" 
                checked={preso}
                onCheckedChange={(checked) => setPreso(checked as boolean)}
              />
              <label
                htmlFor="preso"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                <Lock className="w-3 h-3 text-rose-500" />
                Está Preso
              </label>
            </div>
            {preso && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status Prisional</Label>
                  <Select 
                    value={formData.statusPrisional} 
                    onValueChange={(v) => handleInputChange("statusPrisional", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CADEIA_PUBLICA">Cadeia Pública</SelectItem>
                      <SelectItem value="PENITENCIARIA">Penitenciária</SelectItem>
                      <SelectItem value="COP">COP</SelectItem>
                      <SelectItem value="HOSPITAL_CUSTODIA">Hospital Custódia</SelectItem>
                      <SelectItem value="DOMICILIAR">Prisão Domiciliar</SelectItem>
                      <SelectItem value="MONITORADO">Monitoramento Eletrônico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidadePrisional">Unidade Prisional</Label>
                  <Input 
                    id="unidadePrisional" 
                    placeholder="Nome da unidade"
                    value={formData.unidadePrisional}
                    onChange={(e) => handleInputChange("unidadePrisional", e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input 
                  id="telefone" 
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) => handleInputChange("telefone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefoneContato">Telefone de Contato (familiar)</Label>
                <Input 
                  id="telefoneContato" 
                  placeholder="(00) 00000-0000"
                  value={formData.telefoneContato}
                  onChange={(e) => handleInputChange("telefoneContato", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input 
                id="endereco" 
                placeholder="Rua, número, bairro, cidade"
                value={formData.endereco}
                onChange={(e) => handleInputChange("endereco", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea 
              placeholder="Informações adicionais sobre o assistido..." 
              rows={4}
              value={formData.observacoes}
              onChange={(e) => handleInputChange("observacoes", e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/assistidos">Cancelar</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading || isCheckingDuplicates} 
            className="gap-2"
          >
            {isLoading || isCheckingDuplicates ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCheckingDuplicates ? "Verificando..." : "Salvando..."}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Assistido
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Modal de Duplicados */}
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onConfirm={() => {
          setShowDuplicateModal(false);
          submitForm();
        }}
        onUseExisting={handleUseExisting}
        duplicados={duplicados}
        nomeDigitado={formData.nome}
      />
    </div>
  );
}
