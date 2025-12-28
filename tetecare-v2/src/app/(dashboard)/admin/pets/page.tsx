"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dog, Check, X } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function AdminPetsPage() {
  const utils = trpc.useUtils();
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  const { data: pendingPets } = trpc.pets.pending.useQuery();

  const approveMutation = trpc.pets.approve.useMutation({
    onSuccess: () => {
      toast.success("Pet aprovado com sucesso!");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = trpc.pets.reject.useMutation({
    onSuccess: () => {
      toast.success("Pet rejeitado");
      utils.pets.list.invalidate();
      utils.pets.pending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Pets</h1>
        <p className="text-gray-500">Gerencie todos os pets cadastrados</p>
      </div>

      {/* Pending Approvals */}
      {pendingPets && pendingPets.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-700">
              ⏳ Aguardando Aprovação ({pendingPets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPets.map((pet) => (
                <div
                  key={pet.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span>{pet.species === "cat" ? "🐱" : "🐶"}</span>
                    </div>
                    <div>
                      <p className="font-medium">{pet.name}</p>
                      <p className="text-sm text-gray-500">
                        {pet.breed || "Sem raça"} • Cadastrado em{" "}
                        {formatDate(pet.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: pet.id })}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate({ id: pet.id })}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Pets */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Pets ({pets?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!pets || pets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Dog className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Nenhum pet cadastrado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Pet
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Raça
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Créditos
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Cadastro
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pets.map((pet) => (
                    <tr key={pet.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm">
                              {pet.species === "cat" ? "🐱" : "🐶"}
                            </span>
                          </div>
                          <span className="font-medium">{pet.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {pet.breed || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            pet.approvalStatus === "approved"
                              ? "bg-green-100 text-green-700"
                              : pet.approvalStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {pet.approvalStatus === "approved"
                            ? "Aprovado"
                            : pet.approvalStatus === "pending"
                            ? "Pendente"
                            : "Rejeitado"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-primary">
                          {pet.credits}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">
                        {formatDate(pet.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
