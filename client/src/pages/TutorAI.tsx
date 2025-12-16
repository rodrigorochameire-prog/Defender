import { useState, useRef, useEffect } from "react";
import TutorLayout from "@/components/TutorLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User, Bot, Loader2, PawPrint, Heart, Calendar, Pill, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TutorAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o assistente virtual da Tetê Care. Posso ajudar você com dúvidas sobre a creche, saúde do seu pet, comportamento e muito mais. Como posso ajudar hoje?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: pets = [] } = trpc.pets.listMine.useQuery();
  const { data: user } = trpc.auth.me.useQuery();

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (response: any) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.message,
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Build context from user's pets
    const context = pets.map((pet: any) => ({
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      credits: pet.credits,
    }));

    chatMutation.mutate({
      message: input,
      context: JSON.stringify(context),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    "Quais vacinas meu pet precisa tomar?",
    "Como funciona o sistema de créditos?",
    "Meu pet está com comportamento estranho, o que fazer?",
    "Qual a melhor ração para Golden Retriever?",
    "Como preparar meu pet para a primeira vez na creche?",
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <TutorLayout>
    <div className="container max-w-5xl py-8 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Assistente de IA</h1>
        </div>
        <p className="text-muted-foreground">
          Tire suas dúvidas sobre creche, saúde e comportamento do seu pet
        </p>
      </div>

      {/* Pet Context Cards */}
      {pets.length > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <PawPrint className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Seus Pets
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pets.map((pet: any) => (
              <Badge key={pet.id} variant="secondary" className="gap-1">
                {pet.name} ({pet.breed || "Raça não informada"})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Chat Container */}
      <Card className="flex flex-col h-[600px]">
        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length === 1 && (
          <div className="px-6 pb-4 border-t">
            <p className="text-sm text-muted-foreground mb-3 mt-4">Perguntas sugeridas:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold">Saúde</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Pergunte sobre vacinas, medicamentos e cuidados preventivos
          </p>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Creche</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Tire dúvidas sobre horários, créditos e funcionamento
          </p>
        </Card>

        <Card className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <PawPrint className="h-5 w-5 text-orange-500" />
            <h3 className="font-semibold">Comportamento</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Obtenha dicas sobre adestramento e socialização
          </p>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="p-4 mt-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900 dark:text-amber-100">
              <strong>Importante:</strong> Este assistente fornece informações gerais. Para questões
              específicas de saúde do seu pet, sempre consulte um veterinário.
            </p>
          </div>
        </div>
      </Card>
    </div>
    </TutorLayout>
  );
}
