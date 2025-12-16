import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Save, X } from "lucide-react";

interface PetEditFormProps {
  pet: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PetEditForm({ pet, isOpen, onClose, onSuccess }: PetEditFormProps) {
  const [formData, setFormData] = useState({
    name: pet.name || "",
    breed: pet.breed || "",
    birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().split("T")[0] : "",
    weight: pet.weight ? (pet.weight / 1000).toString() : "", // Convert grams to kg
    foodBrand: pet.foodBrand || "",
    foodAmount: pet.foodAmount ? pet.foodAmount.toString() : "",
    notes: pet.notes || "",
  });

  useEffect(() => {
    setFormData({
      name: pet.name || "",
      breed: pet.breed || "",
      birthDate: pet.birthDate ? new Date(pet.birthDate).toISOString().split("T")[0] : "",
      weight: pet.weight ? (pet.weight / 1000).toString() : "", // Convert grams to kg
      foodBrand: pet.foodBrand || "",
      foodAmount: pet.foodAmount ? pet.foodAmount.toString() : "",
      notes: pet.notes || "",
    });
  }, [pet]);

  const updatePetMutation = trpc.pets.updateAdmin.useMutation({
    onSuccess: () => {
      toast.success("Informações atualizadas com sucesso!");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar informações: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    updatePetMutation.mutate({
      id: pet.id,
      name: formData.name,
      breed: formData.breed || undefined,
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined,
      weight: formData.weight ? Math.round(parseFloat(formData.weight) * 1000) : undefined, // Convert kg to grams
      foodBrand: formData.foodBrand || undefined,
      foodAmount: formData.foodAmount ? parseInt(formData.foodAmount) : undefined,
      notes: formData.notes || undefined,
    });
  };

  const calculateAge = () => {
    if (!formData.birthDate) return "N/A";
    const birth = new Date(formData.birthDate);
    const today = new Date();
    const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    const years = Math.floor(ageInMonths / 12);
    const months = ageInMonths % 12;
    
    if (years === 0) return `${months} ${months === 1 ? "mês" : "meses"}`;
    if (months === 0) return `${years} ${years === 1 ? "ano" : "anos"}`;
    return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Informações de {pet.name}</DialogTitle>
          <DialogDescription>
            Atualize as informações básicas e dados de saúde do pet
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Informações Básicas</h3>
            
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="breed">Raça</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                placeholder="Ex: Golden Retriever"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
                {formData.birthDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Idade: {calculateAge()}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="weight">Peso (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Ex: 25.5"
                />
              </div>
            </div>


          </div>

          {/* Food Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alimentação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="foodBrand">Marca da Ração</Label>
                <Input
                  id="foodBrand"
                  value={formData.foodBrand}
                  onChange={(e) => setFormData({ ...formData, foodBrand: e.target.value })}
                  placeholder="Ex: Royal Canin"
                />
              </div>

              <div>
                <Label htmlFor="foodAmount">Quantidade Diária (g)</Label>
                <Input
                  id="foodAmount"
                  type="number"
                  value={formData.foodAmount}
                  onChange={(e) => setFormData({ ...formData, foodAmount: e.target.value })}
                  placeholder="Ex: 300"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais, alergias, comportamentos especiais..."
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={updatePetMutation.isPending}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={updatePetMutation.isPending}>
              {updatePetMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
