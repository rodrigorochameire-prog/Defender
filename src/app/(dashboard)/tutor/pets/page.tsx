"use client";

import React from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dog, Plus, CreditCard, Calendar, Heart } from "lucide-react";
import Link from "next/link";
import { LoadingPage } from "@/components/shared/loading";
import { PetCard } from "@/components/pet-card";

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
                <PetCard
                  key={pet.id}
                  pet={pet}
                  variant="compact"
                  showActions={false}
                  showCreditsBar={false}
                  href={`/tutor/pets/${pet.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
