"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const STATUS_PRISIONAL_OPTIONS = [
  { value: "SOLTO", label: "Solto" },
  { value: "CADEIA_PUBLICA", label: "Cadeia Publica" },
  { value: "PENITENCIARIA", label: "Penitenciaria" },
  { value: "COP", label: "COP" },
  { value: "HOSPITAL_CUSTODIA", label: "Hospital Custodia" },
  { value: "DOMICILIAR", label: "Prisao Domiciliar" },
  { value: "MONITORADO", label: "Monitoramento Eletronico" },
] as const;

const ATRIBUICAO_PRIMARIA_OPTIONS = [
  { value: "JURI_CAMACARI", label: "Tribunal do Juri" },
  { value: "VVD_CAMACARI", label: "Violencia Domestica" },
  { value: "EXECUCAO_PENAL", label: "Execucao Penal" },
  { value: "SUBSTITUICAO", label: "Substituicao Criminal" },
  { value: "SUBSTITUICAO_CIVEL", label: "Substituicao Nao Penal" },
  { value: "GRUPO_JURI", label: "Grupo Especial do Juri" },
] as const;

const PRESOS = [
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
] as const;

function isPreso(status: string | null | undefined): boolean {
  return PRESOS.includes(status as (typeof PRESOS)[number]);
}

