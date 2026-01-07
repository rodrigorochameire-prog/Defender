import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, MessageCircle, FileText, Send } from "lucide-react";
import { WallFeed } from "@/components/WallFeed";
import { ChatWindow } from "@/components/ChatWindow";
import AdminWhatsApp from "@/pages/AdminWhatsApp";
import AdminLogs from "@/pages/AdminLogs";

export default function AdminCommunication() {
  const [activeTab, setActiveTab] = useState("wall");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-primary" />
              Central de Comunicação
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie toda comunicação com tutores e registros dos pets em um só lugar
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="wall" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Mural
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              WhatsApp
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs Diários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wall" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mural da Creche</CardTitle>
                <CardDescription>
                  Compartilhe fotos, vídeos e atualizações sobre os pets com os tutores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WallFeed />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chat com Tutores</CardTitle>
                <CardDescription>
                  Converse diretamente com os tutores sobre seus pets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatWindow />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4">
            <div className="-m-6">
              <AdminWhatsApp />
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <div className="-m-6">
              <AdminLogs />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
