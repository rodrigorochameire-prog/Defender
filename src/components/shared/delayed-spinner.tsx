"use client";

import { useState, useEffect } from "react";

interface DelayedSpinnerProps {
  delay?: number; // ms antes de mostrar o spinner
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DelayedSpinner({ 
  delay = 300, 
  size = "md",
  className = "" 
}: DelayedSpinnerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  const sizeClasses = {
    sm: "h-8 w-8 border-2",
    md: "h-12 w-12 border-b-2",
    lg: "h-16 w-16 border-b-3",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-primary`} />
    </div>
  );
}
