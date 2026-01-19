"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ALargeSmall, Type } from "lucide-react";

const FONT_SIZE_KEY = "tetecare-font-size";

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
    
    if (newValue) {
      document.documentElement.classList.add("font-large");
      localStorage.setItem(FONT_SIZE_KEY, "large");
    } else {
      document.documentElement.classList.remove("font-large");
      localStorage.setItem(FONT_SIZE_KEY, "normal");
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" disabled>
        <ALargeSmall className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleFontSize}
      className="h-10 w-10 rounded-full hover:bg-muted/60 transition-all duration-200"
      aria-label={isLarge ? "Fonte Normal" : "Fonte Grande"}
    >
      {isLarge ? (
        <Type className="h-5 w-5" />
      ) : (
        <ALargeSmall className="h-5 w-5" />
      )}
      <span className="sr-only">
        {isLarge ? "Fonte Normal" : "Fonte Grande"}
      </span>
    </Button>
  );
}
