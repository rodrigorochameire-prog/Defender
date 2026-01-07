import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { trpc } from "@/lib/trpc";

interface MoodChartProps {
  petId: number;
}

const moodColors: Record<string, string> = {
  happy: "#10b981",
  calm: "#3b82f6",
  anxious: "#f59e0b",
  aggressive: "#ef4444",
  playful: "#8b5cf6",
};

const moodLabels: Record<string, string> = {
  happy: "Feliz",
  calm: "Calmo",
  anxious: "Ansioso",
  aggressive: "Agressivo",
  playful: "Brincalhão",
};

export default function MoodChart({ petId }: MoodChartProps) {
  const { data: moodHistory, isLoading } = trpc.pets.getMoodHistory.useQuery({ petId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Humor</CardTitle>
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

  if (!moodHistory || moodHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise de Humor</CardTitle>
          <CardDescription>Distribuição de humor ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum registro de humor encontrado
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count mood occurrences
  const moodCounts: Record<string, number> = {};
  moodHistory.forEach((record: any) => {
    moodCounts[record.mood] = (moodCounts[record.mood] || 0) + 1;
  });

  const chartData = Object.entries(moodCounts).map(([mood, count]) => ({
    mood: moodLabels[mood] || mood,
    count,
    fill: moodColors[mood] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise de Humor</CardTitle>
        <CardDescription>
          Distribuição de humor ({moodHistory.length} registros)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mood" />
            <YAxis label={{ value: "Ocorrências", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
