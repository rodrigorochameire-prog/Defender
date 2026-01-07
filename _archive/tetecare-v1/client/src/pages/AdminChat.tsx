import AdminLayout from "@/components/AdminLayout";
import { ChatWindow } from "@/components/ChatWindow";

export default function AdminChat() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Chat com Tutores</h1>
          <p className="text-muted-foreground">
            Converse com os tutores sobre seus pets
          </p>
        </div>

        <ChatWindow />
      </div>
    </AdminLayout>
  );
}
