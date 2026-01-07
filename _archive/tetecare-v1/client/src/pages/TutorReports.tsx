import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TutorReports() {
  const [selectedPet, setSelectedPet] = useState<string>("");
  const [reportType, setReportType] = useState<string>("");
  const [period, setPeriod] = useState<string>("30");

  const { data: pets } = trpc.pets.listMine.useQuery();

  const handleGenerate = () => {
    if (!selectedPet || !reportType) {
      toast.error("Selecione um pet e o tipo de relatório");
      return;
    }

    // Simulação de geração de relatório
    toast.success("Funcionalidade de relatórios em desenvolvimento");
  };

  const reportTypes = [
    {
      value: "behavior",
      label: "Comportamento",
      description: "Análise de humor, atividades e padrões comportamentais",
    },
    {
      value: "health",
      label: "Saúde",
      description: "Histórico de vacinas, medicamentos e evolução de peso",
    },
    {
      value: "financial",
      label: "Financeiro",
      description: "Consumo de créditos e histórico de pagamentos",
    },
  ];

  return (
    <TutorLayout>
      <div className="container max-w-7xl py-8 space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-2">
            Gere relatórios personalizados sobre seus pets
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulário de Geração */}
          <Card>
            <CardHeader>
              <CardTitle>Gerar Relatório</CardTitle>
              <CardDescription>
                Selecione as opções para gerar seu relatório em PDF
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Pet</label>
                <Select value={selectedPet} onValueChange={setSelectedPet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets?.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id.toString()}>
                        {pet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Relatório</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 3 meses</SelectItem>
                    <SelectItem value="180">Últimos 6 meses</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full" 
                onClick={handleGenerate}
              >
                <Download className="mr-2 h-4 w-4" />
                Gerar Relatório
              </Button>
            </CardContent>
          </Card>

          {/* Tipos de Relatório */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Tipos de Relatório</h2>
            {reportTypes.map((type) => (
              <Card key={type.value} className="hover-lift">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{type.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {type.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </TutorLayout>
  );
}
