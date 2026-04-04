"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const JuradosContent = dynamic(
  () =>
    import("@/app/(dashboard)/admin/juri/jurados/page").then((mod) => ({
      default: mod.default,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    ),
  }
);

export function JuradosTab() {
  return <JuradosContent />;
}
