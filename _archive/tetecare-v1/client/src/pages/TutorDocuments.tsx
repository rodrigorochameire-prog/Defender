import { useState } from "react";
import { trpc } from "@/lib/trpc";
import TutorLayout from "@/components/TutorLayout";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderIcon } from "lucide-react";
import { DocumentManagement } from "@/components/DocumentManagement";

export default function TutorDocuments() {
  const [selectedPetId, setSelectedPetId] = useState<number>();

  const { data: pets } = trpc.pets.list.useQuery();

  return (
    <TutorLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie documentos veterinários, exames e certificados dos seus pets
          </p>
        </div>

        {/* Pet Selector */}
        <Card className="p-4">
          <Label>Selecione o Pet</Label>
          <Select
            value={selectedPetId?.toString()}
            onValueChange={(v) => setSelectedPetId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Escolha um pet" />
            </SelectTrigger>
            <SelectContent>
              {pets?.map((pet: any) => (
                <SelectItem key={pet.id} value={pet.id.toString()}>
                  {pet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {/* Content */}
        {!selectedPetId ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <FolderIcon className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Selecione um Pet</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha um pet acima para visualizar seus documentos
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <DocumentManagement petId={selectedPetId} showUpload={true} />
        )}
      </div>
    </TutorLayout>
  );
}
