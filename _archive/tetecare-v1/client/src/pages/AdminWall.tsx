import { WallFeed } from "@/components/WallFeed";
import AdminLayout from "@/components/AdminLayout";

export default function AdminWall() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mural da Creche</h1>
          <p className="text-muted-foreground mt-2">
            Compartilhe fotos, vídeos e atualizações sobre os pets com os tutores
          </p>
        </div>

        <WallFeed />
      </div>
    </AdminLayout>
  );
}
