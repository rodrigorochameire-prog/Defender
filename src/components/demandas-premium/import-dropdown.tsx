"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportDropdownProps {
  onImportExcel: () => void;
  onImportPJe: () => void;
  onImportSheets?: () => void;
  onImportSEEU?: () => void;
}

export function ImportDropdown({ onImportExcel, onImportPJe, onImportSheets, onImportSEEU }: ImportDropdownProps) {
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

  const handleSheetsClick = () => {
    setIsOpen(false);
    onImportSheets?.();
  };

  const handleSEEUClick = () => {
    setIsOpen(false);
    onImportSEEU?.();
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
          <div className="absolute top-full mt-1 right-0 z-[100] w-40 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden py-1">
            {onImportSheets && (
              <button
                onClick={handleSheetsClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
                <span>Google Sheets</span>
              </button>
            )}
            <button
              onClick={handleExcelClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={handlePJeClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>PJe</span>
            </button>
            {onImportSEEU && (
              <button
                onClick={handleSEEUClick}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm"
              >
                <Gavel className="w-4 h-4 text-amber-600" />
                <span>SEEU</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
