"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, User, Scale, FileText, MapPin, Save, X, Sparkles, Info, ChevronDown, Check } from "lucide-react";
import { calcularPrazoPorAto, obterDiasPrazoPorAto } from "@/lib/prazo-calculator";
import { SITUACAO_PRISIONAL_OPTIONS } from "@/config/templates";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { TIPO_PROCESSO_OPTIONS } from "@/config/tipos-processo";
import { cn } from "@/lib/utils";

export interface DemandaFormData {
  id?: string;
  assistido: string;
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
          "w-full h-11 text-sm bg-white dark:bg-zinc-900/80 border rounded-xl cursor-pointer transition-all duration-200 text-left relative flex items-center",
          "border-zinc-200 dark:border-zinc-700/80",
          "hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm hover:shadow-emerald-500/10",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
          isOpen && "border-emerald-500 ring-2 ring-emerald-500/20",
          icon ? "pl-10 pr-10" : "pl-4 pr-10"
        )}
      >
        {/* Ícone opcional à esquerda */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400">
            {icon}
          </div>
        )}
        
        <span className={cn(
          "block truncate",
          hasValue ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        {/* Indicador + Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {hasValue && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-zinc-400 transition-transform duration-200",
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
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
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
                    : "text-zinc-700 dark:text-zinc-300"
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
      status: "fila",
      data: new Date().toISOString().split("T")[0],
      prazo: "",
      processos: [{ tipo: "AP", numero: "" }],
      ato: "",
      providencias: "",
      atribuicao: "Criminal Geral",
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
    onSave(formData);
    onClose();
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
          className="dark:bg-zinc-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {mode === "edit" ? "Editar Demanda" : "Nova Demanda"}
                </h2>
                <p className="text-xs text-zinc-500">Preencha os campos abaixo</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              type="button"
            >
              <X className="h-5 w-5 text-zinc-500" />
            </button>
          </div>

          {/* Form Content - Scrollable */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Assistido */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-500" />
                  Nome do Assistido
                </Label>
                <Input
                  value={formData.assistido}
                  onChange={(e) => setFormData({ ...formData, assistido: e.target.value })}
                  placeholder="Nome completo do assistido"
                  className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Grid: Atribuição e Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" />
                    Atribuição
                  </Label>
                  <SimpleSelect
                    value={formData.atribuicao}
                    onChange={handleAtribuicaoChange}
                    options={atribuicaoOptions.filter(opt => opt.value !== "Todas")}
                    placeholder="Selecione..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Data de Expedição
                  </Label>
                  <Input
                    type="date"
                    value={formData.data}
                    onChange={(e) => handleDataChange(e.target.value)}
                    className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Prazo
                  </Label>
                  <Input
                    value={formData.prazo}
                    onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
                    placeholder="DD/MM/AAAA"
                    className="h-11 rounded-xl border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
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
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-500" />
                    Processos Vinculados
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProcesso}
                    className="h-8 px-3 text-xs rounded-lg border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-400"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Adicionar Processo
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.processos.map((processo, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-2 p-3 bg-gradient-to-r from-zinc-50 to-zinc-100/50 dark:from-zinc-800/60 dark:to-zinc-800/30 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group"
                    >
                      <div className="w-32 flex-shrink-0">
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
                        className="h-11 text-sm flex-1 font-mono tracking-wide rounded-xl border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      {formData.processos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcesso(index)}
                          className="h-11 w-11 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Providências */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  Providências / Observações
                </Label>
                <textarea
                  value={formData.providencias}
                  onChange={(e) => setFormData({ ...formData, providencias: e.target.value })}
                  placeholder="Descreva as providências necessárias, observações importantes ou anotações sobre a demanda..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-sm resize-none transition-all duration-200 hover:border-emerald-400 dark:hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-zinc-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium transition-all"
              >
                <X className="w-4 h-4 mr-2 opacity-60" />
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
              >
                <Save className="w-4 h-4 mr-2" />
                {mode === "edit" ? "Salvar Alterações" : "Criar Demanda"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