export default function EditarAssistidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();

  // Load assistido data
  const {
    data: assistido,
    isLoading,
    isError,
  } = trpc.assistidos.getById.useQuery({ id: Number(id) });

  // Form state
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [nomeMae, setNomeMae] = useState("");
  const [nomePai, setNomePai] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [naturalidade, setNaturalidade] = useState("");
  const [nacionalidade, setNacionalidade] = useState("");
  const [statusPrisional, setStatusPrisional] = useState("SOLTO");
  const [localPrisao, setLocalPrisao] = useState("");
  const [unidadePrisional, setUnidadePrisional] = useState("");
  const [dataPrisao, setDataPrisao] = useState("");
  const [telefone, setTelefone] = useState("");
  const [telefoneContato, setTelefoneContato] = useState("");
  const [nomeContato, setNomeContato] = useState("");
  const [parentescoContato, setParentescoContato] = useState("");
  const [endereco, setEndereco] = useState("");
  const [email, setEmail] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [atribuicaoPrimaria, setAtribuicaoPrimaria] = useState("SUBSTITUICAO");

  // Pre-fill form when data loads
  useEffect(() => {
    if (!assistido) return;
    setNome(assistido.nome ?? "");
    setCpf(assistido.cpf ?? "");
    setRg(assistido.rg ?? "");
    setNomeMae(assistido.nomeMae ?? "");
    setNomePai(assistido.nomePai ?? "");
    setDataNascimento(assistido.dataNascimento ?? "");
    setNaturalidade(assistido.naturalidade ?? "");
    setNacionalidade(assistido.nacionalidade ?? "");
    setStatusPrisional(assistido.statusPrisional ?? "SOLTO");
    setLocalPrisao(assistido.localPrisao ?? "");
    setUnidadePrisional(assistido.unidadePrisional ?? "");
    setDataPrisao(assistido.dataPrisao ?? "");
    setTelefone(assistido.telefone ?? "");
    setTelefoneContato(assistido.telefoneContato ?? "");
    setNomeContato(assistido.nomeContato ?? "");
    setParentescoContato(assistido.parentescoContato ?? "");
    setEndereco(assistido.endereco ?? "");
    setObservacoes(assistido.observacoes ?? "");
    setAtribuicaoPrimaria(assistido.atribuicaoPrimaria ?? "SUBSTITUICAO");
  }, [assistido]);

  // Update mutation
  const updateAssistido = trpc.assistidos.update.useMutation({
    onSuccess: () => {
      utils.assistidos.getById.invalidate({ id: Number(id) });
      utils.assistidos.list.invalidate();
      toast.success("Assistido atualizado com sucesso!");
      router.push(`/admin/assistidos/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar assistido");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("O nome e obrigatorio");
      return;
    }

    updateAssistido.mutate({
      id: Number(id),
      nome: nome.trim(),
      cpf: cpf.trim() || undefined,
      rg: rg.trim() || undefined,
      nomeMae: nomeMae.trim() || undefined,
      nomePai: nomePai.trim() || undefined,
      dataNascimento: dataNascimento || undefined,
      naturalidade: naturalidade.trim() || undefined,
      nacionalidade: nacionalidade.trim() || undefined,
      statusPrisional: statusPrisional as any,
      localPrisao: localPrisao.trim() || undefined,
      unidadePrisional: unidadePrisional.trim() || undefined,
      dataPrisao: dataPrisao || undefined,
      telefone: telefone.trim() || undefined,
      telefoneContato: telefoneContato.trim() || undefined,
      nomeContato: nomeContato.trim() || undefined,
      parentescoContato: parentescoContato.trim() || undefined,
      endereco: endereco.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      atribuicaoPrimaria: atribuicaoPrimaria as any,
    });
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !assistido) {
    return (
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-8 text-center">
          <p className="text-neutral-500 dark:text-neutral-400">
            Assistido nao encontrado.
          </p>
          <Link href="/admin/assistidos">
            <Button variant="outline" className="mt-4">
              Voltar para lista
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const showPrisonFields = isPreso(statusPrisional);

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link href={`/admin/assistidos/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Editar Assistido
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {assistido.nome}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Dados Pessoais
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nome */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label
                htmlFor="nome"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nome Completo *
              </Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Nome completo do assistido"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* CPF */}
            <div className="space-y-1.5">
              <Label
                htmlFor="cpf"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                CPF
              </Label>
              <Input
                id="cpf"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="bg-neutral-100 dark:bg-neutral-800 font-mono"
              />
            </div>

            {/* RG */}
            <div className="space-y-1.5">
              <Label
                htmlFor="rg"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                RG
              </Label>
              <Input
                id="rg"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                placeholder="Numero do RG"
                className="bg-neutral-100 dark:bg-neutral-800 font-mono"
              />
            </div>

            {/* Nome Mae */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nomeMae"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nome da Mae
              </Label>
              <Input
                id="nomeMae"
                value={nomeMae}
                onChange={(e) => setNomeMae(e.target.value)}
                placeholder="Nome completo da mae"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Nome Pai */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nomePai"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nome do Pai
              </Label>
              <Input
                id="nomePai"
                value={nomePai}
                onChange={(e) => setNomePai(e.target.value)}
                placeholder="Nome completo do pai"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-1.5">
              <Label
                htmlFor="dataNascimento"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Data de Nascimento
              </Label>
              <Input
                id="dataNascimento"
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Naturalidade */}
            <div className="space-y-1.5">
              <Label
                htmlFor="naturalidade"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Naturalidade
              </Label>
              <Input
                id="naturalidade"
                value={naturalidade}
                onChange={(e) => setNaturalidade(e.target.value)}
                placeholder="Cidade/Estado de nascimento"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Nacionalidade */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nacionalidade"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nacionalidade
              </Label>
              <Input
                id="nacionalidade"
                value={nacionalidade}
                onChange={(e) => setNacionalidade(e.target.value)}
                placeholder="Brasileira"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Atribuicao Primaria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Atribuicao Primaria
              </Label>
              <Select
                value={atribuicaoPrimaria}
                onValueChange={setAtribuicaoPrimaria}
              >
                <SelectTrigger className="bg-neutral-100 dark:bg-neutral-800">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ATRIBUICAO_PRIMARIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Status Prisional */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Status Prisional
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Status Prisional
              </Label>
              <Select
                value={statusPrisional}
                onValueChange={setStatusPrisional}
              >
                <SelectTrigger className="bg-neutral-100 dark:bg-neutral-800">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_PRISIONAL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Spacer for grid alignment when prison fields are hidden */}
            {!showPrisonFields && <div />}

            {/* Prison-specific fields */}
            {showPrisonFields && (
              <>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="unidadePrisional"
                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    Unidade Prisional
                  </Label>
                  <Input
                    id="unidadePrisional"
                    value={unidadePrisional}
                    onChange={(e) => setUnidadePrisional(e.target.value)}
                    placeholder="Nome da unidade prisional"
                    className="bg-neutral-100 dark:bg-neutral-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="localPrisao"
                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    Local da Prisao
                  </Label>
                  <Input
                    id="localPrisao"
                    value={localPrisao}
                    onChange={(e) => setLocalPrisao(e.target.value)}
                    placeholder="Local onde foi preso"
                    className="bg-neutral-100 dark:bg-neutral-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="dataPrisao"
                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                  >
                    Data da Prisao
                  </Label>
                  <Input
                    id="dataPrisao"
                    type="date"
                    value={dataPrisao}
                    onChange={(e) => setDataPrisao(e.target.value)}
                    className="bg-neutral-100 dark:bg-neutral-800"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Contato */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Contato
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Telefone */}
            <div className="space-y-1.5">
              <Label
                htmlFor="telefone"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Telefone
              </Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Telefone Contato */}
            <div className="space-y-1.5">
              <Label
                htmlFor="telefoneContato"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Telefone de Contato (familiar)
              </Label>
              <Input
                id="telefoneContato"
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(e.target.value)}
                placeholder="(00) 00000-0000"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Nome Contato */}
            <div className="space-y-1.5">
              <Label
                htmlFor="nomeContato"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Nome do Contato
              </Label>
              <Input
                id="nomeContato"
                value={nomeContato}
                onChange={(e) => setNomeContato(e.target.value)}
                placeholder="Nome do familiar/contato"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Parentesco Contato */}
            <div className="space-y-1.5">
              <Label
                htmlFor="parentescoContato"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Parentesco do Contato
              </Label>
              <Input
                id="parentescoContato"
                value={parentescoContato}
                onChange={(e) => setParentescoContato(e.target.value)}
                placeholder="Ex: Mae, Esposa, Irmao"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>

            {/* Endereco */}
            <div className="sm:col-span-2 space-y-1.5">
              <Label
                htmlFor="endereco"
                className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Endereco
              </Label>
              <Input
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, numero, bairro, cidade"
                className="bg-neutral-100 dark:bg-neutral-800"
              />
            </div>
          </div>
        </div>

        {/* Observacoes */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Observacoes
          </h2>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Informacoes adicionais sobre o assistido..."
            rows={4}
            className="bg-neutral-100 dark:bg-neutral-800"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="ghost" type="button" asChild>
            <Link href={`/admin/assistidos/${id}`}>Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={updateAssistido.isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {updateAssistido.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Alteracoes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
