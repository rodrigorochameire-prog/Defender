"use client";

import { useState, use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  MapPin,
  GraduationCap,
  Brain,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  Users,
  Check,
  X,
  Activity,
  BarChart3,
  Building2,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ============================================
// PÁGINA PRINCIPAL - DETALHE DO JURADO
// ============================================
export default function JuradoPerfilPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const juradoId = parseInt(resolvedParams.id);
  
  // Buscar dados do jurado
  const { data: jurado, isLoading, error } = trpc.jurados.byId.useQuery({ id: juradoId });
  const utils = trpc.useUtils();
  
  // Mutation para atualizar
  const updateMutation = trpc.jurados.update.useMutation({
    onSuccess: () => {
      toast.success("Jurado atualizado com sucesso!");
      utils.jurados.byId.invalidate({ id: juradoId });
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  // Mutation para deletar
  const deleteMutation = trpc.jurados.delete.useMutation({
    onSuccess: () => {
      toast.success("Jurado removido!");
      router.push("/admin/juri/jurados");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Estados do formulário
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    profissao: "",
    escolaridade: "",
    idade: "",
    bairro: "",
    genero: "",
    classeSocial: "",
    empresa: "",
    reuniaoPeriodica: "",
    tipoJurado: "",
    perfilPsicologico: "",
    perfilTendencia: "",
    observacoes: "",
  });

  // Preencher form quando dados carregarem
  useEffect(() => {
    if (jurado) {
      setFormData({
        nome: jurado.nome || "",
        profissao: jurado.profissao || "",
        escolaridade: jurado.escolaridade || "",
        idade: jurado.idade?.toString() || "",
        bairro: jurado.bairro || "",
        genero: jurado.genero || "",
        classeSocial: jurado.classeSocial || "",
        empresa: jurado.empresa || "",
        reuniaoPeriodica: jurado.reuniaoPeriodica || "",
        tipoJurado: jurado.tipoJurado || "",
        perfilPsicologico: jurado.perfilPsicologico || "",
        perfilTendencia: jurado.perfilTendencia || "",
        observacoes: jurado.observacoes || "",
      });
    }
  }, [jurado]);

  const handleSave = () => {
    updateMutation.mutate({
      id: juradoId,
      nome: formData.nome,
      profissao: formData.profissao || undefined,
      escolaridade: formData.escolaridade || undefined,
      idade: formData.idade ? parseInt(formData.idade) : undefined,
      bairro: formData.bairro || undefined,
      genero: formData.genero || undefined,
      classeSocial: formData.classeSocial || undefined,
      perfilPsicologico: formData.perfilPsicologico || undefined,
      perfilTendencia: formData.perfilTendencia || undefined,
      observacoes: formData.observacoes || undefined,
    });
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja remover ${jurado?.nome}?`)) {
      deleteMutation.mutate({ id: juradoId });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando jurado...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !jurado) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Jurado não encontrado</p>
          <Link href="/admin/juri/jurados">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calcular estatísticas
  const taxaAbsolvicao = jurado.totalSessoes && jurado.totalSessoes > 0
    ? Math.round((jurado.votosAbsolvicao || 0) / jurado.totalSessoes * 100)
    : null;

  const tendenciaLabel = taxaAbsolvicao === null
    ? { text: "Sem histórico", color: "text-zinc-500", icon: <Scale className="w-5 h-5" /> }
    : taxaAbsolvicao >= 60 
      ? { text: "Favorável à Defesa", color: "text-emerald-600 dark:text-emerald-400", icon: <TrendingUp className="w-5 h-5" /> }
      : taxaAbsolvicao >= 40 
        ? { text: "Equilibrado", color: "text-amber-600 dark:text-amber-400", icon: <Scale className="w-5 h-5" /> }
        : { text: "Favorável à Acusação", color: "text-rose-600 dark:text-rose-400", icon: <TrendingDown className="w-5 h-5" /> };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0f0f11]">
      {/* HEADER PADRÃO DEFENDER */}
      <div className="px-4 md:px-6 py-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/juri/jurados">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                {isEditing ? "Editar Jurado" : jurado.nome}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {jurado.profissao || "Profissão não informada"}
                {jurado.bairro && ` • ${jurado.bairro}`}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Editar
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-zinc-400 hover:text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">
                {jurado.totalSessoes || 0}
              </div>
              <div className="text-xs text-zinc-500">Sessões</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800 bg-emerald-50 dark:bg-emerald-900/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {jurado.votosAbsolvicao || 0}
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Absolvições</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800 bg-rose-50 dark:bg-rose-900/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {jurado.votosCondenacao || 0}
              </div>
              <div className="text-xs text-rose-600 dark:text-rose-400">Condenações</div>
            </CardContent>
          </Card>
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {taxaAbsolvicao !== null ? `${taxaAbsolvicao}%` : "—"}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">Taxa Absolvição</div>
            </CardContent>
          </Card>
        </div>

        {/* Indicador de Tendência */}
        {taxaAbsolvicao !== null && (
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Tendência de Voto</span>
                <div className={cn("flex items-center gap-2", tendenciaLabel.color)}>
                  {tendenciaLabel.icon}
                  <span className="font-semibold">{tendenciaLabel.text}</span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    taxaAbsolvicao >= 60 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                    taxaAbsolvicao >= 40 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                    "bg-gradient-to-r from-rose-500 to-rose-400"
                  )}
                  style={{ width: `${taxaAbsolvicao}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-zinc-400">
                <span>Condenação</span>
                <span>Absolvição</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label>Nome Completo</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Gênero</Label>
                      <Select
                        value={formData.genero}
                        onValueChange={(v) => setFormData({ ...formData, genero: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino</SelectItem>
                          <SelectItem value="F">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Idade</Label>
                      <Input
                        type="number"
                        value={formData.idade}
                        onChange={(e) => setFormData({ ...formData, idade: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Escolaridade</Label>
                      <Select
                        value={formData.escolaridade}
                        onValueChange={(v) => setFormData({ ...formData, escolaridade: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fundamental">Fundamental</SelectItem>
                          <SelectItem value="Médio">Médio</SelectItem>
                          <SelectItem value="Superior">Superior</SelectItem>
                          <SelectItem value="Pós-graduação">Pós-graduação</SelectItem>
                          <SelectItem value="Mestrado">Mestrado</SelectItem>
                          <SelectItem value="Doutorado">Doutorado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Classe Social</Label>
                      <Select
                        value={formData.classeSocial}
                        onValueChange={(v) => setFormData({ ...formData, classeSocial: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                          <SelectItem value="Média-baixa">Média-baixa</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Média-alta">Média-alta</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-500">Gênero</span>
                    <p className="font-medium">{jurado.genero === "F" ? "Feminino" : jurado.genero === "M" ? "Masculino" : jurado.genero || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Idade</span>
                    <p className="font-medium">{jurado.idade ? `${jurado.idade} anos` : "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Escolaridade</span>
                    <p className="font-medium">{jurado.escolaridade || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Classe Social</span>
                    <p className="font-medium">{jurado.classeSocial || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados Profissionais */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Dados Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label>Profissão</Label>
                    <Input
                      value={formData.profissao}
                      onChange={(e) => setFormData({ ...formData, profissao: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Empresa/Local de Trabalho</Label>
                    <Input
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Bairro/Localidade</Label>
                    <Input
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-zinc-500">Profissão</span>
                    <p className="font-medium">{jurado.profissao || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Empresa</span>
                    <p className="font-medium">{jurado.empresa || "—"}</p>
                  </div>
                  <div>
                    <span className="text-zinc-500">Bairro</span>
                    <p className="font-medium">{jurado.bairro || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Classificação na Ata */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Classificação na Ata de Sorteio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Reunião Periódica</Label>
                    <Select
                      value={formData.reuniaoPeriodica}
                      onValueChange={(v) => setFormData({ ...formData, reuniaoPeriodica: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1ª Reunião</SelectItem>
                        <SelectItem value="2">2ª Reunião</SelectItem>
                        <SelectItem value="3">3ª Reunião</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.tipoJurado}
                      onValueChange={(v) => setFormData({ ...formData, tipoJurado: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="titular">Titular</SelectItem>
                        <SelectItem value="suplente">Suplente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {jurado.reuniaoPeriodica && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      {jurado.reuniaoPeriodica}ª Reunião
                    </Badge>
                  )}
                  {jurado.tipoJurado && (
                    <Badge 
                      variant="outline" 
                      className={jurado.tipoJurado === "titular" 
                        ? "text-emerald-600 border-emerald-300" 
                        : "text-amber-600 border-amber-300"
                      }
                    >
                      {jurado.tipoJurado === "titular" ? "Titular" : "Suplente"}
                    </Badge>
                  )}
                  {!jurado.reuniaoPeriodica && !jurado.tipoJurado && (
                    <span className="text-sm text-zinc-500">Não classificado</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Perfil Comportamental */}
          <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Perfil Comportamental
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label>Perfil de Tendência</Label>
                    <Select
                      value={formData.perfilTendencia}
                      onValueChange={(v) => setFormData({ ...formData, perfilTendencia: v })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absolutorio">Absolutório</SelectItem>
                        <SelectItem value="condenatorio">Condenatório</SelectItem>
                        <SelectItem value="neutro">Neutro</SelectItem>
                        <SelectItem value="desconhecido">Desconhecido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Perfil Psicológico</Label>
                    <Textarea
                      value={formData.perfilPsicologico}
                      onChange={(e) => setFormData({ ...formData, perfilPsicologico: e.target.value })}
                      placeholder="Descreva o perfil psicológico do jurado..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-zinc-500">Tendência</span>
                    <div className="mt-1">
                      {jurado.perfilTendencia ? (
                        <Badge 
                          variant="outline"
                          className={
                            jurado.perfilTendencia === "absolutorio" ? "text-emerald-600 border-emerald-300" :
                            jurado.perfilTendencia === "condenatorio" ? "text-rose-600 border-rose-300" :
                            "text-zinc-600 border-zinc-300"
                          }
                        >
                          {jurado.perfilTendencia === "absolutorio" ? "Absolutório" :
                           jurado.perfilTendencia === "condenatorio" ? "Condenatório" :
                           jurado.perfilTendencia === "neutro" ? "Neutro" : "Desconhecido"}
                        </Badge>
                      ) : (
                        <span className="text-sm text-zinc-500">—</span>
                      )}
                    </div>
                  </div>
                  {jurado.perfilPsicologico && (
                    <div>
                      <span className="text-sm text-zinc-500">Perfil Psicológico</span>
                      <p className="text-sm mt-1">{jurado.perfilPsicologico}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Observações */}
        <Card className="dark:bg-zinc-900/80 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Observações e Anotações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Adicione observações sobre o jurado, comportamentos em sessões anteriores, etc..."
                rows={5}
              />
            ) : (
              <div className="text-sm">
                {jurado.observacoes ? (
                  <p className="whitespace-pre-wrap">{jurado.observacoes}</p>
                ) : (
                  <p className="text-zinc-500 italic">Nenhuma observação registrada. Clique em &quot;Editar&quot; para adicionar.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadados */}
        <div className="text-xs text-zinc-400 flex items-center gap-4">
          <span>Criado em: {new Date(jurado.createdAt).toLocaleDateString("pt-BR")}</span>
          <span>Atualizado em: {new Date(jurado.updatedAt).toLocaleDateString("pt-BR")}</span>
        </div>
      </div>
    </div>
  );
}
