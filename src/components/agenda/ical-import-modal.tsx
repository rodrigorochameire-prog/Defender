import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
  Clock,
  MapPin,
  Users,
} from "lucide-react";

interface ICalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (eventos: any[]) => void;
}

export function ICalImportModal({
  isOpen,
  onClose,
  onImport,
}: ICalImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedEvents, setImportedEvents] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");

  const parseICalendar = (icsContent: string) => {
    const events: any[] = [];
    const lines = icsContent.split(/\r\n|\n|\r/);
    
    let currentEvent: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === "BEGIN:VEVENT") {
        currentEvent = {
          titulo: "",
          tipo: "audiencia",
          data: "",
          horarioInicio: "",
          horarioFim: "",
          local: "",
          assistido: "",
          processo: "",
          atribuicao: "Criminal Geral",
          status: "confirmado",
          descricao: "",
          prioridade: "media",
          recorrencia: "nenhuma",
          lembretes: ["1d"],
          tags: [],
          participantes: [],
          observacoes: "",
          documentos: [],
        };
      } else if (line === "END:VEVENT" && currentEvent) {
        if (currentEvent.titulo && currentEvent.data) {
          events.push({ ...currentEvent });
        }
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith("SUMMARY:")) {
          currentEvent.titulo = line.substring(8).trim();
          
          // Detectar tipo baseado no título
          const tituloLower = currentEvent.titulo.toLowerCase();
          if (tituloLower.includes("audiência") || tituloLower.includes("audiencia")) {
            currentEvent.tipo = "audiencia";
          } else if (tituloLower.includes("prazo")) {
            currentEvent.tipo = "prazo";
          } else if (tituloLower.includes("reunião") || tituloLower.includes("reuniao")) {
            currentEvent.tipo = "reuniao";
          } else if (tituloLower.includes("atendimento")) {
            currentEvent.tipo = "atendimento";
          }
          
          // Detectar atribuição
          if (tituloLower.includes("júri") || tituloLower.includes("juri")) {
            currentEvent.atribuicao = "Tribunal do Júri";
            currentEvent.tags.push("Júri");
          } else if (tituloLower.includes("maria da penha") || tituloLower.includes("violência doméstica")) {
            currentEvent.atribuicao = "Violência Doméstica";
            currentEvent.tags.push("Violência Doméstica");
          } else if (tituloLower.includes("execução") || tituloLower.includes("execucao")) {
            currentEvent.atribuicao = "Execução Penal";
            currentEvent.tags.push("Execução");
          }
        } else if (line.startsWith("DESCRIPTION:")) {
          currentEvent.descricao = line.substring(12).trim();
          currentEvent.observacoes = currentEvent.descricao;
        } else if (line.startsWith("LOCATION:")) {
          currentEvent.local = line.substring(9).trim();
        } else if (line.startsWith("DTSTART")) {
          const dateMatch = line.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
          if (dateMatch) {
            const [_, year, month, day, hour, minute] = dateMatch;
            currentEvent.data = `${year}-${month}-${day}`;
            if (hour && minute) {
              currentEvent.horarioInicio = `${hour}:${minute}`;
            }
          }
        } else if (line.startsWith("DTEND")) {
          const dateMatch = line.match(/(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
          if (dateMatch) {
            const [_, year, month, day, hour, minute] = dateMatch;
            if (hour && minute) {
              currentEvent.horarioFim = `${hour}:${minute}`;
            }
          }
        } else if (line.startsWith("ATTENDEE")) {
          const nameMatch = line.match(/CN=([^;:]+)/);
          if (nameMatch) {
            currentEvent.participantes.push(nameMatch[1]);
          }
        }
      }
    }
    
    return events;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".ics") && !file.name.endsWith(".ical")) {
      toast.error("Por favor, selecione um arquivo .ics ou .ical");
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const events = parseICalendar(text);
      
      if (events.length === 0) {
        toast.error("Nenhum evento encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      setImportedEvents(events);
      toast.success(`${events.length} eventos encontrados!`);
    } catch (error) {
      toast.error("Erro ao processar arquivo iCalendar");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    onImport(importedEvents);
    toast.success(`${importedEvents.length} eventos importados!`);
    onClose();
    setImportedEvents([]);
    setFileName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50 dark:from-zinc-900 dark:to-zinc-950">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            Importar Arquivo iCalendar
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Importe eventos de arquivos .ics ou .ical (Google Calendar, Outlook, Apple Calendar)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Upload Area */}
          <Card className="border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-8">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".ics,.ical"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isProcessing}
              />
              
              <div className="flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center">
                  {isProcessing ? (
                    <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <Upload className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
                
                <div className="text-center">
                  <p className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-1">
                    {isProcessing ? "Processando..." : "Clique para selecionar arquivo"}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Arquivos .ics ou .ical de qualquer aplicativo de calendário
                  </p>
                  {fileName && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-semibold">
                      📄 {fileName}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Escolher Arquivo
                </Button>
              </div>
            </label>
          </Card>

          {/* Instruções */}
          <Card className="p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 border-cyan-200 dark:border-cyan-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-cyan-900 dark:text-cyan-100 mb-2">
                  Como exportar seu calendário:
                </p>
                <ul className="text-xs text-cyan-800 dark:text-cyan-200 space-y-1.5">
                  <li>
                    <strong>Google Calendar:</strong> Configurações → Importar e exportar → Exportar
                  </li>
                  <li>
                    <strong>Outlook:</strong> Arquivo → Salvar calendário → Salvar como iCalendar
                  </li>
                  <li>
                    <strong>Apple Calendar:</strong> Arquivo → Exportar → Exportar calendário
                  </li>
                  <li>
                    <strong>PJe:</strong> Acesse a agenda e exporte em formato iCalendar
                  </li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Preview dos Eventos */}
          {importedEvents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                  Eventos Encontrados ({importedEvents.length})
                </h3>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Pronto para importar
                  </span>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {importedEvents.map((evento, index) => (
                  <Card
                    key={index}
                    className="p-4 border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          evento.tipo === "audiencia"
                            ? "bg-yellow-100 dark:bg-yellow-900/30"
                            : evento.tipo === "reuniao"
                            ? "bg-purple-100 dark:bg-purple-900/30"
                            : evento.tipo === "prazo"
                            ? "bg-red-100 dark:bg-red-900/30"
                            : "bg-blue-100 dark:bg-blue-900/30"
                        }`}
                      >
                        {evento.tipo === "audiencia" ? (
                          <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        ) : evento.tipo === "reuniao" ? (
                          <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        ) : evento.tipo === "prazo" ? (
                          <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                          {evento.titulo}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {new Date(evento.data).toLocaleDateString("pt-BR")}
                              {evento.horarioInicio && ` às ${evento.horarioInicio}`}
                            </span>
                          </div>

                          {evento.local && (
                            <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{evento.local}</span>
                            </div>
                          )}
                        </div>

                        {evento.tags && evento.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {evento.tags.map((tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 rounded-full text-xs font-semibold"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Estatísticas */}
              <Card className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      {importedEvents.filter((e) => e.tipo === "audiencia").length} audiências ·{" "}
                      {importedEvents.filter((e) => e.tipo === "reuniao").length} reuniões ·{" "}
                      {importedEvents.filter((e) => e.tipo === "prazo").length} prazos ·{" "}
                      {importedEvents.filter((e) => e.tipo === "atendimento").length} atendimentos
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      Todos os eventos serão importados para sua agenda
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {importedEvents.length > 0 && (
            <Button
              onClick={handleImport}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Importar {importedEvents.length} Eventos
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}