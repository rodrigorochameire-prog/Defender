"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, User, Scale, FileText, MapPin, Save, X, Sparkles, Info, ChevronDown, Check, Calendar, Clock, Loader2 } from "lucide-react";
import { calcularPrazoPorAto, obterDiasPrazoPorAto } from "@/lib/prazo-calculator";
import { SITUACAO_PRISIONAL_OPTIONS } from "@/config/templates";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { TIPO_PROCESSO_OPTIONS } from "@/config/tipos-processo";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

export interface DemandaFormData {
  id?: string;
  assistido: string;
  assistidoId?: number | null; // setado quando o usuário escolhe um assistido existente no autocomplete; null = novo cadastro pelo nome
  status: string;
  data: string;
  prazo: string;
  processos: Array<{ tipo: string; numero: string }>;
  ato: string;
  providencias: string;
  atribuicao: string;
  reuPreso?: boolean;
  estadoPrisional?: string;
}

interface DemandaCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DemandaFormData) => void;
  initialData?: DemandaFormData;
  assistidosOptions: Array<{ value: string; label: string }>;
  atribuicaoOptions: Array<{ value: string; label: string; icon?: any }>;
  atoOptions: Array<{ value: string; label: string; icon?: any }>;
  statusOptions: Array<{ value: string; label: string; icon?: any }>;
  mode?: "create" | "edit";
}

