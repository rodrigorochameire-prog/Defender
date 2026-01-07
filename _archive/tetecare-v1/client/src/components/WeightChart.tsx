import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";

interface WeightChartProps {
  petId: number;
}

export default function WeightChart({ petId }: WeightChartProps) {
  const { data: weightHistory, isLoading } = trpc.pets.getWeightHistory.useQuery({ petId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Peso</CardTitle>
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

  if (!weightHistory || weightHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Peso</CardTitle>
          <CardDescription>Histórico de peso ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum registro de peso encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = weightHistory.map((record: any) => ({
    date: new Date(record.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    weight: record.weight / 1000, // Convert grams to kg
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Peso</CardTitle>
        <CardDescription>
          Histórico de peso ao longo do tempo ({chartData.length} registros)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} kg`, "Peso"]}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
