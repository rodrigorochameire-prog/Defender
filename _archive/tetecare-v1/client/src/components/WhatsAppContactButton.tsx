import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppContactButtonProps {
  variant?: "floating" | "inline";
  petName?: string;
}

const MESSAGE_TEMPLATES = [
  {
    id: "hours",
    title: "Horários de Funcionamento",
    message: "Olá! Gostaria de saber os horários de funcionamento da creche.",
  },
  {
    id: "bath",
    title: "Agendar Banho",
    message: "Olá! Gostaria de agendar um banho para meu pet.",
  },
  {
    id: "services",
    title: "Informações sobre Serviços",
    message: "Olá! Tenho dúvidas sobre os serviços oferecidos pela creche.",
  },
  {
    id: "pricing",
    title: "Valores e Pacotes",
    message: "Olá! Gostaria de saber sobre os valores e pacotes disponíveis.",
  },
];

export function WhatsAppContactButton({ variant = "floating", petName }: WhatsAppContactButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  const handleSendMessage = (message: string) => {
    // Get WhatsApp phone number from config (you should fetch this from backend)
    const whatsappNumber = "5511999999999"; // Replace with actual number from config
    
    // Format message with pet name if provided
    let finalMessage = message;
    if (petName) {
      finalMessage = `${message}\n\nReferente ao pet: ${petName}`;
    }

    // Encode message for URL
    const encodedMessage = encodeURIComponent(finalMessage);
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
    
    toast.success("Abrindo WhatsApp...");
    setIsOpen(false);
    setSelectedTemplate(null);
    setCustomMessage("");
  };

  const handleTemplateClick = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      handleSendMessage(template.message);
    }
  };

  const handleCustomMessageSend = () => {
    if (!customMessage.trim()) {
      toast.error("Por favor, digite uma mensagem");
      return;
    }
    handleSendMessage(customMessage);
  };

  if (variant === "floating") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center"
          aria-label="Contato WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </button>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
                Fale Conosco pelo WhatsApp
              </DialogTitle>
              <DialogDescription>
                Escolha um assunto ou envie uma mensagem personalizada
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Message Templates */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Mensagens Rápidas:</p>
                <div className="grid gap-2">
                  {MESSAGE_TEMPLATES.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="justify-start text-left h-auto py-3"
                      onClick={() => handleTemplateClick(template.id)}
                    >
                      <div>
                        <p className="font-medium text-sm">{template.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{template.message}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Ou envie uma mensagem personalizada:</p>
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={handleCustomMessageSend}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Enviar via WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Inline variant
  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-green-500 text-green-600 hover:bg-green-50"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Falar pelo WhatsApp
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              Fale Conosco pelo WhatsApp
            </DialogTitle>
            <DialogDescription>
              Escolha um assunto ou envie uma mensagem personalizada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Message Templates */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Mensagens Rápidas:</p>
              <div className="grid gap-2">
                {MESSAGE_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    className="justify-start text-left h-auto py-3"
                    onClick={() => handleTemplateClick(template.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{template.message}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Ou envie uma mensagem personalizada:</p>
              <Textarea
                placeholder="Digite sua mensagem..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
              <Button
                onClick={handleCustomMessageSend}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar via WhatsApp
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
