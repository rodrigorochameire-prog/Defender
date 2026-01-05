"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  Receipt,
  BarChart3,
  CircleDollarSign,
  Dog
} from "lucide-react";
import { LoadingPage } from "@/components/shared/loading";

export default function AdminFinances() {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  const { data: summary, isLoading } = trpc.finances.summary.useQuery();
  const { data: monthlyReport } = trpc.finances.monthlyReport.useQuery({ year, month });

  if (isLoading) {
    return <LoadingPage />;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="page-header-icon">
            <CircleDollarSign />
          </div>
          <div className="page-header-info">
            <h1>Finanças</h1>
            <p>Visão geral financeira da creche</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
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

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card col-span-2">
          <div className="stat-card-header">
            <span className="title">Receita Estimada</span>
            <DollarSign className="icon text-primary" />
          </div>
          <div className="stat-card-value text-primary">
            {formatCurrency(summary?.estimatedRevenue || 0)}
          </div>
          <p className="stat-card-description">Baseado em créditos ativos</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Total de Créditos</span>
            <CreditCard className="icon text-blue-500" />
          </div>
          <div className="stat-card-value">{summary?.totalCredits || 0}</div>
          <p className="stat-card-description">Em circulação</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="title">Pets Ativos</span>
            <Dog className="icon text-primary" />
          </div>
          <div className="stat-card-value">{summary?.activePets || 0}</div>
          <p className="stat-card-description">Aprovados</p>
        </div>
      </div>

      {/* Monthly Report */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">
            <BarChart3 className="icon" />
            Relatório de {monthNames[month - 1]} {year}
          </CardTitle>
          <CardDescription className="section-card-description">
            Resumo financeiro do período
          </CardDescription>
        </CardHeader>
        <CardContent className="section-card-content">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Vendas */}
            <div className="p-5 rounded-xl border bg-green-50/50 dark:bg-green-950/20 border-green-200/50 dark:border-green-800/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Vendas</span>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(monthlyReport?.purchases?.total || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {monthlyReport?.purchases?.count || 0} transações
              </p>
            </div>

            {/* Reembolsos */}
            <div className="p-5 rounded-xl border bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Reembolsos</span>
                <ArrowDownRight className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(monthlyReport?.refunds?.total || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {monthlyReport?.refunds?.count || 0} transações
              </p>
            </div>

            {/* Receita Líquida */}
            <div className="p-5 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Receita Líquida</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(monthlyReport?.netRevenue || 0)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Vendas - Reembolsos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <Card className="section-card">
        <CardHeader className="section-card-header">
          <CardTitle className="section-card-title">
            <Package className="icon" />
            Pacotes de Créditos
          </CardTitle>
          <CardDescription className="section-card-description">
            {summary?.packages?.length || 0} pacotes disponíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="section-card-content">
          {!summary?.packages || summary.packages.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-text">Nenhum pacote cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">{pkg.name}</span>
                    {pkg.discountPercent > 0 && (
                      <Badge className="badge-green">-{pkg.discountPercent}%</Badge>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                  )}
                  <div className="text-2xl font-bold text-primary mb-2">
                    {formatCurrency(pkg.priceInCents)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5 inline mr-1" />
                      {pkg.credits} créditos
                    </span>
                    <Badge className={pkg.isActive ? "badge-green" : "badge-neutral"}>
                      {pkg.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
