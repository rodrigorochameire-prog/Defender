"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scale,
  ArrowLeft,
  Save,
  Gavel,
  Loader2,
  AlertTriangle,
  MapPin,
  Search,
} from "lucide-react";

const AREA_OPTIONS = [
  { value: "JURI", label: "Tribunal do Juri" },
  { value: "EXECUCAO_PENAL", label: "Execucao Penal" },
  { value: "VIOLENCIA_DOMESTICA", label: "Violencia Domestica" },
  { value: "SUBSTITUICAO", label: "Substituicao" },
  { value: "CURADORIA", label: "Curadoria" },
  { value: "FAMILIA", label: "Familia" },
  { value: "CIVEL", label: "Civel" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Publica" },
];

const FASE_OPTIONS = [
  { value: "conhecimento", label: "Conhecimento" },
  { value: "recursal", label: "Recursal" },
  { value: "execucao", label: "Execucao" },
  { value: "arquivado", label: "Arquivado" },
];

const SITUACAO_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "suspenso", label: "Suspenso" },
  { value: "arquivado", label: "Arquivado" },
  { value: "baixado", label: "Baixado" },
];

interface FormData {
  numeroAutos: string;
  numeroAntigo: string;
  comarca: string;
  vara: string;
  area: string;
  classeProcessual: string;
  assunto: string;
  valorCausa: string;
  parteContraria: string;
  advogadoContrario: string;
  fase: string;
  situacao: string;
  isJuri: boolean;
  dataSessaoJuri: string;
  resultadoJuri: string;
  observacoes: string;
  linkDrive: string;
  localDoFatoEndereco: string;
  localDoFatoLat: string;
  localDoFatoLng: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function geocodificar(endereco: string): Promise<{ lat: string; lng: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1&countrycodes=br`;
    const res = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat).toFixed(7), lng: parseFloat(data[0].lon).toFixed(7) };
  } catch {
    return null;
  }
}

export default function EditarProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isGeocodificando, setIsGeocodificando] = useState(false);

  const { data: processo, isLoading, error } = trpc.processos.getById.useQuery(
    { id: Number(id) },
    { staleTime: 30_000 },
  );

  const updateMutation = trpc.processos.update.useMutation({
    onSuccess: () => {
      toast.success("Processo atualizado com sucesso");
      utils.processos.getById.invalidate({ id: Number(id) });
      utils.processos.list.invalidate();
      router.push(`/admin/processos/${id}`);
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const [formData, setFormData] = useState<FormData>({
    numeroAutos: "",
    numeroAntigo: "",
    comarca: "",
    vara: "",
    area: "JURI",
    classeProcessual: "",
    assunto: "",
    valorCausa: "",
    parteContraria: "",
    advogadoContrario: "",
    fase: "conhecimento",
    situacao: "ativo",
    isJuri: false,
    dataSessaoJuri: "",
    resultadoJuri: "",
    observacoes: "",
    linkDrive: "",
    localDoFatoEndereco: "",
    localDoFatoLat: "",
    localDoFatoLng: "",
  });

  // Pre-fill form when data loads
  useEffect(() => {
    if (!processo) return;

    setFormData({
      numeroAutos: processo.numeroAutos || "",
      numeroAntigo: processo.numeroAntigo || "",
      comarca: processo.comarca || "",
      vara: processo.vara || "",
      area: processo.area || "JURI",
      classeProcessual: processo.classeProcessual || "",
      assunto: processo.assunto || "",
      valorCausa: processo.valorCausa ? String(processo.valorCausa / 100) : "",
      parteContraria: processo.parteContraria || "",
      advogadoContrario: processo.advogadoContrario || "",
      fase: processo.fase || "conhecimento",
      situacao: processo.situacao || "ativo",
      isJuri: processo.isJuri ?? false,
      dataSessaoJuri: processo.dataSessaoJuri
        ? new Date(processo.dataSessaoJuri).toISOString().split("T")[0]
        : "",
      resultadoJuri: processo.resultadoJuri || "",
      observacoes: processo.observacoes || "",
      linkDrive: processo.linkDrive || "",
      localDoFatoEndereco: processo.localDoFatoEndereco || "",
      localDoFatoLat: processo.localDoFatoLat ? String(processo.localDoFatoLat) : "",
      localDoFatoLng: processo.localDoFatoLng ? String(processo.localDoFatoLng) : "",
    });
  }, [processo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    updateMutation.mutate({
      id: Number(id),
      numeroAutos: formData.numeroAutos,
      numeroAntigo: formData.numeroAntigo || null,
      comarca: formData.comarca || null,
      vara: formData.vara || null,
      area: formData.area as "JURI" | "EXECUCAO_PENAL" | "VIOLENCIA_DOMESTICA" | "SUBSTITUICAO" | "CURADORIA" | "FAMILIA" | "CIVEL" | "FAZENDA_PUBLICA",
      classeProcessual: formData.classeProcessual || null,
      assunto: formData.assunto || null,
      valorCausa: formData.valorCausa ? Math.round(parseFloat(formData.valorCausa) * 100) : null,
      parteContraria: formData.parteContraria || null,
      advogadoContrario: formData.advogadoContrario || null,
      fase: formData.fase || null,
      situacao: formData.situacao || null,
      isJuri: formData.isJuri,
      dataSessaoJuri: formData.dataSessaoJuri || null,
      resultadoJuri: formData.resultadoJuri || null,
      observacoes: formData.observacoes || null,
      linkDrive: formData.linkDrive || null,
      localDoFatoEndereco: formData.localDoFatoEndereco || null,
      localDoFatoLat: formData.localDoFatoLat || null,
      localDoFatoLng: formData.localDoFatoLng || null,
    });
  };

  const handleChange = (field: keyof FormData, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGeocodificar = async () => {
    if (!formData.localDoFatoEndereco.trim()) {
      toast.error("Informe o endereço antes de geocodificar");
      return;
    }
    setIsGeocodificando(true);
    const resultado = await geocodificar(formData.localDoFatoEndereco);
    setIsGeocodificando(false);
    if (!resultado) {
      toast.error("Endereço não encontrado. Tente um endereço mais específico.");
      return;
    }
    setFormData((prev) => ({ ...prev, localDoFatoLat: resultado.lat, localDoFatoLng: resultado.lng }));
    toast.success("Coordenadas encontradas!");
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !processo) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Processo nao encontrado</h2>
        <p className="text-muted-foreground text-sm">
          {error?.message || "O processo solicitado nao existe ou voce nao tem permissao para acessa-lo."}
        </p>
        <Link href="/admin/processos">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Processos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Link href={`/admin/processos/${id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="text-muted-foreground text-sm">Voltar para Detalhes</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              {formData.isJuri ? (
                <Gavel className="h-6 w-6 text-white" />
              ) : (
                <Scale className="h-6 w-6 text-white" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Editar Processo</h1>
              <p className="text-muted-foreground font-mono text-sm">{formData.numeroAutos}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados de Identificacao */}
        <Card>
          <CardHeader>
            <CardTitle>Identificacao do Processo</CardTitle>
            <CardDescription>Numero dos autos e informacoes de localizacao</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="numeroAutos">Numero dos Autos</Label>
                <Input
                  id="numeroAutos"
                  value={formData.numeroAutos}
                  readOnly
                  disabled
                  placeholder="0000000-00.0000.8.05.0000"
                  className="font-mono bg-neutral-50 dark:bg-neutral-800/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numeroAntigo">Numero Antigo</Label>
                <Input
                  id="numeroAntigo"
                  value={formData.numeroAntigo}
                  onChange={(e) => handleChange("numeroAntigo", e.target.value)}
                  placeholder="Numero antigo (se houver)"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="comarca">Comarca</Label>
                <Input
                  id="comarca"
                  value={formData.comarca}
                  onChange={(e) => handleChange("comarca", e.target.value)}
                  placeholder="Ex: Salvador"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vara">Vara</Label>
                <Input
                  id="vara"
                  value={formData.vara}
                  onChange={(e) => handleChange("vara", e.target.value)}
                  placeholder="Ex: 1a Vara Criminal"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do Processo */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Processo</CardTitle>
            <CardDescription>Classificacao e detalhes processuais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="area">Area *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => handleChange("area", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a area" />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classeProcessual">Classe Processual</Label>
                <Input
                  id="classeProcessual"
                  value={formData.classeProcessual}
                  onChange={(e) => handleChange("classeProcessual", e.target.value)}
                  placeholder="Ex: Acao Penal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assunto">Assunto</Label>
              <Input
                id="assunto"
                value={formData.assunto}
                onChange={(e) => handleChange("assunto", e.target.value)}
                placeholder="Ex: Homicidio Qualificado (Art. 121, par.2, CP)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fase">Fase</Label>
                <Select
                  value={formData.fase}
                  onValueChange={(value) => handleChange("fase", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {FASE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="situacao">Situacao</Label>
                <Select
                  value={formData.situacao}
                  onValueChange={(value) => handleChange("situacao", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situacao" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITUACAO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parteContraria">Parte Contraria</Label>
                <Input
                  id="parteContraria"
                  value={formData.parteContraria}
                  onChange={(e) => handleChange("parteContraria", e.target.value)}
                  placeholder="Ex: Ministerio Publico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advogadoContrario">Advogado Contrario</Label>
                <Input
                  id="advogadoContrario"
                  value={formData.advogadoContrario}
                  onChange={(e) => handleChange("advogadoContrario", e.target.value)}
                  placeholder="Nome do advogado (se houver)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorCausa">Valor da Causa</Label>
              <Input
                id="valorCausa"
                type="number"
                step="0.01"
                min="0"
                value={formData.valorCausa}
                onChange={(e) => handleChange("valorCausa", e.target.value)}
                placeholder="0,00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tribunal do Juri */}
        <Card className={formData.isJuri ? "border-purple-200 dark:border-purple-800/50" : ""}>
          <CardHeader className={formData.isJuri ? "bg-purple-50/50 dark:bg-purple-900/10" : ""}>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className={`flex items-center gap-2 ${formData.isJuri ? "text-purple-700 dark:text-purple-400" : ""}`}>
                  <Gavel className="h-5 w-5" />
                  Tribunal do Juri
                </CardTitle>
                <CardDescription>Configure se este e um processo do Juri</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="isJuri">Processo do Juri</Label>
                <Switch
                  id="isJuri"
                  checked={formData.isJuri}
                  onCheckedChange={(checked) => handleChange("isJuri", checked)}
                />
              </div>
            </div>
          </CardHeader>
          {formData.isJuri && (
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataSessaoJuri">Data da Sessao</Label>
                  <Input
                    id="dataSessaoJuri"
                    type="date"
                    value={formData.dataSessaoJuri}
                    onChange={(e) => handleChange("dataSessaoJuri", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resultadoJuri">Resultado</Label>
                  <Input
                    id="resultadoJuri"
                    value={formData.resultadoJuri}
                    onChange={(e) => handleChange("resultadoJuri", e.target.value)}
                    placeholder="Resultado do julgamento"
                  />
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Local do Fato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Local do Fato
            </CardTitle>
            <CardDescription>
              Endereço georreferenciado para exibição no mapa de casos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="localDoFatoEndereco">Endereço</Label>
              <div className="flex gap-2">
                <Input
                  id="localDoFatoEndereco"
                  value={formData.localDoFatoEndereco}
                  onChange={(e) => handleChange("localDoFatoEndereco", e.target.value)}
                  placeholder="Ex: Rua das Flores, 123, Centro, Camaçari - BA"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGeocodificar(); } }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeocodificar}
                  disabled={isGeocodificando}
                  className="shrink-0"
                  title="Buscar coordenadas via OpenStreetMap"
                >
                  {isGeocodificando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Pressione Enter ou clique na lupa para geocodificar automaticamente via OpenStreetMap.
              </p>
            </div>

            {(formData.localDoFatoLat || formData.localDoFatoLng) && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="localDoFatoLat">Latitude</Label>
                  <Input
                    id="localDoFatoLat"
                    value={formData.localDoFatoLat}
                    onChange={(e) => handleChange("localDoFatoLat", e.target.value)}
                    placeholder="-12.6976000"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localDoFatoLng">Longitude</Label>
                  <Input
                    id="localDoFatoLng"
                    value={formData.localDoFatoLng}
                    onChange={(e) => handleChange("localDoFatoLng", e.target.value)}
                    placeholder="-38.3244000"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            )}

            {formData.localDoFatoLat && formData.localDoFatoLng && (
              <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                <MapPin className="h-3 w-3" />
                <span>
                  Coordenadas prontas — este processo aparecerá no mapa após salvar.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Integracoes e Observacoes */}
        <Card>
          <CardHeader>
            <CardTitle>Integracoes e Observacoes</CardTitle>
            <CardDescription>Links externos e anotacoes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkDrive">Link da Pasta no Google Drive</Label>
              <Input
                id="linkDrive"
                type="url"
                value={formData.linkDrive}
                onChange={(e) => handleChange("linkDrive", e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observacoes</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => handleChange("observacoes", e.target.value)}
                placeholder="Anotacoes e observacoes sobre o processo..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Botoes de Acao */}
        <div className="flex items-center justify-end gap-4">
          <Link href={`/admin/processos/${id}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alteracoes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
