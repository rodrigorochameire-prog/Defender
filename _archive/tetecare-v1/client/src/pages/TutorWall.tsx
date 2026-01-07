import { WallFeed } from "@/components/WallFeed";
import TutorLayout from "@/components/TutorLayout";

export default function TutorWall() {
  return (
    <TutorLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mural</h1>
          <p className="text-muted-foreground mt-2">
            Veja as atualizações e fotos dos seus pets na creche
          </p>
        </div>
        
        <WallFeed />
      </div>
    </TutorLayout>
  );
}
