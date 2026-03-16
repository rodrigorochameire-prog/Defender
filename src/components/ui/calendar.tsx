"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-semibold text-zinc-800 dark:text-zinc-200 capitalize",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 cursor-pointer",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 cursor-pointer",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-zinc-400 dark:text-zinc-500 rounded-md w-9 font-medium text-[0.75rem] uppercase",
        week: "flex w-full mt-1",
        day: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-emerald-50 dark:[&:has([aria-selected])]:bg-emerald-950/20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : "[&:has([aria-selected])]:rounded-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100 cursor-pointer",
        ),
        range_start:
          "day-range-start aria-selected:bg-emerald-600 aria-selected:text-white",
        range_end:
          "day-range-end aria-selected:bg-emerald-600 aria-selected:text-white",
        selected:
          "bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white focus:bg-emerald-600 focus:text-white font-semibold",
        today: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold",
        outside:
          "day-outside text-zinc-300 dark:text-zinc-600 aria-selected:text-white/70",
        disabled: "text-zinc-300 dark:text-zinc-600 opacity-50",
        range_middle:
          "aria-selected:bg-emerald-50 dark:aria-selected:bg-emerald-950/20 aria-selected:text-emerald-900 dark:aria-selected:text-emerald-200",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClassName, ...chevProps }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-4", chevClassName)} {...chevProps} />
          ) : (
            <ChevronRight className={cn("size-4", chevClassName)} {...chevProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
