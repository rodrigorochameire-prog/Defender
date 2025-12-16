import { WallFeed } from "@/components/WallFeed";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminWall() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Mural da Creche</h1>
          <p className="text-muted-foreground mt-2">
            Compartilhe fotos, vídeos e atualizações sobre os pets com os tutores
          </p>
        </div>
        
        <WallFeed />
      </div>
    </DashboardLayout>
  );
}
