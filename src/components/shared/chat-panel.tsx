"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useChatPanel } from "@/hooks/use-chat-panel";
import { matchSkill } from "@/lib/skills/matcher";
import { executeSkill, type ExecutionCallback } from "@/lib/skills/executor";
import { initializeSkills } from "@/lib/skills/registry";
import { SkillResult } from "./skill-result";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ChatPanel() {
  const { isOpen, close, messages, addMessage, assistidoNome } = useChatPanel();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { initializeSkills(); }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const callbacks: ExecutionCallback = {
    navigate: (url) => router.push(url),
    openPanel: (title, _component, _params) => {
      addMessage({ role: "assistant", content: `Abrindo: ${title}` });
    },
    showToast: (msg) => toast(msg),
    openDelegate: (url, fallback) => {
      try {
        window.open(url, "_blank");
        toast.success("Enviado para Cowork");
      } catch {
        navigator.clipboard?.writeText(fallback);
        toast.info("Prompt copiado!");
      }
    },
  };

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    addMessage({ role: "user", content: text });

    const match = matchSkill(text);
    if (match) {
      const result = await executeSkill(match, callbacks);
      addMessage({
        role: "assistant",
        content: match.skill.name,
        skillId: match.skill.id,
        data: result,
      });
    } else {
      addMessage({
        role: "assistant",
        content: "Não entendi. Tente:\n/prazos — Prazos vencendo\n/briefing [nome] — Análise do caso\n/status [nome] — Ficha do assistido\n/buscar [termo] — Buscar documentos",
      });
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="right" className="w-80 sm:w-96 p-0 flex flex-col">
        <div className="p-3 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-emerald-500" />
            <span className="font-medium text-sm">Assistente OMBUDS</span>
          </div>
          {assistidoNome && (
            <Badge variant="default" className="text-xs truncate max-w-[140px]">
              {assistidoNome}
            </Badge>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Digite um comando ou pergunta</p>
                <p className="text-xs mt-1">Ex: /prazos, /briefing Gabriel</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : ""}>
                <div className={`inline-block rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                }`}>
                  {msg.content}
                </div>
                {msg.data && msg.skillId ? (
                  <SkillResult
                    skillName={msg.skillId}
                    type=""
                    route={undefined
                    }
                    delegateUrl={
                      typeof (msg.data as Record<string, unknown>)?.delegateUrl === "string"
                        ? String((msg.data as Record<string, unknown>).delegateUrl)
                        : undefined
                    }
                  />
                ) : null}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t flex gap-2 shrink-0">
          <input
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="O que você precisa?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button size="icon" variant="ghost" onClick={handleSend} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