// Select customizado elegante
function SimpleSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Selecione...",
  icon
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: Array<{ value: string; label: string }>; 
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  
  const hasValue = value && value !== "";
  const selectedOption = options.find(opt => opt.value === value);

  // Calcular posição do dropdown
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Abrir/fechar dropdown
  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Selecionar opção
  const selectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "w-full h-9 text-xs bg-white dark:bg-neutral-900 border rounded-lg cursor-pointer transition-all duration-150 text-left relative flex items-center",
          "border-neutral-200/60 dark:border-neutral-800/60",
          "hover:border-neutral-300/80 dark:hover:border-neutral-700/80",
          "focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600",
          isOpen && "border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-500/30",
          icon ? "pl-9 pr-8" : "pl-3 pr-8"
        )}
      >
        {/* Ícone opcional à esquerda */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400">
            {icon}
          </div>
        )}
        
        <span className={cn(
          "block truncate",
          hasValue ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-400 dark:text-neutral-500"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        {/* Indicador + Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {hasValue && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-neutral-400 transition-transform duration-200",
            isOpen && "rotate-180 text-emerald-500"
          )} />
        </div>
      </button>

      {/* Dropdown Portal */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            zIndex: 999999,
          }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="max-h-[220px] overflow-y-auto py-1">
            {options.map((opt, index) => (
              <button
                key={opt.value}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectOption(opt.value);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors",
                  "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                  value === opt.value 
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-medium" 
                    : "text-neutral-700 dark:text-neutral-300"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Autocomplete do assistido — busca ao vivo no cadastro (searchAssistidos).
// Selecionar um resultado vincula pelo id (sem duplicar); digitar livre limpa
// o vínculo e cai no cadastro por nome. Dropdown fixed com z-index acima do modal.
function AssistidoAutocomplete({
  value,
  valueId,
  onSelect,
  onTextChange,
}: {
  value: string;
  valueId?: number | null;
  onSelect: (id: number, nome: string) => void;
  onTextChange: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState(value);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  const { data: results = [], isFetching } = trpc.demandas.searchAssistidos.useQuery(
    { search: debounced },
    { enabled: open && debounced.length >= 2 },
  );

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapRef.current && !wrapRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const reposition = () => updatePosition();
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const trimmed = value.trim();
  const exactMatch = results.some((r) => r.nome.trim().toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length >= 2 && !exactMatch;
  const showDropdown = open && trimmed.length >= 2;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onTextChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            updatePosition();
            setOpen(true);
          }}
          placeholder="Digite o nome ou CPF — buscamos no cadastro"
          autoComplete="off"
          className="h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 pr-8 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
          {isFetching ? (
            <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />
          ) : valueId ? (
            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : null}
        </div>
      </div>
      {valueId ? (
        <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          Vinculado a assistido já cadastrado.
        </p>
      ) : trimmed.length >= 2 ? (
        <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-500">
          Novo cadastro — escolha na lista se já existir.
        </p>
      ) : null}

      {showDropdown && (
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: position.top, left: position.left, width: position.width, zIndex: 999999 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="max-h-[240px] overflow-y-auto py-1">
            {isFetching && results.length === 0 && (
              <div className="px-4 py-2.5 text-xs text-neutral-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
              </div>
            )}
            {!isFetching && results.length === 0 && (
              <div className="px-4 py-2.5 text-xs text-neutral-400">Nenhum assistido encontrado.</div>
            )}
            {results.map((a) => {
              const isSel = valueId === a.id;
              const preso = a.statusPrisional && a.statusPrisional !== "SOLTO";
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(a.id, a.nome);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors",
                    "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
                    isSel ? "bg-emerald-50 dark:bg-emerald-950/30" : "",
                  )}
                >
                  <span className="flex-1 truncate text-neutral-700 dark:text-neutral-200">{a.nome}</span>
                  {a.cpf && <span className="text-[10px] text-neutral-400 font-mono shrink-0">{a.cpf}</span>}
                  {preso && (
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 shrink-0">
                      PRESO
                    </span>
                  )}
                  {isSel && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                </button>
              );
            })}
            {showCreate && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onTextChange(trimmed);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-neutral-600 dark:text-neutral-300">
                  Criar novo: <strong className="text-neutral-800 dark:text-neutral-100">{trimmed}</strong>
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DemandaCreateModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  atribuicaoOptions,
  statusOptions,
  mode = "create",
}: DemandaCreateModalProps) {
  const [formData, setFormData] = useState<DemandaFormData>(
    initialData || {
      assistido: "",
      assistidoId: null,
      status: "triagem",
      data: "", // data de expedição — opcional; preencher só quando for intimação
      prazo: "",
      processos: [{ tipo: "AP", numero: "" }],
      ato: "",
      providencias: "",
      // Default vazio — o backend exige uma das atribuições mapeadas
      // ("Tribunal do Júri", "Violência Doméstica", etc.). "Criminal Geral"
      // (default antigo) não existe no enum → Postgres rejeitava e a demanda
      // não persistia. Validação client-side exige seleção antes do submit.
      atribuicao: "",
      estadoPrisional: "Solto",
    }
  );

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // Bloquear scroll do body
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assistido.trim()) {
      alert("Informe o nome do assistido.");
      return;
    }
    if (!formData.atribuicao) {
      alert("Selecione uma atribuição.");
      return;
    }
    onSave(formData);
    // Não fecha aqui — o parent fecha no onSuccess da mutation (evita
    // fechar o modal quando o backend rejeita o payload).
  };

  const addProcesso = () => {
    setFormData({
      ...formData,
      processos: [...formData.processos, { tipo: "AP", numero: "" }],
    });
  };

  const removeProcesso = (index: number) => {
    setFormData({
      ...formData,
      processos: formData.processos.filter((_, i) => i !== index),
    });
  };

  const updateProcesso = (index: number, field: "tipo" | "numero", value: string) => {
    const newProcessos = [...formData.processos];
    newProcessos[index][field] = value;
    setFormData({ ...formData, processos: newProcessos });
  };

  const handleAtoChange = (value: string) => {
    const novoFormData = { ...formData, ato: value };
    
    if (formData.data && value) {
      const dataExpedicao = new Date(formData.data);
      const prazoCalculado = calcularPrazoPorAto(dataExpedicao, value);
      
      if (prazoCalculado) {
        novoFormData.prazo = prazoCalculado;
      }
    }
    
    setFormData(novoFormData);
  };

  const handleDataChange = (novaData: string) => {
    const novoFormData = { ...formData, data: novaData };
    
    if (formData.ato && novaData) {
      const dataExpedicao = new Date(novaData);
      const prazoCalculado = calcularPrazoPorAto(dataExpedicao, formData.ato);
      
      if (prazoCalculado) {
        novoFormData.prazo = prazoCalculado;
      }
    }
    
    setFormData(novoFormData);
  };

  const handleAtribuicaoChange = (value: string) => {
    setFormData({ ...formData, atribuicao: value, ato: "" });
  };

  // Filtrar atos
  const filteredAtoOptions = useMemo(() => {
    const atribuicao = formData.atribuicao;
    if (atribuicao) {
      const atos = getAtosPorAtribuicao(atribuicao);
      if (atos.length <= 1) {
        return getAtosPorAtribuicao("Criminal Geral");
      }
      return atos;
    }
    return getAtosPorAtribuicao("Criminal Geral");
  }, [formData.atribuicao]);

  const tipoProcessoOptions = TIPO_PROCESSO_OPTIONS;

  const estadoPrisionalOptions = SITUACAO_PRISIONAL_OPTIONS.map(opt => ({ value: opt, label: opt }));

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay escuro */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 99998,
        }}
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        {/* Modal box */}
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="dark:bg-neutral-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — Padrão Defender v5: header neutro, sem gradiente */}
          <div className="px-5 py-4 border-l-[4px] border-l-neutral-300 dark:border-l-neutral-600 border-b border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <FileText className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </div>
              <div>
                <h2 className="text-[13px] font-semibold text-foreground tracking-tight">
                  {mode === "edit" ? "Editar Demanda" : "Nova Demanda"}
                </h2>
                <p className="text-[10px] text-muted-foreground">Preencha os campos abaixo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              type="button"
              title="Fechar"
            >
              <X className="h-4 w-4 text-neutral-500" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">

              {/* Assistido */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <User className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  Nome do Assistido
                </Label>
                <AssistidoAutocomplete
                  value={formData.assistido}
                  valueId={formData.assistidoId ?? null}
                  onSelect={(id, nome) => setFormData({ ...formData, assistido: nome, assistidoId: id })}
                  onTextChange={(text) => setFormData({ ...formData, assistido: text, assistidoId: null })}
                />
              </div>

              {/* Grid: Atribuição e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    Atribuição
                  </Label>
                  <SimpleSelect
                    value={formData.atribuicao}
                    onChange={handleAtribuicaoChange}
                    options={atribuicaoOptions.filter(opt => opt.value !== "Todas")}
                    placeholder="Selecione..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    Status
                  </Label>
                  <SimpleSelect
                    value={formData.status}
                    onChange={(value) => setFormData({ ...formData, status: value })}
                    options={statusOptions}
                  />
                </div>
              </div>

              {/* Tipo de Ato */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  Tipo de Ato
                </Label>
                <SimpleSelect
                  value={formData.ato}
                  onChange={handleAtoChange}
                  options={filteredAtoOptions.filter(opt => opt.value !== "Todos")}
                  placeholder="Selecione o tipo (opcional)"
                />
              </div>

              {/* Estado Prisional */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  Situação Prisional
                </Label>
                <SimpleSelect
                  value={formData.estadoPrisional || "Solto"}
                  onChange={(value) => setFormData({ ...formData, estadoPrisional: value })}
                  options={estadoPrisionalOptions}
                />
              </div>

              {/* Grid: Data e Prazo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    Data de Expedição
                    <span className="text-[10px] font-normal text-neutral-400 dark:text-neutral-500">(opcional)</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => handleDataChange(e.target.value)}
                    placeholder="Se vier de intimação"
                    className="h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    Prazo
                  </Label>
                  <Input
                    value={formData.prazo}
                    onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="h-9 text-xs rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Prazo calculado */}
              {formData.ato && obterDiasPrazoPorAto(formData.ato) && formData.prazo && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-800 dark:text-emerald-200">
                      Prazo calculado: {formData.prazo}
                    </p>
                  </div>
                </div>
              )}

              {/* Processos */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                    Processos Vinculados
                  </Label>
                  <button
                    type="button"
                    onClick={addProcesso}
                    className="h-7 px-2.5 text-[10px] font-medium rounded-lg border border-neutral-200/80 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-150 cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-1.5">
                  {formData.processos.map((processo, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-neutral-50/50 dark:bg-neutral-800/30 rounded-lg border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60 transition-all duration-150 group"
                    >
                      <div className="w-24 flex-shrink-0">
                        <SimpleSelect
                          value={processo.tipo}
                          onChange={(value) => updateProcesso(index, "tipo", value)}
                          options={tipoProcessoOptions}
                        />
                      </div>
                      <Input
                        value={processo.numero}
                        onChange={(e) => updateProcesso(index, "numero", e.target.value)}
                        placeholder="0000000-00.0000.0.00.0000"
                        className="h-9 text-xs flex-1 rounded-lg border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-foreground/80 px-3 focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 transition-all font-mono tabular-nums"
                      />
                      {formData.processos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcesso(index)}
                          className="h-9 w-9 p-0 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Observação inicial — vai pro primeiro registro da timeline */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                  Observação inicial
                  <span className="text-[9px] font-normal text-neutral-400 dark:text-neutral-500 ml-1">(vira o primeiro registro)</span>
                </Label>
                <textarea
                  value={formData.providencias}
                  onChange={(e) => setFormData({ ...formData, providencias: e.target.value })}
                  placeholder="Anotação livre — providências necessárias, contexto, observações..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800/60 rounded-lg text-xs resize-none transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-400 dark:focus:border-emerald-600 placeholder:text-neutral-400"
                />
              </div>
            </div>

            {/* Footer — Padrão Defender v5: primary emerald-500 rounded-xl */}
            <div className="flex gap-2 px-5 py-3 border-t border-neutral-200/60 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-9 rounded-lg border border-neutral-200/80 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-150 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 h-9 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 text-[11px] font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                {mode === "edit" ? "Salvar Alterações" : "Criar Demanda"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
