"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações de Demandas
          </DialogTitle>
          <DialogDescription>
            Personalize as configurações de exibição e comportamento das demandas.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h3 className="font-semibold mb-2">Personalização de Filtros</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Configure quais filtros devem aparecer por padrão e suas opções.
            </p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h3 className="font-semibold mb-2">Ordenação Padrão</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Defina como as demandas devem ser ordenadas ao carregar a página.
            </p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h3 className="font-semibold mb-2">Notificações</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Configure alertas para prazos críticos e demandas urgentes.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}