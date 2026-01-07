import TutorLayout from "@/components/TutorLayout";
import { ChatWindow } from "@/components/ChatWindow";

export default function TutorChat() {
  return (
    <TutorLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Chat com a Creche</h1>
          <p className="text-muted-foreground">
            Converse com a equipe da creche sobre seus pets
          </p>
        </div>
        
        <ChatWindow />
      </div>
    </TutorLayout>
  );
}
