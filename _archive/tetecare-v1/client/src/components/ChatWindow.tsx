import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Image as ImageIcon, X, MessageCircle } from "lucide-react";
import { MessageCircle as WhatsAppIcon } from "lucide-react";
import { toast } from "sonner";

interface ChatWindowProps {
  conversationId?: number;
  petId?: number;
}

export function ChatWindow({ conversationId, petId }: ChatWindowProps) {
  const { data: user } = trpc.auth.me.useQuery();
  const utils = trpc.useUtils();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [selectedConversation, setSelectedConversation] = useState<number | null>(conversationId || null);
  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { data: conversations } = trpc.chat.getConversations.useQuery();
  const { data: messages } = trpc.chat.getMessages.useQuery(
    { conversationId: selectedConversation! },
    { enabled: !!selectedConversation, refetchInterval: 3000 }
  );
  
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate({ conversationId: selectedConversation! });
      utils.chat.getConversations.invalidate();
      setMessageText("");
      setSelectedFile(null);
      scrollToBottom();
    },
    onError: (error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });
  
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleSendMessage = async () => {
    if (!messageText.trim() && !selectedFile) {
      toast.error("Digite uma mensagem ou selecione um arquivo");
      return;
    }
    
    if (!selectedConversation) {
      toast.error("Selecione uma conversa");
      return;
    }
    
    let mediaData: string | undefined;
    
    if (selectedFile) {
      const reader = new FileReader();
      mediaData = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(selectedFile);
      });
    }
    
    await sendMessageMutation.mutateAsync({
      conversationId: selectedConversation,
      content: messageText || undefined,
      mediaData,
      messageType: selectedFile ? (selectedFile.type.startsWith('image/') ? 'image' : 'video') : 'text',
    });
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Conversations List */}
      <Card className="p-4 overflow-hidden flex flex-col">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Conversas
        </h3>
        
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {conversations && conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma conversa ainda
              </p>
            )}
            
            {conversations?.map((conv: any) => (
              <Card
                key={conv.id}
                className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                  selectedConversation === conv.id ? "bg-accent" : ""
                }`}
                onClick={() => setSelectedConversation(conv.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 font-semibold">
                      {conv.participantName?.charAt(0) || "U"}
                    </span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{conv.participantName}</p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.petName && (
                      <Badge variant="secondary" className="text-xs mt-1">{conv.petName}</Badge>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {conv.lastMessage || "Nenhuma mensagem"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conv.lastMessageAt && new Date(conv.lastMessageAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </Card>
      
      {/* Messages Area */}
      <Card className="lg:col-span-2 p-4 overflow-hidden flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages && messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma mensagem ainda. Envie a primeira!
                  </p>
                )}
                
                {messages?.map((msg: any) => {
                  const isOwn = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className={`h-8 w-8 ${isOwn ? "bg-orange-100" : "bg-gray-100"} flex items-center justify-center flex-shrink-0`}>
                        <span className={`${isOwn ? "text-orange-600" : "text-gray-600"} text-sm font-semibold`}>
                          {msg.senderName?.charAt(0) || "U"}
                        </span>
                      </Avatar>
                      
                      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                        <div className={`rounded-lg p-3 ${isOwn ? "bg-orange-500 text-white" : "bg-gray-100"} relative`}>
                          {msg.source === "whatsapp" && (
                            <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                              <WhatsAppIcon className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {msg.message && (
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          )}
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="Media"
                              className="mt-2 rounded max-w-full"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {msg.source === "whatsapp" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-green-50 text-green-700 border-green-200">
                              WhatsApp
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {/* Input Area */}
            <div className="mt-4 space-y-2">
              {selectedFile && (
                <div className="flex items-center gap-2 p-2 bg-gray-100 rounded">
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  id="chat-media"
                  onChange={handleFileSelect}
                />
                <label htmlFor="chat-media">
                  <Button variant="outline" size="icon" asChild>
                    <span className="cursor-pointer">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  </Button>
                </label>
                
                <Input
                  placeholder="Digite sua mensagem..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1"
                />
                
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
