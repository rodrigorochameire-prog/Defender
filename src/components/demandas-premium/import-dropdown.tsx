"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportDropdownProps {
  onImportExcel: () => void;
  onImportPJe: () => void;
}

export function ImportDropdown({ onImportExcel, onImportPJe }: ImportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleExcelClick = () => {
    setIsOpen(false);
    onImportExcel();
  };

  const handlePJeClick = () => {
    setIsOpen(false);
    onImportPJe();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        title="Importar"
        className="h-7 w-7 p-0 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full mt-1 right-0 z-[100] w-32 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden py-1">
            <button
              onClick={handleExcelClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
            >
              <Download className="w-4 h-4 text-green-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={handlePJeClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>PJe</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
