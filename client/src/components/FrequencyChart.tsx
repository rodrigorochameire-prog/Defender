import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { trpc } from "@/lib/trpc";

interface FrequencyChartProps {
  petId: number;
}

export default function FrequencyChart({ petId }: FrequencyChartProps) {
  const { data: frequencyStats, isLoading } = trpc.pets.getFrequencyStats.useQuery({ petId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Frequência na Creche</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!frequencyStats || frequencyStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Frequência na Creche</CardTitle>
          <CardDescription>Dias de presença por mês</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum registro de frequência encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Frequência na Creche</CardTitle>
        <CardDescription>
          Dias de presença por mês ({frequencyStats.length} meses)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={frequencyStats}>
            <defs>
              <linearGradient id="colorFrequency" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis label={{ value: "Dias", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="frequency"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorFrequency)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
