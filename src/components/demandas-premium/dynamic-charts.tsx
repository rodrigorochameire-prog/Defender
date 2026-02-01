"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { getStatusConfig, STATUS_GROUPS } from "@/config/demanda-status";

// Paleta de cores premium suaves e sofisticadas (tons pastel equilibrados)
const PREMIUM_COLORS = [
  "#6B7280", // Gray 500 - cinza neutro principal
  "#84CC9B", // Verde suave pastel
  "#8DB4D2", // Azul suave pastel
  "#B8A4C9", // Roxo suave pastel  
  "#D4A574", // Âmbar suave pastel
  "#E8A4B8", // Rosa suave pastel
  "#94A3B8", // Slate 400 - cinza azulado
  "#A7C4BC", // Verde-água suave
  "#C9B8A4", // Bege suave
  "#9EB3C2", // Azul acinzentado
];

// Cores suaves das atribuições (tons pastel harmonizados)
const ATRIBUICAO_COLORS: Record<string, string> = {
  "Tribunal do Júri": "#84CC9B",       // Verde pastel
  "Grupo Especial do Júri": "#D4A574", // Âmbar pastel
  "Violência Doméstica": "#E8C87A",    // Amarelo pastel suave
  "Execução Penal": "#8DB4D2",         // Azul pastel
  "Criminal Geral": "#D4A4A4",         // Rosa/vermelho pastel
  "Substituição": "#B8A4C9",           // Roxo pastel
  "Curadoria Especial": "#94A3B8",     // Slate pastel
};

interface DynamicChartProps {
  type: string;
  demandas: any[];
  visualizationType: string;
}

