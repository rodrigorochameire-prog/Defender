"use client";

import React, { useCallback, useRef } from "react";

interface ColumnResizeHandleProps {
  columnId: string;
  onResize: (columnId: string, width: number) => void;
  currentWidth: number;
}

export function ColumnResizeHandle({ columnId, onResize, currentWidth }: ColumnResizeHandleProps) {
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startWidth.current = currentWidth;

    const handleMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX.current;
      onResize(columnId, startWidth.current + diff);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [columnId, currentWidth, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize group/resize z-20"
      title="Arraste para redimensionar"
    >
      <div className="absolute right-0 top-1/4 bottom-1/4 w-0.5 bg-transparent group-hover/resize:bg-emerald-400/60 transition-colors" />
    </div>
  );
}
