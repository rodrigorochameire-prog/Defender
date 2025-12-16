import DashboardLayout from "@/components/DashboardLayout";
import { ChatWindow } from "@/components/ChatWindow";

export default function AdminChat() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Chat com Tutores</h1>
          <p className="text-muted-foreground">
            Converse com os tutores sobre seus pets
          </p>
        </div>
        
        <ChatWindow />
      </div>
    </DashboardLayout>
  );
}
