"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Save, Loader2, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";

const TRIBUNAIS = [
  { value: "STF", label: "Supremo Tribunal Federal" },
  { value: "STJ", label: "Superior Tribunal de Justiça" },
  { value: "TJBA", label: "Tribunal de Justiça da Bahia" },
  { value: "TRF1", label: "TRF da 1ª Região" },
  { value: "TRF2", label: "TRF da 2ª Região" },
  { value: "TRF3", label: "TRF da 3ª Região" },
  { value: "TRF4", label: "TRF da 4ª Região" },
  { value: "TRF5", label: "TRF da 5ª Região" },
  { value: "OUTRO", label: "Outro" },
];

const TIPOS_DECISAO = [
  { value: "ACORDAO", label: "Acórdão" },
  { value: "DECISAO_MONOCRATICA", label: "Decisão Monocrática" },
  { value: "SUMULA", label: "Súmula" },
  { value: "SUMULA_VINCULANTE", label: "Súmula Vinculante" },
  { value: "REPERCUSSAO_GERAL", label: "Repercussão Geral" },
  { value: "RECURSO_REPETITIVO", label: "Recurso Repetitivo" },
  { value: "INFORMATIVO", label: "Informativo" },
  { value: "OUTRO", label: "Outro" },
];

export default function NovoJulgadoPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tribunal: "",
    tipoDecisao: "",
    numeroProcesso: "",
    relator: "",
    orgaoJulgador: "",
    dataJulgamento: "",
    ementa: "",
    textoIntegral: "",
    temaId: "",
    fonte: "",
    urlOrigem: "",
  });

  // Mutations
  const createMutation = trpc.jurisprudencia.createJulgado.useMutation({
    onSuccess: (data) => {
      toast.success("Julgado criado com sucesso!");
      router.push(`/admin/jurisprudencia/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Erro ao criar julgado: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const processAIMutation = trpc.jurisprudencia.processarJulgadoIA.useMutation({
    onSuccess: () => {
      toast.success("Julgado processado com IA!");
    },
    onError: (error) => {
      toast.error(`Erro ao processar com IA: ${error.message}`);
    },
  });

  // Queries
  const { data: temas } = trpc.jurisprudencia.listTemas.useQuery({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tribunal || !formData.tipoDecisao) {
      toast.error("Preencha tribunal e tipo de decisão");
      return;
    }

    if (!formData.ementa && !formData.textoIntegral) {
      toast.error("Preencha pelo menos a ementa ou o texto integral");
      return;
    }

    setIsSubmitting(true);

    createMutation.mutate({
      tribunal: formData.tribunal as any,
      tipoDecisao: formData.tipoDecisao as any,
      numeroProcesso: formData.numeroProcesso || undefined,
      relator: formData.relator || undefined,
      orgaoJulgador: formData.orgaoJulgador || undefined,
      dataJulgamento: formData.dataJulgamento || undefined,
      ementa: formData.ementa || undefined,
      textoIntegral: formData.textoIntegral || undefined,
      temaId: formData.temaId ? parseInt(formData.temaId) : undefined,
      fonte: formData.fonte || undefined,
      urlOrigem: formData.urlOrigem || undefined,
    });
  };

  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setFormData((prev) => ({ ...prev, textoIntegral: text }));
        toast.success("Texto colado com sucesso!");
      }
    } catch {
      toast.error("Não foi possível acessar a área de transferência");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/jurisprudencia">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Novo Julgado</h1>
          <p className="text-muted-foreground">
            Adicione manualmente um julgado ao banco de jurisprudência
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tribunal */}
                <div className="space-y-2">
                  <Label htmlFor="tribunal">Tribunal *</Label>
                  <Select
                    value={formData.tribunal}
                    onValueChange={(v) => handleSelectChange("tribunal", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tribunal" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIBUNAIS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo de Decisão */}
                <div className="space-y-2">
                  <Label htmlFor="tipoDecisao">Tipo de Decisão *</Label>
                  <Select
                    value={formData.tipoDecisao}
                    onValueChange={(v) => handleSelectChange("tipoDecisao", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DECISAO.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Número do Processo */}
                <div className="space-y-2">
                  <Label htmlFor="numeroProcesso">Número do Processo</Label>
                  <Input
                    id="numeroProcesso"
                    name="numeroProcesso"
                    value={formData.numeroProcesso}
                    onChange={handleChange}
                    placeholder="Ex: HC 123456/SP"
                  />
                </div>

                {/* Relator */}
                <div className="space-y-2">
                  <Label htmlFor="relator">Relator</Label>
                  <Input
                    id="relator"
                    name="relator"
                    value={formData.relator}
                    onChange={handleChange}
                    placeholder="Min. Nome do Relator"
                  />
                </div>

                {/* Órgão Julgador */}
                <div className="space-y-2">
                  <Label htmlFor="orgaoJulgador">Órgão Julgador</Label>
                  <Input
                    id="orgaoJulgador"
                    name="orgaoJulgador"
                    value={formData.orgaoJulgador}
                    onChange={handleChange}
                    placeholder="Ex: 1ª Turma, Plenário"
                  />
                </div>

                {/* Data do Julgamento */}
                <div className="space-y-2">
                  <Label htmlFor="dataJulgamento">Data do Julgamento</Label>
                  <Input
                    id="dataJulgamento"
                    name="dataJulgamento"
                    type="date"
                    value={formData.dataJulgamento}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conteúdo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Ementa */}
              <div className="space-y-2">
                <Label htmlFor="ementa">Ementa</Label>
                <Textarea
                  id="ementa"
                  name="ementa"
                  value={formData.ementa}
                  onChange={handleChange}
                  placeholder="Cole a ementa do julgado aqui..."
                  rows={6}
                />
              </div>

              {/* Texto Integral */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="textoIntegral">Texto Integral</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePasteText}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Colar da Área de Transferência
                  </Button>
                </div>
                <Textarea
                  id="textoIntegral"
                  name="textoIntegral"
                  value={formData.textoIntegral}
                  onChange={handleChange}
                  placeholder="Cole o inteiro teor do julgado aqui..."
                  rows={12}
                />
              </div>
            </CardContent>
          </Card>

          {/* Categorização */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Categorização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tema */}
                <div className="space-y-2">
                  <Label htmlFor="temaId">Tema</Label>
                  <Select
                    value={formData.temaId}
                    onValueChange={(v) => handleSelectChange("temaId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tema (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {temas?.map((tema) => (
                        <SelectItem key={tema.id} value={tema.id.toString()}>
                          {tema.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fonte */}
                <div className="space-y-2">
                  <Label htmlFor="fonte">Fonte</Label>
                  <Input
                    id="fonte"
                    name="fonte"
                    value={formData.fonte}
                    onChange={handleChange}
                    placeholder="Ex: Site do STF, DJe"
                  />
                </div>

                {/* URL de Origem */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="urlOrigem">URL de Origem</Label>
                  <Input
                    id="urlOrigem"
                    name="urlOrigem"
                    type="url"
                    value={formData.urlOrigem}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex items-center justify-between">
            <Link href="/admin/jurisprudencia">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Julgado
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
