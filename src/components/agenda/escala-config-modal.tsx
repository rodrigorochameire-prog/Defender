import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CustomSelect } from "@/components/CustomSelect";
import { toast } from "sonner";
import {
  Users,
  Calendar,
  CheckCircle2,
  Gavel,
  Home,
  Lock,
  Folder,
  RefreshCw,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { format, addMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Defensor {
  id: string;
  nome: string;
  email: string;
  cor: string;
}

interface EscalaItem {
  mes: string; // YYYY-MM
  atribuicoes: {
    [atribuicao: string]: string; // atribuicao -> defensorId
  };
}

interface EscalaConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { defensores: Defensor[]; escalas: EscalaItem[] }) => void;
  currentConfig?: {
    defensores: Defensor[];
    escalas: EscalaItem[];
  };
}

const atribuicoes = [
  { value: "tribunal-do-juri", label: "Tribunal do Júri", icon: Gavel, color: "text-green-600" },
  { value: "violencia-domestica", label: "Violência Doméstica", icon: Home, color: "text-yellow-600" },
  { value: "execucao-penal", label: "Execução Penal", icon: Lock, color: "text-blue-600" },
  { value: "criminal-geral", label: "Criminal Geral", icon: Folder, color: "text-red-600" },
];

const cores = [
  { value: "#3B82F6", label: "Azul" },
  { value: "#10B981", label: "Verde" },
  { value: "#8B5CF6", label: "Roxo" },
  { value: "#F59E0B", label: "Amarelo" },
  { value: "#EF4444", label: "Vermelho" },
  { value: "#EC4899", label: "Rosa" },
];

