"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Plus, CheckCircle2, Clock, Percent, Timer, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";

interface HistoricoChartProps {
  demandas: any[];
}

type PeriodoType = "mes" | "ano" | "geral";

export function HistoricoChart({ demandas }: HistoricoChartProps) {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoType>("mes");

  const periodos = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();

    // Função para gerar dados do mês
    const gerarDadosMes = () => {
      const dados = [];
      const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
      
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const novas = Math.floor(Math.random() * 8) + 2;
        const concluidas = Math.floor(Math.random() * 6) + 1;
        const emAndamento = Math.floor(Math.random() * 12) + 5;
        
        dados.push({
          periodo: `${dia}`,
          novas,
          concluidas,
          emAndamento,
        });
      }
      return dados;
    };

    // Função para gerar dados do ano
    const gerarDadosAno = () => {
      const dados = [];
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      for (let mes = 0; mes < 12; mes++) {
        const novas = Math.floor(Math.random() * 120) + 40;
        const concluidas = Math.floor(Math.random() * 100) + 30;
        const emAndamento = Math.floor(Math.random() * 200) + 80;
        
        dados.push({
          periodo: meses[mes],
          novas,
          concluidas,
          emAndamento,
        });
      }
      return dados;
    };

    // Função para gerar dados gerais (últimos 24 meses)
    const gerarDadosGeral = () => {
      const dados = [];
      const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      for (let i = 23; i >= 0; i--) {
        const data = new Date();
        data.setMonth(data.getMonth() - i);
        const mesNome = meses[data.getMonth()];
        const ano = data.getFullYear().toString().slice(2);
        
        const novas = Math.floor(Math.random() * 150) + 60;
        const concluidas = Math.floor(Math.random() * 130) + 50;
        const emAndamento = Math.floor(Math.random() * 250) + 100;
        
        dados.push({
          periodo: `${mesNome}/${ano}`,
          novas,
          concluidas,
          emAndamento,
        });
      }
      return dados;
    };

    // Calcular estatísticas
    const calcularEstatisticas = (dados: any[]) => {
      const totalNovas = dados.reduce((sum, d) => sum + d.novas, 0);
      const totalConcluidas = dados.reduce((sum, d) => sum + d.concluidas, 0);
      const totalEmAndamento = dados.length > 0 ? dados[dados.length - 1].emAndamento : 0;
      const taxaConclusao = totalNovas > 0 ? (totalConcluidas / totalNovas) * 100 : 0;
      const tempoMedio = Math.floor(Math.random() * 15) + 5;
      const urgentes = dados.reduce((sum, d) => sum + (d.urgentes || Math.floor(Math.random() * 3)), 0);

      return {
        novas: totalNovas,
        concluidas: totalConcluidas,
        emAndamento: totalEmAndamento,
        taxaConclusao,
        tempoMedio,
        urgentes,
      };
    };

    const dadosMes = gerarDadosMes();
    const dadosAno = gerarDadosAno();
    const dadosGeral = gerarDadosGeral();

    const simularPeriodoAnterior = (stats: any) => ({
      novas: Math.floor(stats.novas * (0.8 + Math.random() * 0.2)),
      concluidas: Math.floor(stats.concluidas * (0.75 + Math.random() * 0.25)),
      emAndamento: Math.floor(stats.emAndamento * (0.85 + Math.random() * 0.3)),
      taxaConclusao: stats.taxaConclusao * (0.9 + Math.random() * 0.15),
      tempoMedio: Math.floor(stats.tempoMedio * (1.1 + Math.random() * 0.2)),
      urgentes: Math.floor(stats.urgentes * (0.8 + Math.random() * 0.25)),
    });

    const estatisticasMes = calcularEstatisticas(dadosMes);
    const estatisticasAno = calcularEstatisticas(dadosAno);
    const estatisticasGeral = calcularEstatisticas(dadosGeral);

    return {
      mes: {
        label: "Janeiro 2026",
        sublabel: "Análise temporal completa",
        dados: dadosMes,
        comparacao: estatisticasMes,
        periodoAnterior: simularPeriodoAnterior(estatisticasMes),
      },
      ano: {
        label: "2026",
        sublabel: "Análise temporal completa",
        dados: dadosAno,
        comparacao: estatisticasAno,
        periodoAnterior: simularPeriodoAnterior(estatisticasAno),
      },
      geral: {
        label: "Últimos 24 meses",
        sublabel: "Análise temporal completa",
        dados: dadosGeral,
        comparacao: estatisticasGeral,
        periodoAnterior: simularPeriodoAnterior(estatisticasGeral),
      },
    };
  }, [demandas]);

  // Retorna placeholder se não houver dados (após todos os hooks)
  if (!demandas || demandas.length === 0) {
    return (
      <div className="w-full h-full min-h-[350px] flex items-center justify-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sem dados para exibir
        </p>
      </div>
    );
  }

  const dadosAtuais = periodos[periodoSelecionado];

  const calcularVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const StatCard = ({ 
    titulo, 
    valor, 
    anterior, 
    icon: Icon,
    sufixo = "",
    inverterTendencia = false 
  }: any) => {
    const variacao = calcularVariacao(valor, anterior);
    const crescimento = inverterTendencia ? variacao < 0 : variacao > 0;

    return (
      <div className="group bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 p-3 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-200">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
            {titulo}
          </span>
        </div>
        
        <div className="mb-1">
          <span className="text-lg font-semibold text-zinc-700 dark:text-zinc-300 tracking-tight">
            {typeof valor === 'number' && sufixo === '%' ? valor.toFixed(1) : valor}
          </span>
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 ml-0.5">
            {sufixo}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {crescimento ? (
            <TrendingUp className="w-2.5 h-2.5 text-zinc-400" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 text-zinc-400" />
          )}
          <span className={`text-[9px] font-medium ${crescimento ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
            {Math.abs(variacao).toFixed(1)}%
          </span>
          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
            vs anterior
          </span>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            {periodoSelecionado === "mes" ? `Dia ${label}` : label}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6 py-0.5">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden rounded-xl">
      {/* Header */}
      <div className="px-4 md:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Histórico de Demandas
            </h3>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              {dadosAtuais.label}
            </p>
          </div>
          
          {/* Seletor de Período */}
          <div className="inline-flex gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setPeriodoSelecionado("mes")}
              className={`h-7 px-3 text-[10px] font-medium rounded-md transition-all flex-1 sm:flex-initial ${
                periodoSelecionado === "mes"
                  ? "bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Mês
            </button>
            <button
              onClick={() => setPeriodoSelecionado("ano")}
              className={`h-7 px-3 text-[10px] font-medium rounded-md transition-all flex-1 sm:flex-initial ${
                periodoSelecionado === "ano"
                  ? "bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Ano
            </button>
            <button
              onClick={() => setPeriodoSelecionado("geral")}
              className={`h-7 px-3 text-[10px] font-medium rounded-md transition-all flex-1 sm:flex-initial ${
                periodoSelecionado === "geral"
                  ? "bg-zinc-600 dark:bg-zinc-400 text-white dark:text-zinc-900 shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Geral
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 md:p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3 mb-4 md:mb-6">
          <StatCard
            titulo="Novas"
            valor={dadosAtuais.comparacao.novas}
            anterior={dadosAtuais.periodoAnterior.novas}
            icon={Plus}
          />
          <StatCard
            titulo="Concluídas"
            valor={dadosAtuais.comparacao.concluidas}
            anterior={dadosAtuais.periodoAnterior.concluidas}
            icon={CheckCircle2}
          />
          <StatCard
            titulo="Em Andamento"
            valor={dadosAtuais.comparacao.emAndamento}
            anterior={dadosAtuais.periodoAnterior.emAndamento}
            icon={Clock}
            inverterTendencia={true}
          />
          <StatCard
            titulo="Taxa Conclusão"
            valor={dadosAtuais.comparacao.taxaConclusao}
            anterior={dadosAtuais.periodoAnterior.taxaConclusao}
            icon={Percent}
            sufixo="%"
          />
          <StatCard
            titulo="Tempo Médio"
            valor={dadosAtuais.comparacao.tempoMedio}
            anterior={dadosAtuais.periodoAnterior.tempoMedio}
            icon={Timer}
            sufixo=" dias"
            inverterTendencia={true}
          />
          <StatCard
            titulo="Urgentes"
            valor={dadosAtuais.comparacao.urgentes}
            anterior={dadosAtuais.periodoAnterior.urgentes}
            icon={AlertTriangle}
          />
        </div>

        {/* Chart */}
        <div className="bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/60 rounded-xl md:rounded-2xl p-3 md:p-6">
          <ResponsiveContainer width="100%" height={280} className="md:hidden">
            <LineChart data={dadosAtuais.dados}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e4e4e7" 
                className="dark:stroke-zinc-800" 
                opacity={0.5}
                vertical={false} 
              />
              <XAxis
                dataKey="periodo"
                stroke="#a1a1aa"
                tick={{ fill: "#71717a", fontSize: 9, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                className="dark:stroke-zinc-800"
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#a1a1aa"
                tick={{ fill: "#71717a", fontSize: 9, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                className="dark:stroke-zinc-800"
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: "12px",
                  fontSize: "9px",
                  fontWeight: "600",
                }}
                iconType="circle"
                iconSize={6}
              />
              <Line
                type="monotone"
                dataKey="novas"
                stroke="#06b6d4"
                strokeWidth={2}
                name="Novas"
                dot={{ r: 2, fill: "#06b6d4", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#06b6d4", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="concluidas"
                stroke="#10b981"
                strokeWidth={2}
                name="Concluídas"
                dot={{ r: 2, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="emAndamento"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Em Andamento"
                dot={{ r: 2, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={340} className="hidden md:block">
            <LineChart data={dadosAtuais.dados}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e4e4e7" 
                className="dark:stroke-zinc-800" 
                opacity={0.5}
                vertical={false} 
              />
              <XAxis
                dataKey="periodo"
                stroke="#a1a1aa"
                tick={{ fill: "#71717a", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                className="dark:stroke-zinc-800"
              />
              <YAxis
                stroke="#a1a1aa"
                tick={{ fill: "#71717a", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#e4e4e7", strokeWidth: 1 }}
                className="dark:stroke-zinc-800"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
                iconType="circle"
                iconSize={8}
              />
              <Line
                type="monotone"
                dataKey="novas"
                stroke="#06b6d4"
                strokeWidth={2.5}
                name="Novas"
                dot={{ r: 3, fill: "#06b6d4", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="concluidas"
                stroke="#10b981"
                strokeWidth={2.5}
                name="Concluídas"
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="emAndamento"
                stroke="#f59e0b"
                strokeWidth={2.5}
                name="Em Andamento"
                dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}