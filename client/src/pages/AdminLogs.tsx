import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Home, Building2, Calendar, Download } from "lucide-react";
import { downloadCSV, formatLogsForExport } from "@/lib/exportUtils";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { toast } from "sonner";

export default function AdminLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPetId, setSelectedPetId] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: pets } = trpc.pets.list.useQuery();
  const { data: logs, isLoading } = trpc.logs.list.useQuery(
    selectedPetId !== "all" ? { petId: Number(selectedPetId) } : undefined
  );

  const filteredLogs = logs?.filter((log: any) => {
    // Busca por nome do pet
    const pet = pets?.find(p => p.id === log.petId);
    const matchesSearch = !searchQuery || 
      pet?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filtro por fonte
    const matchesSource = selectedSource === "all" || log.source === selectedSource;
    
    // Filtro por data
    const matchesDate = !dateFilter || 
      new Date(log.logDate).toISOString().split("T")[0] === dateFilter;
    
    return matchesSearch && matchesSource && matchesDate;
  });

  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case "feliz":
        return "😊";
      case "calmo":
        return "😌";
      case "ansioso":
        return "😰";
      case "triste":
        return "😢";
      case "agitado":
        return "😤";
      default:
        return "😐";
    }
  };

  const getStoolBadge = (stool?: string) => {
    switch (stool) {
      case "normal":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Normal</Badge>;
      case "diarreia":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Diarreia</Badge>;
      case "constipado":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Constipado</Badge>;
      case "nao_fez":
        return <Badge variant="outline">Não fez</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Logs Diários</h1>
            <p className="text-muted-foreground">
              Histórico completo de registros diários dos pets
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (!filteredLogs || filteredLogs.length === 0) {
                toast.error("Nenhum log para exportar");
                return;
              }
              downloadCSV(formatLogsForExport(filteredLogs, pets || []), `logs_${new Date().toISOString().split('T')[0]}`);
              toast.success("Logs exportados com sucesso!");
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <SearchAndFilter
              searchPlaceholder="Buscar por nome do pet..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={[
                {
                  label: "Pet",
                  value: selectedPetId,
                  options: [
                    { label: "Todos os pets", value: "all" },
                    ...(pets?.map(pet => ({
                      label: pet.name,
                      value: pet.id.toString()
                    })) || [])
                  ],
                  onChange: setSelectedPetId,
                },
                {
                  label: "Origem",
                  value: selectedSource,
                  options: [
                    { label: "Todos", value: "all" },
                    { label: "Casa", value: "home" },
                    { label: "Creche", value: "daycare" },
                  ],
                  onChange: setSelectedSource,
                },
              ]}
              onClearFilters={() => {
                setSearchQuery("");
                setSelectedPetId("all");
                setSelectedSource("all");
                setDateFilter("");
              }}
            />
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
                placeholder="Filtrar por data"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredLogs?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casa</CardTitle>
              <Home className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredLogs?.filter((l: any) => l.source === "home").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Creche</CardTitle>
              <Building2 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredLogs?.filter((l: any) => l.source === "daycare").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <Calendar className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredLogs?.filter((l: any) => {
                  const logDate = new Date(l.logDate).toDateString();
                  const today = new Date().toDateString();
                  return logDate === today;
                }).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs List */}
        <Card>
          <CardHeader>
            <CardTitle>Registros</CardTitle>
            <CardDescription>
              {filteredLogs?.length || 0} logs encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : !filteredLogs || filteredLogs.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-state-icon" />
                <p className="empty-state-title">Nenhum log encontrado</p>
                <p className="empty-state-description">
                  {selectedPetId || selectedSource !== "all" || dateFilter
                    ? "Tente ajustar os filtros"
                    : "Os logs diários aparecerão aqui"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log: any) => {
                  const pet = pets?.find((p) => p.id === log.petId);
                  return (
                    <div key={log.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{getMoodEmoji(log.mood || undefined)}</div>
                          <div>
                            <h3 className="font-semibold text-lg">{pet?.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {new Date(log.logDate).toLocaleDateString("pt-BR", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            log.source === "home"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-orange-50 text-orange-700 border-orange-200"
                          }
                        >
                          {log.source === "home" ? (
                            <>
                              <Home className="mr-1 h-3 w-3" />
                              Casa
                            </>
                          ) : (
                            <>
                              <Building2 className="mr-1 h-3 w-3" />
                              Creche
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {log.mood && (
                          <div>
                            <p className="text-muted-foreground">Humor</p>
                            <p className="font-medium capitalize">{log.mood}</p>
                          </div>
                        )}
                        {log.stool && (
                          <div>
                            <p className="text-muted-foreground mb-1">Fezes</p>
                            {getStoolBadge(log.stool)}
                          </div>
                        )}
                        {log.appetite && (
                          <div>
                            <p className="text-muted-foreground">Apetite</p>
                            <p className="font-medium capitalize">{log.appetite}</p>
                          </div>
                        )}
                        {log.foodConsumed && (
                          <div>
                            <p className="text-muted-foreground">Alimentação</p>
                            <p className="font-medium">{log.foodConsumed}</p>
                          </div>
                        )}
                      </div>

                      {log.behavior && (
                        <div className="p-3 bg-muted/30 rounded">
                          <p className="text-sm font-medium mb-1">Comportamento</p>
                          <p className="text-sm text-muted-foreground">{log.behavior}</p>
                        </div>
                      )}

                      {log.activities && (
                        <div className="p-3 bg-muted/30 rounded">
                          <p className="text-sm font-medium mb-1">Atividades</p>
                          <p className="text-sm text-muted-foreground">{log.activities}</p>
                        </div>
                      )}

                      {log.notes && (
                        <div className="p-3 bg-blue-50/50 border border-blue-200 rounded">
                          <p className="text-sm font-medium mb-1">Observações</p>
                          <p className="text-sm text-muted-foreground">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
