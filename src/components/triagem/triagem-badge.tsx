import { countPendentesPorDefensor } from "@/lib/services/triagem";
import { Bell } from "lucide-react";
import Link from "next/link";

export async function TriagemBadge({ defensorId }: { defensorId: number }) {
  const count = await countPendentesPorDefensor(defensorId);
  if (count === 0) return null;

  return (
    <Link href="/triagem" className="relative inline-flex items-center gap-1 text-sm hover:opacity-80">
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">Triagem</span>
      <span className="rounded-full bg-rose-500 text-white text-[10px] font-semibold px-1.5 py-0.5 leading-none">
        {count}
      </span>
    </Link>
  );
}