export function EscalaConfigModal({ isOpen, onClose, onSave, currentConfig }: EscalaConfigModalProps) {
  const [defensores, setDefensores] = useState<Defensor[]>(
    currentConfig?.defensores || [
      {
        id: "def-1",
        nome: "Dr. Rodrigo",
        email: "",
        cor: "#3B82F6",
      },
      {
        id: "def-2",
        nome: "Dra. Juliane",
        email: "",
        cor: "#10B981",
      },
    ]
  );

  const [escalas, setEscalas] = useState<EscalaItem[]>(
    currentConfig?.escalas && currentConfig.escalas.length > 0
      ? currentConfig.escalas
      : generateDefaultEscalas()
  );

  const [selectedMonth, setSelectedMonth] = useState(0); // Índice do mês selecionado
  const [novoDefensorNome, setNovoDefensorNome] = useState("");
  const [novoDefensorCor, setNovoDefensorCor] = useState("#3B82F6");

  function generateDefaultEscalas(): EscalaItem[] {
    const today = new Date();
    const items: EscalaItem[] = [];

    for (let i = 0; i < 12; i++) {
      const mes = format(addMonths(today, i), "yyyy-MM");
      const isEven = i % 2 === 0;

      items.push({
        mes,
        atribuicoes: {
          "tribunal-do-juri": isEven ? "def-1" : "def-2",
          "violencia-domestica": isEven ? "def-2" : "def-1",
          "execucao-penal": isEven ? "def-1" : "def-2",
          "criminal-geral": "def-1",
        },
      });
    }

    return items;
  }

  const handleAddDefensor = () => {
    if (!novoDefensorNome.trim()) {
      toast.error("Nome do defensor é obrigatório");
      return;
    }

    const novoDefensor: Defensor = {
      id: `def-${Date.now()}`,
      nome: novoDefensorNome.trim(),
      email: "",
      cor: novoDefensorCor,
    };

    setDefensores([...defensores, novoDefensor]);
    setNovoDefensorNome("");
    toast.success("Defensor adicionado!");
  };

  const handleRemoveDefensor = (id: string) => {
    if (defensores.length <= 1) {
      toast.error("É necessário pelo menos um defensor");
      return;
    }

    if (confirm("Deseja remover este defensor?")) {
      setDefensores(defensores.filter((d) => d.id !== id));
      toast.success("Defensor removido!");
    }
  };

  const handleChangeAtribuicao = (mes: string, atribuicao: string, defensorId: string) => {
    setEscalas((prev) =>
      prev.map((escala) =>
        escala.mes === mes
          ? {
              ...escala,
              atribuicoes: {
                ...escala.atribuicoes,
                [atribuicao]: defensorId,
              },
            }
          : escala
      )
    );
  };

  const handleInverterEscala = (mes: string) => {
    const escala = escalas.find((e) => e.mes === mes);
    if (!escala || defensores.length < 2) return;

    const [def1, def2] = defensores;
    const novasAtribuicoes: { [key: string]: string } = {};

    Object.entries(escala.atribuicoes).forEach(([atrib, defensorId]) => {
      novasAtribuicoes[atrib] = defensorId === def1.id ? def2.id : def1.id;
    });

    setEscalas((prev) =>
      prev.map((e) =>
        e.mes === mes ? { ...e, atribuicoes: novasAtribuicoes } : e
      )
    );

    toast.success("Escala invertida!");
  };

  const handleReplicarEscala = (mes: string) => {
    const escala = escalas.find((e) => e.mes === mes);
    if (!escala) return;

    const mesIndex = escalas.findIndex((e) => e.mes === mes);
    if (mesIndex === escalas.length - 1) {
      toast.error("Esta é a última escala");
      return;
    }

    const proximoMes = escalas[mesIndex + 1].mes;
    setEscalas((prev) =>
      prev.map((e) =>
        e.mes === proximoMes ? { ...e, atribuicoes: { ...escala.atribuicoes } } : e
      )
    );

    toast.success("Escala replicada para o próximo mês!");
  };

  const handleSave = () => {
    onSave({ defensores, escalas });
    toast.success("Configuração de escalas salva!");
    onClose();
  };

  const currentEscala = escalas[selectedMonth];
  const currentMesDate = startOfMonth(new Date(currentEscala.mes + "-01"));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900">
        {/* Header Profissional */}
        <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500" />
            </div>
            Configuração de Escalas
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
            Gerencie os defensores e defina as escalas mensais por atribuição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seção Defensores - Layout Profissional */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Defensores ({defensores.length})
              </h3>
            </div>

            {/* Grid de Defensores */}
            <div className="grid grid-cols-2 gap-2.5">
              {defensores.map((defensor) => (
                <div
                  key={defensor.id}
                  className="group flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-sm"
                      style={{ backgroundColor: defensor.cor }}
                    >
                      {defensor.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{defensor.nome}</p>
                    </div>
                  </div>
                  {defensores.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDefensor(defensor.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all text-xs h-7 px-2"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Form Adicionar Defensor - Compacto */}
            <div className="flex items-center gap-2.5 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
              <input
                type="text"
                value={novoDefensorNome}
                onChange={(e) => setNovoDefensorNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDefensor();
                  }
                }}
                placeholder="Nome do defensor"
                className="flex-1 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-1">
                {cores.map((cor) => (
                  <button
                    key={cor.value}
                    onClick={() => setNovoDefensorCor(cor.value)}
                    className={`w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 ${
                      novoDefensorCor === cor.value
                        ? "border-zinc-900 dark:border-zinc-100 scale-110"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                    style={{ backgroundColor: cor.value }}
                    title={cor.label}
                  />
                ))}
              </div>
              <Button onClick={handleAddDefensor} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs">
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>

          {/* Divisor */}
          <div className="border-t border-zinc-200 dark:border-zinc-800" />

          {/* Seção Escalas - Layout Profissional */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Escalas Mensais
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReplicarEscala(currentEscala.mes)}
                  disabled={selectedMonth === escalas.length - 1}
                  className="text-xs h-7 px-2.5"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Replicar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleInverterEscala(currentEscala.mes)}
                  disabled={defensores.length < 2}
                  className="text-xs h-7 px-2.5"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Inverter
                </Button>
              </div>
            </div>

            {/* Seletor de Mês - Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
              {escalas.map((escala, index) => {
                const mesDate = startOfMonth(new Date(escala.mes + "-01"));
                const isSelected = selectedMonth === index;

                return (
                  <button
                    key={escala.mes}
                    onClick={() => setSelectedMonth(index)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {format(mesDate, "MMM/yyyy", { locale: ptBR })}
                  </button>
                );
              })}
            </div>

            {/* Grid de Atribuições - Mais Limpo */}
            <div className="space-y-2">
              {atribuicoes.map((atrib) => {
                const Icon = atrib.icon;
                const defensorId = currentEscala.atribuicoes[atrib.value];
                const defensor = defensores.find((d) => d.id === defensorId);

                return (
                  <div
                    key={atrib.value}
                    className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-[180px]">
                      <div className={`w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${atrib.color}`} />
                      </div>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50 text-sm">
                        {atrib.label}
                      </span>
                    </div>

                    <div className="min-w-[200px]">
                      <CustomSelect
                        options={defensores.map((d) => ({
                          value: d.id,
                          label: d.nome,
                          icon: Users,
                        }))}
                        value={defensorId || ""}
                        onChange={(value) =>
                          handleChangeAtribuicao(currentEscala.mes, atrib.value, value)
                        }
                        placeholder="Selecione"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer - Botões de Ação */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Escalas aplicadas automaticamente aos eventos
          </p>
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={onClose} className="px-5 h-9 text-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 h-9 text-sm">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Salvar Configuração
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}