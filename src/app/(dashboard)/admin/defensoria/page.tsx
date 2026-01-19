"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

const defensores = [
  { id: 1, nome: "Dr. Rodrigo Rocha", oab: "BA 12345", email: "rodrigo@defensoria.ba.gov.br", ativo: true },
  { id: 2, nome: "Dra. Juliane Silva", oab: "BA 67890", email: "juliane@defensoria.ba.gov.br", ativo: true },
];

const comarcas = [
  { id: 1, nome: "Candeias", endereco: "Av. Principal, 123 - Centro", telefone: "(71) 3333-4444" },
  { id: 2, nome: "Dias D'Ávila", endereco: "Rua das Flores, 456 - Centro", telefone: "(71) 3333-5555" },
];

export default function DefensoriaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Defensoria</h1>
        <p className="text-muted-foreground mt-1">
          Configurações e informações da unidade
        </p>
      </div>

      {/* Informações da Unidade */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Informações da Unidade</CardTitle>
                <CardDescription>Dados da Defensoria Pública</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Unidade</Label>
              <Input value="Defensoria Pública - Núcleo de Candeias" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Comarca</Label>
              <Input value="Candeias / Dias D'Ávila" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input value="Av. Principal, 123 - Centro - Candeias/BA" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value="(71) 3333-4444" readOnly />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defensores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Defensores</CardTitle>
                <CardDescription>Equipe de defensores da unidade</CardDescription>
              </div>
            </div>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {defensores.map((defensor) => (
              <div
                key={defensor.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(defensor.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{defensor.nome}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>OAB: {defensor.oab}</span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {defensor.email}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={defensor.ativo ? "default" : "secondary"}>
                    {defensor.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comarcas Atendidas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Comarcas Atendidas</CardTitle>
              <CardDescription>Áreas de abrangência</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {comarcas.map((comarca) => (
              <Card key={comarca.id}>
                <CardContent className="p-4">
                  <h4 className="font-medium">{comarca.nome}</h4>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {comarca.endereco}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {comarca.telefone}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
