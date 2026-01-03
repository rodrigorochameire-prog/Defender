"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingUp, 
  CreditCard, 
  DollarSign,
  Package,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export default function AdminFinances() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const { data: summary, isLoading } = trpc.finances.summary.useQuery();
  const { data: monthlyReport } = trpc.finances.monthlyReport.useQuery({ year, month });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanças</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral financeira da creche
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(summary?.estimatedRevenue || 0)}
            </div>
            <p className="text-xs text-green-600/80 mt-1">
              Baseado em créditos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Créditos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalCredits || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em circulação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pets Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.activePets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pacotes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.packages?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Disponíveis para venda
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Relatório Mensal</CardTitle>
              <CardDescription>
                Visualize o resumo financeiro por mês
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {new Date(2000, i).toLocaleString("pt-BR", { month: "long" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => (
                    <SelectItem key={i} value={String(currentDate.getFullYear() - i)}>
                      {currentDate.getFullYear() - i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Vendas</span>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(monthlyReport?.purchases?.total || 0)}
              </p>
              <p className="text-xs text-green-600/80 mt-1">
                {monthlyReport?.purchases?.count || 0} transações
              </p>
            </div>

            <div className="p-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Reembolsos</span>
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {formatCurrency(monthlyReport?.refunds?.total || 0)}
              </p>
              <p className="text-xs text-red-600/80 mt-1">
                {monthlyReport?.refunds?.count || 0} transações
              </p>
            </div>

            <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Receita Líquida</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCurrency(monthlyReport?.netRevenue || 0)}
              </p>
              <p className="text-xs text-blue-600/80 mt-1">
                Vendas - Reembolsos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Pacotes de Créditos</CardTitle>
          <CardDescription>
            Pacotes disponíveis para venda
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!summary?.packages || summary.packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pacote cadastrado
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary.packages.map((pkg) => (
                <Card key={pkg.id} className="relative">
                  {pkg.discountPercent > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-green-500">
                      -{pkg.discountPercent}%
                    </Badge>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    {pkg.description && (
                      <CardDescription>{pkg.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">
                        {formatCurrency(pkg.priceInCents)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {pkg.credits} créditos inclusos
                    </p>
                    <Badge variant="outline" className="mt-3">
                      {pkg.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
