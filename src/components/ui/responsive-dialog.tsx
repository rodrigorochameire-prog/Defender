// src/components/ui/responsive-dialog.tsx
"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type RootProps = { open?: boolean; onOpenChange?: (o: boolean) => void; children: React.ReactNode };

export function ResponsiveDialog(props: RootProps) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Sheet : Dialog;
  return <Root {...props} />;
}

export function ResponsiveDialogTrigger(
  props: React.ComponentProps<typeof DialogTrigger>,
) {
  const isMobile = useIsMobile();
  const Trigger = isMobile ? SheetTrigger : DialogTrigger;
  return <Trigger {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  hideClose,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        className={cn("max-h-[90vh] overflow-y-auto rounded-t-2xl", className)}
        {...props}
      >
        {children}
      </SheetContent>
    );
  }
  return (
    <DialogContent className={className} hideClose={hideClose} {...props}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader(props: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Header = isMobile ? SheetHeader : DialogHeader;
  return <Header {...props} />;
}

export function ResponsiveDialogFooter(props: React.ComponentProps<"div">) {
  const isMobile = useIsMobile();
  const Footer = isMobile ? SheetFooter : DialogFooter;
  return <Footer {...props} />;
}

export function ResponsiveDialogTitle(
  props: React.ComponentProps<typeof DialogTitle>,
) {
  const isMobile = useIsMobile();
  const Title = isMobile ? SheetTitle : DialogTitle;
  return <Title {...props} />;
}

export function ResponsiveDialogDescription(
  props: React.ComponentProps<typeof DialogDescription>,
) {
  const isMobile = useIsMobile();
  const Description = isMobile ? SheetDescription : DialogDescription;
  return <Description {...props} />;
}