// Tooltip premium equilibrado e sofisticado
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const color = payload[0].payload.color || payload[0].fill;
    
    return (
      <div 
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl shadow-lg p-4 transition-all animate-in fade-in-0 zoom-in-95 duration-150" 
        style={{
          boxShadow: `0 10px 30px -5px rgba(0, 0, 0, 0.15), 0 0 0 1px ${color}15`,
        }}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div 
            className="w-3 h-3 rounded-full shadow-sm" 
            style={{ 
              backgroundColor: color,
              boxShadow: `0 0 8px ${color}50`
            }}
          />
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{payload[0].name}</p>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total:</p>
          <p className="text-xl font-bold" style={{ color: color }}>
            {payload[0].value}
          </p>
        </div>
        {payload[0].payload.percent && (
          <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {(payload[0].payload.percent * 100).toFixed(1)}% do total
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Label customizado para gráfico de pizza com design premium
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Só mostra label se for maior que 5%
  return percent > 0.05 ? (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-sm font-black drop-shadow-2xl"
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
        paintOrder: 'stroke fill',
        stroke: 'rgba(0,0,0,0.3)',
        strokeWidth: '3px',
        strokeLinejoin: 'round'
      }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

// Label externo para gráfico de pizza (mais elegante)
const renderExternalLabel = ({ cx, cy, midAngle, outerRadius, name, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return percent > 0.03 ? (
    <text
      x={x}
      y={y}
      fill="#52525b"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-bold dark:fill-zinc-400"
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  ) : null;
};

export function DynamicChart({ type, demandas, visualizationType }: DynamicChartProps) {
  // Retorna placeholder se não houver dados
  if (!demandas || demandas.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sem dados para exibir
        </p>
      </div>
    );
  }

  // Chart: Atribuições
  if (type === "atribuicoes") {
    const data = Object.entries(
      demandas.reduce((acc: Record<string, number>, d) => {
        acc[d.atribuicao] = (acc[d.atribuicao] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value], index) => ({ 
        name, 
        value,
        color: ATRIBUICAO_COLORS[name] || PREMIUM_COLORS[index % PREMIUM_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value);

    if (visualizationType === "pizza" || visualizationType === "donut") {
      const innerRadius = visualizationType === "pizza" ? 0 : 80;
      const outerRadius = visualizationType === "pizza" ? 120 : 130;
      
      return (
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`gradient-atrib-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
              {data.map((entry, index) => (
                <filter key={`shadow-${index}`} id={`shadow-atrib-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={entry.color} floodOpacity="0.25"/>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#gradient-atrib-${index})`}
                  stroke="white"
                  strokeWidth={3}
                  filter={`url(#shadow-atrib-${index})`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '25px',
                fontSize: '13px',
                fontWeight: '600'
              }}
              iconType="circle"
              iconSize={12}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "barras") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`barGradient-atrib-${index}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} horizontal={true} vertical={false} />
            <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={130} 
              stroke="#9ca3af" 
              tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 700 }} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
            <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#barGradient-atrib-${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "radar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradient-atrib" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#d4d4d8" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Radar
              name="Atribuições"
              dataKey="value"
              stroke="#10B981"
              fill="url(#radarGradient-atrib)"
              fillOpacity={0.6}
              strokeWidth={3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
  }

  // Chart: Status
  if (type === "status") {
    const data = Object.entries(
      demandas.reduce((acc: Record<string, number>, d) => {
        const config = getStatusConfig(d.status);
        const group = STATUS_GROUPS[config.group];
        acc[group.label] = (acc[group.label] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value]) => {
        const groupKey = Object.keys(STATUS_GROUPS).find(
          (key) => STATUS_GROUPS[key as keyof typeof STATUS_GROUPS].label === name
        );
        const color = groupKey ? STATUS_GROUPS[groupKey as keyof typeof STATUS_GROUPS].color : "#9CA3AF";
        return { name, value, color };
      })
      .sort((a, b) => b.value - a.value);

    if (visualizationType === "pizza" || visualizationType === "donut") {
      const innerRadius = visualizationType === "pizza" ? 0 : 70;
      const outerRadius = visualizationType === "pizza" ? 120 : 130;
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`statusGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
              {data.map((entry, index) => (
                <filter key={`shadow-${index}`} id={`shadow-status-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={entry.color} floodOpacity="0.25"/>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#statusGradient-${index})`}
                  stroke="white"
                  strokeWidth={3}
                  filter={`url(#shadow-status-${index})`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '25px',
                fontSize: '13px',
                fontWeight: '600'
              }}
              iconType="circle"
              iconSize={12}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "barras") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 50, right: 20, top: 20, bottom: 30 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`barGradient-status-${index}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: 700 }} 
              angle={-12} 
              textAnchor="end" 
              height={60}
            />
            <YAxis stroke="#9ca3af" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
            <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={55}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGradient-status-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "radar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradient-status" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#d4d4d8" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Radar
              name="Status"
              dataKey="value"
              stroke="#3B82F6"
              fill="url(#radarGradient-status)"
              fillOpacity={0.6}
              strokeWidth={3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
  }

  // Chart: Atos
  if (type === "atos") {
    const data = Object.entries(
      demandas.reduce((acc: Record<string, number>, d) => {
        acc[d.ato] = (acc[d.ato] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value], index) => ({ 
        name, 
        value,
        color: PREMIUM_COLORS[index % PREMIUM_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (visualizationType === "pizza" || visualizationType === "donut") {
      const innerRadius = visualizationType === "pizza" ? 0 : 70;
      const outerRadius = visualizationType === "pizza" ? 100 : 110;
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`atoGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
              {data.map((entry, index) => (
                <filter key={`shadow-${index}`} id={`shadow-ato-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={entry.color} floodOpacity="0.25"/>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#atoGradient-${index})`}
                  stroke="white"
                  strokeWidth={3}
                  filter={`url(#shadow-ato-${index})`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ 
                paddingTop: '10px',
                fontSize: '10px',
                fontWeight: '600',
                maxHeight: '80px',
                overflowY: 'auto'
              }}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                // Limitar o tamanho do texto
                return value.length > 20 ? value.substring(0, 20) + '...' : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "barras") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 50, right: 20, top: 50, bottom: 70 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`barGradient-ato-${index}`} x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 700 }} 
              angle={-35} 
              textAnchor="end" 
              height={80}
            />
            <YAxis stroke="#9ca3af" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }} />
            <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={45}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#barGradient-ato-${index})`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "radar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradient-ato" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#d4d4d8" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#3f3f46', fontSize: 10, fontWeight: 700 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Radar
              name="Tipos de Atos"
              dataKey="value"
              stroke="#8B5CF6"
              fill="url(#radarGradient-ato)"
              fillOpacity={0.6}
              strokeWidth={3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
  }

  // Chart: Situação Prisional
  if (type === "situacao-prisional") {
    const estadoPrisionaisLabels: Record<string, string> = {
      preso: "Preso",
      solto: "Solto",
      monitorado: "Monitorado",
      domiciliar: "Domiciliar",
      cautelar: "Cautelar",
      preso_outro: "Preso (Outro)",
    };

    const estadoPrisionaisColors: Record<string, string> = {
      preso: "#D4A4A4",      // Rosa/vermelho pastel
      solto: "#84CC9B",      // Verde pastel
      monitorado: "#8DB4D2", // Azul pastel
      domiciliar: "#E8C87A", // Amarelo pastel
      cautelar: "#B8A4C9",   // Roxo pastel
      preso_outro: "#C9A4A4", // Rosa pastel mais claro
    };

    const data = Object.entries(
      demandas.reduce((acc: Record<string, number>, d) => {
        const estado = d.estadoPrisional || "solto";
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([name, value]) => ({
        name: estadoPrisionaisLabels[name] || name,
        value,
        color: estadoPrisionaisColors[name] || "#9CA3AF",
      }))
      .sort((a, b) => b.value - a.value);

    if (visualizationType === "pizza" || visualizationType === "donut") {
      const innerRadius = visualizationType === "pizza" ? 0 : 70;
      const outerRadius = visualizationType === "pizza" ? 120 : 130;
      
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`prisionalGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
              {data.map((entry, index) => (
                <filter key={`shadow-${index}`} id={`shadow-prisional-${index}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={entry.color} floodOpacity="0.25"/>
                </filter>
              ))}
            </defs>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={`url(#prisionalGradient-${index})`}
                  stroke="white"
                  strokeWidth={3}
                  filter={`url(#shadow-prisional-${index})`}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '25px',
                fontSize: '13px',
                fontWeight: '600'
              }}
              iconType="circle"
              iconSize={12}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "barras") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient key={index} id={`barGradient-prisional-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              tick={{ fill: '#3f3f46', fontSize: 12, fontWeight: 700 }} 
            />
            <YAxis stroke="#9ca3af" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 600 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} />
            <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={55}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGradient-prisional-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (visualizationType === "radar") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <linearGradient id="radarGradient-prisional" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#d4d4d8" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: '#3f3f46', fontSize: 11, fontWeight: 700 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'auto']}
              tick={{ fill: '#71717a', fontSize: 10 }}
            />
            <Radar
              name="Situação Prisional"
              dataKey="value"
              stroke="#DC2626"
              fill="url(#radarGradient-prisional)"
              fillOpacity={0.6}
              strokeWidth={3}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      );
    }
  }

  return (
    <div className="h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400">
      Gráfico: {type}
    </div>
  );
}