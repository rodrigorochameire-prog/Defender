"use client";

import React from "react";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Plus, CreditCard, Calendar, Heart, ArrowRight } from "lucide-react";
import Link from "next/link";
import { LoadingPage } from "@/components/shared/loading";
import { BreedIcon } from "@/components/breed-icons";

export default function TutorPetsPage() {
  const { data: pets, isLoading } = trpc.pets.myPets.useQuery();

  if (isLoading) {
    return <LoadingPage />;
  }

  const totalPets = pets?.length || 0;
  const approvedPets = pets?.filter((p) => p.approvalStatus === "approved").length || 0;
  const totalCredits = pets?.reduce((sum, p) => sum + (p.credits || 0), 0) || 0;
  const pendingPets = pets?.filter((p) => p.approvalStatus === "pending").length || 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <Dog />
          </div>
          <div className="page-header-info">
            <h1>Meus Pets</h1>
            <p>Gerencie seus pets cadastrados</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button asChild size="sm" className="btn-sm btn-primary">
            <Link href="/tutor/pets/new">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Novo Pet
            </Link>
          </Button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total</span>
            <Dog className="stat-card-icon primary" />
          </div>
          <div className="stat-card-value">{totalPets}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Aprovados</span>
            <Heart className="stat-card-icon green" />
          </div>
          <div className="stat-card-value">{approvedPets}</div>
        </div>

        <div className={`stat-card ${pendingPets > 0 ? 'highlight' : ''}`}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pendentes</span>
            <Calendar className={`stat-card-icon ${pendingPets > 0 ? 'amber' : 'muted'}`} />
          </div>
          <div className="stat-card-value">{pendingPets}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Dias Totais</span>
            <CreditCard className="stat-card-icon blue" />
          </div>
          <div className="stat-card-value">{totalCredits}</div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <div className="section-card-title">
            <Dog />
            Todos os Pets
            <Badge variant="secondary" className="ml-2">{totalPets}</Badge>
          </div>
        </div>
        <div className="section-card-content">
          {!pets || pets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Dog /></div>
              <div className="empty-state-title">Nenhum pet cadastrado</div>
              <div className="empty-state-description">
                Comece cadastrando seu primeiro pet!
              </div>
              <Button asChild size="sm" className="mt-4">
                <Link href="/tutor/pets/new">Cadastrar Pet</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pets.map((pet) => (
                <Link key={pet.id} href={`/tutor/pets/${pet.id}`}>
                  <div className="p-5 rounded-[14px] bg-card hover:shadow-[0_4px_8px_0_rgba(0,0,0,0.06),0_2px_4px_0_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.04)] transition-all duration-300 ease group border-0 shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_1px_3px_0_rgba(0,0,0,0.05),0_2px_6px_0_rgba(0,0,0,0.02)] hover:translate-y-[-2px]">
                    <div className="flex items-center gap-4">
                      {pet.photoUrl ? (
                        <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[hsl(220_14%_92%)] shadow-[0_2px_4px_0_rgba(0,0,0,0.08)]">
                          <Image
                            src={pet.photoUrl}
                            alt={pet.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <BreedIcon breed={pet.breed} className="h-7 w-7 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="pet-card-name font-bold text-base text-foreground leading-tight truncate">{pet.name}</p>
                        <p className="pet-card-breed text-sm font-medium text-[hsl(220_13%_45%)] mt-0.5 leading-tight truncate">
                          {pet.breed || "Sem raça definida"}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[hsl(220_13%_45%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                      <Badge className={
                        pet.approvalStatus === "approved" ? "badge-success" :
                        pet.approvalStatus === "pending" ? "badge-warning" : "badge-error"
                      }>
                        {pet.approvalStatus === "approved" ? "Aprovado" :
                         pet.approvalStatus === "pending" ? "Pendente" : "Rejeitado"}
                      </Badge>
                      <div className="flex items-center gap-1.5 pet-card-credits text-sm">
                        <CreditCard className="h-4 w-4 text-[hsl(220_13%_45%)]" />
                        <span className="font-semibold text-[hsl(220_16%_38%)]">{pet.credits} dias</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
