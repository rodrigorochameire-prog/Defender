"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ALargeSmall, Type } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FONT_SIZE_KEY = "defesahub-font-size";

export function FontSizeToggle() {
  const [isLarge, setIsLarge] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    if (saved === "large") {
      setIsLarge(true);
      document.documentElement.classList.add("font-large");
    }
  }, []);

  const toggleFontSize = () => {
    const newValue = !isLarge;
    setIsLarge(newValue);
    
    // Smooth transition
    document.documentElement.style.transition = "font-size 0.25s ease-out";
    
    if (newValue) {
      document.documentElement.classList.add("font-large");
      localStorage.setItem(FONT_SIZE_KEY, "large");
    } else {
      document.documentElement.classList.remove("font-large");
      localStorage.setItem(FONT_SIZE_KEY, "normal");
    }
    
    // Remove transition after animation completes
    setTimeout(() => {
      document.documentElement.style.transition = "";
    }, 300);
  };

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-10 w-10 rounded-full" 
        disabled
      >
        <ALargeSmall className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFontSize}
          className="h-10 w-10 rounded-full hover:bg-muted/60 transition-all duration-200 relative"
          aria-label={isLarge ? "Usar fonte normal" : "Usar fonte grande"}
        >
          {isLarge ? (
            <Type className="h-5 w-5" />
          ) : (
            <ALargeSmall className="h-5 w-5" />
          )}
          {/* Indicador visual do modo ativo */}
          {isLarge && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-sm">
        {isLarge ? "Reduzir fonte" : "Aumentar fonte"}
      </TooltipContent>
    </Tooltip>
  );
}
