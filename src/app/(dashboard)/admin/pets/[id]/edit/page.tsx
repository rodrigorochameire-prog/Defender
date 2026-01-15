"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, Save, Loader2, Dog, Heart, Utensils, Brain, AlertTriangle, Shield, Users
} from "lucide-react";
import { toast } from "sonner";

// Importar constantes de opções
import {
  PET_SIZES,
  PET_COAT_TYPES,
  PET_GENDERS,
  ENERGY_LEVELS,
  DOG_SOCIABILITY,
  HUMAN_SOCIABILITY,
  PLAY_STYLES,
  CORRECTION_SENSITIVITY,
  HUMAN_FOCUS_LEVEL,
  FEAR_TRIGGERS,
  CALMING_METHODS,
  EQUIPMENT_RESTRICTIONS,
  COEXISTENCE_RESTRICTIONS,
  FOOD_TYPES,
  FOOD_PREPARATION,
  CHRONIC_CONDITIONS,
  FOOD_ALLERGIES,
  MEDICATION_ALLERGIES,
} from "@/lib/constants/pet-options";

export default function EditPetAdvancedPage() {
  const params = useParams();
  const router = useRouter();
  const petId = parseInt(params.id as string);
  
  const [fearTriggers, setFearTriggers] = useState<string[]>([]);
  const [equipmentRestrictions, setEquipmentRestrictions] = useState<string[]>([]);
  const [coexistenceRestrictions, setCoexistenceRestrictions] = useState<string[]>([]);
  const [foodAllergies, setFoodAllergies] = useState<string[]>([]);
  const [medicationAllergies, setMedicationAllergies] = useState<string[]>([]);
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  
  const [hasFoodAllergy, setHasFoodAllergy] = useState(false);
  const [hasMedicationAllergy, setHasMedicationAllergy] = useState(false);
  const [hasChronicCondition, setHasChronicCondition] = useState(false);

  // Query
  const { data: pet, isLoading, refetch } = trpc.pets.byId.useQuery({ id: petId });
  
  // Mutation
  const updatePet = trpc.pets.update.useMutation({
    onSuccess: () => {
      toast.success("Pet atualizado com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    
    updatePet.mutate({
      id: petId,
      // Dados básicos
      name: form.get("name") as string,
      breed: form.get("breed") as string || undefined,
      birthDate: form.get("birthDate") as string || undefined,
      weight: form.get("weight") ? Number(form.get("weight")) * 1000 : undefined,
      notes: form.get("notes") as string || undefined,
      
      // Dados físicos
      size: form.get("size") as any || undefined,
      coatType: form.get("coatType") as any || undefined,
      gender: form.get("gender") as any || undefined,
      
      // Perfil comportamental
      energyLevel: form.get("energyLevel") as any || undefined,
      dogSociability: form.get("dogSociability") as any || undefined,
      humanSociability: form.get("humanSociability") as any || undefined,
      playStyle: form.get("playStyle") as any || undefined,
      correctionSensitivity: form.get("correctionSensitivity") as any || undefined,
      humanFocusLevel: form.get("humanFocusLevel") as any || undefined,
      fearTriggers: fearTriggers,
      equipmentRestrictions: equipmentRestrictions,
      coexistenceRestrictions: coexistenceRestrictions,
      calmingMethods: form.get("calmingMethod") ? [form.get("calmingMethod") as string] : undefined,
      
      // Alimentação
      foodBrand: form.get("foodBrand") as string || undefined,
      foodType: form.get("foodType") as any || undefined,
      foodAmount: form.get("foodAmount") ? Number(form.get("foodAmount")) : undefined,
      foodPreparation: form.get("foodPreparation") as any || undefined,
      feedingInstructions: form.get("feedingInstructions") as string || undefined,
      
      // Saúde
      hasFoodAllergy: hasFoodAllergy,
      foodAllergies: hasFoodAllergy ? foodAllergies : undefined,
      hasMedicationAllergy: hasMedicationAllergy,
      medicationAllergies: hasMedicationAllergy ? medicationAllergies : undefined,
      hasChronicCondition: hasChronicCondition,
      chronicConditions: hasChronicCondition ? chronicConditions : undefined,
      
      // Protocolo de emergência
      emergencyVetName: form.get("emergencyVetName") as string || undefined,
      emergencyVetPhone: form.get("emergencyVetPhone") as string || undefined,
      emergencyVetAddress: form.get("emergencyVetAddress") as string || undefined,
      
      // Cio
      lastHeatDate: form.get("lastHeatDate") as string || undefined,
    });
  };

  const toggleArrayItem = (array: string[], setArray: (v: string[]) => void, value: string) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Dog className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Pet não encontrado</p>
            <Link href="/admin/pets">
              <Button variant="link" className="mt-4">Voltar para lista</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <Link href={`/admin/pets/${petId}`}>
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="page-header-icon">
            <Dog />
          </div>
          <div>
            <h1 className="page-title">Editar Perfil: {pet.name}</h1>
            <p className="page-description">Configure todos os dados do pet em detalhe</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Dog className="h-4 w-4" /> Básico
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> Comportamento
            </TabsTrigger>
            <TabsTrigger value="feeding" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" /> Alimentação
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="h-4 w-4" /> Saúde
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Social
            </TabsTrigger>
          </TabsList>

          {/* === TAB: DADOS BÁSICOS === */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Dados Básicos</CardTitle>
                <CardDescription>Informações gerais do pet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" name="name" defaultValue={pet.name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="breed">Raça</Label>
                    <Input id="breed" name="breed" defaultValue={pet.breed || ""} />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                    <Input 
                      id="birthDate" 
                      name="birthDate" 
                      type="date" 
                      defaultValue={pet.birthDate ? new Date(pet.birthDate).toISOString().split("T")[0] : ""} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input 
                      id="weight" 
                      name="weight" 
                      type="number" 
                      step="0.1" 
                      defaultValue={pet.weight ? pet.weight / 1000 : ""} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Sexo</Label>
                    <Select name="gender" defaultValue={(pet as any).sex || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PET_GENDERS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Porte</Label>
                    <Select name="size" defaultValue={(pet as any).size || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PET_SIZES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coatType">Tipo de Pelo</Label>
                    <Select name="coatType" defaultValue={(pet as any).coatType || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PET_COAT_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações Gerais</Label>
                  <Textarea id="notes" name="notes" rows={3} defaultValue={pet.notes || ""} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: COMPORTAMENTO === */}
          <TabsContent value="behavior">
            <Card>
              <CardHeader>
                <CardTitle>Perfil Comportamental</CardTitle>
                <CardDescription>Energia, sociabilidade e temperamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Níveis de energia e foco */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="energyLevel">Nível de Energia</Label>
                    <Select name="energyLevel" defaultValue={pet.energyLevel || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENERGY_LEVELS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="humanFocusLevel">Foco no Humano</Label>
                    <Select name="humanFocusLevel" defaultValue={(pet as any).humanFocus || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {HUMAN_FOCUS_LEVEL.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Sociabilidade */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dogSociability">Sociabilidade com Cães</Label>
                    <Select name="dogSociability" defaultValue={(pet as any).dogSociability || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOG_SOCIABILITY.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="humanSociability">Sociabilidade com Humanos</Label>
                    <Select name="humanSociability" defaultValue={(pet as any).humanSociability || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {HUMAN_SOCIABILITY.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Estilo de brincadeira e correção */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="playStyle">Estilo de Brincadeira</Label>
                    <Select name="playStyle" defaultValue={(pet as any).playStyle || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAY_STYLES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correctionSensitivity">Sensibilidade à Correção</Label>
                    <Select name="correctionSensitivity" defaultValue={(pet as any).correctionSensitivity || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CORRECTION_SENSITIVITY.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} - {opt.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Método de acalmar */}
                <div className="space-y-2">
                  <Label htmlFor="calmingMethod">Como Acalmar</Label>
                  <Select name="calmingMethod" defaultValue={(pet as any).calmingTechnique || undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CALMING_METHODS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gatilhos de Medo */}
                <div className="space-y-2">
                  <Label>Gatilhos de Medo</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {FEAR_TRIGGERS.map((opt) => (
                      <label 
                        key={opt.value} 
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          fearTriggers.includes(opt.value) ? "bg-primary/10 border-primary" : "hover:bg-accent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={fearTriggers.includes(opt.value)}
                          onChange={() => toggleArrayItem(fearTriggers, setFearTriggers, opt.value)}
                          className="sr-only"
                        />
                        <span className="text-sm">{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Restrições de Equipamento */}
                <div className="space-y-2">
                  <Label>Restrições de Equipamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EQUIPMENT_RESTRICTIONS.map((opt) => (
                      <label 
                        key={opt.value} 
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          equipmentRestrictions.includes(opt.value) ? "bg-primary/10 border-primary" : "hover:bg-accent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={equipmentRestrictions.includes(opt.value)}
                          onChange={() => toggleArrayItem(equipmentRestrictions, setEquipmentRestrictions, opt.value)}
                          className="sr-only"
                        />
                        <span className="text-sm">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: ALIMENTAÇÃO === */}
          <TabsContent value="feeding">
            <Card>
              <CardHeader>
                <CardTitle>Protocolo Alimentar</CardTitle>
                <CardDescription>Tipo de alimento, quantidade e preparação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foodType">Tipo de Alimentação</Label>
                    <Select name="foodType" defaultValue={pet.foodType || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_TYPES.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foodPreparation">Modo de Preparo</Label>
                    <Select name="foodPreparation" defaultValue={(pet as any).foodPreparation || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOOD_PREPARATION.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="foodBrand">Marca da Ração/Alimento</Label>
                    <Input id="foodBrand" name="foodBrand" defaultValue={pet.foodBrand || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foodAmount">Quantidade Diária (g)</Label>
                    <Input id="foodAmount" name="foodAmount" type="number" defaultValue={pet.foodAmount || ""} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedingInstructions">Instruções Especiais</Label>
                  <Textarea 
                    id="feedingInstructions" 
                    name="feedingInstructions" 
                    rows={3} 
                    placeholder="Ex: Dividir em 3 refeições, não dar água junto com a comida..."
                    defaultValue={(pet as any).feedingInstructions || ""} 
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: SAÚDE === */}
          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  Central de Saúde
                </CardTitle>
                <CardDescription>Alergias, condições crônicas e protocolo de emergência</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Alergias Alimentares */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Possui Alergia Alimentar?
                    </Label>
                    <Switch checked={hasFoodAllergy} onCheckedChange={setHasFoodAllergy} />
                  </div>
                  {hasFoodAllergy && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {FOOD_ALLERGIES.map((opt) => (
                        <label 
                          key={opt.value}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                            foodAllergies.includes(opt.value) ? "bg-red-50 border-red-300 dark:bg-red-900/20" : "hover:bg-accent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={foodAllergies.includes(opt.value)}
                            onChange={() => toggleArrayItem(foodAllergies, setFoodAllergies, opt.value)}
                            className="sr-only"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Alergias a Medicamentos */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Possui Alergia a Medicamentos?
                    </Label>
                    <Switch checked={hasMedicationAllergy} onCheckedChange={setHasMedicationAllergy} />
                  </div>
                  {hasMedicationAllergy && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {MEDICATION_ALLERGIES.map((opt) => (
                        <label 
                          key={opt.value}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                            medicationAllergies.includes(opt.value) ? "bg-red-50 border-red-300 dark:bg-red-900/20" : "hover:bg-accent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={medicationAllergies.includes(opt.value)}
                            onChange={() => toggleArrayItem(medicationAllergies, setMedicationAllergies, opt.value)}
                            className="sr-only"
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Condições Crônicas */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Possui Doença Crônica?
                    </Label>
                    <Switch checked={hasChronicCondition} onCheckedChange={setHasChronicCondition} />
                  </div>
                  {hasChronicCondition && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                      {CHRONIC_CONDITIONS.map((opt) => (
                        <label 
                          key={opt.value}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                            chronicConditions.includes(opt.value) ? "bg-red-50 border-red-300 dark:bg-red-900/20" : "hover:bg-accent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={chronicConditions.includes(opt.value)}
                            onChange={() => toggleArrayItem(chronicConditions, setChronicConditions, opt.value)}
                            className="sr-only"
                          />
                          <span className="text-sm">{opt.icon} {opt.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Protocolo de Emergência */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Veterinário de Emergência</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyVetName">Nome do Veterinário</Label>
                      <Input id="emergencyVetName" name="emergencyVetName" defaultValue={pet.emergencyVetName || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyVetPhone">Telefone</Label>
                      <Input id="emergencyVetPhone" name="emergencyVetPhone" defaultValue={pet.emergencyVetPhone || ""} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="emergencyVetAddress">Endereço</Label>
                    <Input id="emergencyVetAddress" name="emergencyVetAddress" defaultValue={pet.emergencyVetAddress || ""} />
                  </div>
                </div>

                {/* Gestão de Cio (fêmeas) */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Gestão de Cio (Fêmeas não castradas)</h4>
                  <div className="space-y-2">
                    <Label htmlFor="lastHeatDate">Data do Último Cio</Label>
                    <Input 
                      id="lastHeatDate" 
                      name="lastHeatDate" 
                      type="date" 
                      defaultValue={(pet as any).lastHeatDate ? new Date((pet as any).lastHeatDate).toISOString().split("T")[0] : ""} 
                    />
                    <p className="text-xs text-muted-foreground">O sistema alertará 15 dias antes da previsão do próximo cio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TAB: SOCIAL (Restrições de Convivência) === */}
          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Restrições de Convivência</CardTitle>
                <CardDescription>Defina regras importantes para a segurança do pet</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {COEXISTENCE_RESTRICTIONS.map((opt) => (
                    <label 
                      key={opt.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        coexistenceRestrictions.includes(opt.value) ? "bg-amber-50 border-amber-300 dark:bg-amber-900/20" : "hover:bg-accent"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={coexistenceRestrictions.includes(opt.value)}
                        onChange={() => toggleArrayItem(coexistenceRestrictions, setCoexistenceRestrictions, opt.value)}
                        className="rounded"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <Button type="submit" size="lg" disabled={updatePet.isPending}>
            {updatePet.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
