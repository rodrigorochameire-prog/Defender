/**
 * AI Functions - Cérebro da Creche
 * 
 * Funções de IA para:
 * - Sumarização de logs (Relatório Semanal)
 * - Análise de sentimento comportamental
 * - Otimização de matilha (Matchmaking)
 */

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "@/lib/db";
import { pets, dailyLogs, behaviorLogs, calendarEvents } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// Configuração do modelo (usa GPT-4o-mini por custo-benefício)
const model = openai("gpt-4o-mini");

// ============================================
// SUMARIZAÇÃO DE LOGS - RELATÓRIO SEMANAL
// ============================================

interface WeeklyReportData {
  petName: string;
  breed: string;
  logs: Array<{
    date: string;
    mood: string;
    appetite: string;
    energy: string;
    stool: string;
    notes: string;
  }>;
  behaviorLogs: Array<{
    date: string;
    socialization: string;
    energy: string;
    obedience: string;
    anxiety: string;
    activities: string;
  }>;
}

export async function generateWeeklyReport(
  petId: number,
  startDate: string,
  endDate: string
): Promise<string> {
  // Buscar dados do pet
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, petId),
  });

  if (!pet) {
    throw new Error("Pet not found");
  }

  // Buscar logs diários do período
  const logs = await db.query.dailyLogs.findMany({
    where: and(
      eq(dailyLogs.petId, petId),
      gte(dailyLogs.logDate, new Date(startDate)),
      lte(dailyLogs.logDate, new Date(endDate))
    ),
    orderBy: [desc(dailyLogs.logDate)],
  });

  // Buscar logs de comportamento
  const behaviors = await db.query.behaviorLogs.findMany({
    where: and(
      eq(behaviorLogs.petId, petId),
      gte(behaviorLogs.logDate, new Date(startDate)),
      lte(behaviorLogs.logDate, new Date(endDate))
    ),
    orderBy: [desc(behaviorLogs.logDate)],
  });

  // Preparar contexto para a IA
  const reportData: WeeklyReportData = {
    petName: pet.name,
    breed: pet.breed || "Raça não especificada",
    logs: logs.map(log => ({
      date: log.logDate.toLocaleDateString("pt-BR"),
      mood: log.mood || "não registrado",
      appetite: log.appetite || "não registrado",
      energy: log.energy || "não registrado",
      stool: log.stool || "não registrado",
      notes: log.notes || "",
    })),
    behaviorLogs: behaviors.map(b => ({
      date: b.logDate.toLocaleDateString("pt-BR"),
      socialization: b.socialization || "não registrado",
      energy: b.energy || "não registrado",
      obedience: b.obedience || "não registrado",
      anxiety: b.anxiety || "não registrado",
      activities: b.activities || "não registradas",
    })),
  };

  // Gerar relatório com IA
  const { text } = await generateText({
    model,
    system: `Você é um especialista em comportamento canino que trabalha numa creche para cães chamada TeteCare.
Sua tarefa é gerar relatórios semanais concisos e informativos para os tutores dos pets.
O relatório deve ser:
- Carinhoso e profissional
- Focado em pontos positivos e áreas de atenção
- Com recomendações práticas quando aplicável
- Escrito em português do Brasil
- Formatado com emojis apropriados para tornar a leitura agradável`,
    prompt: `Gere um relatório semanal para ${reportData.petName} (${reportData.breed}).

DADOS DO PERÍODO:

Logs Diários:
${JSON.stringify(reportData.logs, null, 2)}

Logs de Comportamento:
${JSON.stringify(reportData.behaviorLogs, null, 2)}

Por favor, crie um relatório com as seguintes seções:
1. 📊 Resumo da Semana
2. 🐕 Comportamento e Socialização
3. 🍽️ Alimentação e Saúde
4. ⚡ Nível de Energia e Atividades
5. 💡 Recomendações para Casa
6. 🌟 Destaques da Semana`,
  });

  return text;
}

// ============================================
// ANÁLISE DE SENTIMENTO COMPORTAMENTAL
// ============================================

interface BehaviorAnalysis {
  petId: number;
  petName: string;
  overallTrend: "improving" | "stable" | "declining" | "attention_needed";
  alerts: Array<{
    type: "stress" | "anxiety" | "aggression" | "health" | "social";
    severity: "low" | "medium" | "high";
    message: string;
    recommendation: string;
  }>;
  summary: string;
}

export async function analyzeBehaviorPatterns(
  petId: number,
  daysToAnalyze: number = 7
): Promise<BehaviorAnalysis> {
  // Buscar dados do pet
  const pet = await db.query.pets.findFirst({
    where: eq(pets.id, petId),
  });

  if (!pet) {
    throw new Error("Pet not found");
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToAnalyze);

  // Buscar logs de comportamento
  const behaviors = await db.query.behaviorLogs.findMany({
    where: and(
      eq(behaviorLogs.petId, petId),
      gte(behaviorLogs.logDate, startDate)
    ),
    orderBy: [desc(behaviorLogs.logDate)],
  });

  // Buscar logs diários
  const logs = await db.query.dailyLogs.findMany({
    where: and(
      eq(dailyLogs.petId, petId),
      gte(dailyLogs.logDate, startDate)
    ),
    orderBy: [desc(dailyLogs.logDate)],
  });

  // Analisar com IA
  const { text } = await generateText({
    model,
    system: `Você é um especialista em comportamento canino com experiência em identificar padrões e sinais precoces de stress, ansiedade ou problemas de socialização.
Analise os dados e retorne uma análise estruturada em formato JSON.`,
    prompt: `Analise os padrões comportamentais de ${pet.name} nos últimos ${daysToAnalyze} dias.

LOGS DE COMPORTAMENTO:
${JSON.stringify(behaviors.map(b => ({
  date: b.logDate.toLocaleDateString("pt-BR"),
  socialization: b.socialization,
  energy: b.energy,
  obedience: b.obedience,
  anxiety: b.anxiety,
  aggression: b.aggression,
  activities: b.activities,
  notes: b.notes,
})), null, 2)}

LOGS DIÁRIOS:
${JSON.stringify(logs.map(l => ({
  date: l.logDate.toLocaleDateString("pt-BR"),
  mood: l.mood,
  energy: l.energy,
  stool: l.stool,
  appetite: l.appetite,
  notes: l.notes,
})), null, 2)}

Retorne um JSON com a seguinte estrutura:
{
  "overallTrend": "improving" | "stable" | "declining" | "attention_needed",
  "alerts": [
    {
      "type": "stress" | "anxiety" | "aggression" | "health" | "social",
      "severity": "low" | "medium" | "high",
      "message": "descrição do alerta",
      "recommendation": "recomendação prática"
    }
  ],
  "summary": "resumo geral em 2-3 frases"
}`,
  });

  try {
    // Extrair JSON da resposta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    return {
      petId,
      petName: pet.name,
      overallTrend: analysis.overallTrend || "stable",
      alerts: analysis.alerts || [],
      summary: analysis.summary || "Análise inconclusiva",
    };
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return {
      petId,
      petName: pet.name,
      overallTrend: "stable",
      alerts: [],
      summary: "Não foi possível analisar os padrões comportamentais.",
    };
  }
}

// ============================================
// OTIMIZAÇÃO DE MATILHA (MATCHMAKING)
// ============================================

interface RoomSuggestion {
  petId: number;
  petName: string;
  currentRoom?: string;
  suggestedRoom: string;
  reason: string;
  priority: "low" | "medium" | "high";
}

export async function optimizeRoomAssignments(date: string): Promise<RoomSuggestion[]> {
  // Buscar pets com check-in no dia
  const targetDate = new Date(date);
  
  const events = await db.query.calendarEvents.findMany({
    where: and(
      eq(calendarEvents.eventType, "checkin"),
      gte(calendarEvents.eventDate, targetDate),
      lte(calendarEvents.eventDate, new Date(targetDate.getTime() + 24 * 60 * 60 * 1000))
    ),
    with: {
      pet: true,
    },
  });

  if (events.length === 0) {
    return [];
  }

  // Buscar informações detalhadas dos pets
  const petIds = events.map(e => e.petId).filter((id): id is number => id !== null);
  
  const petsData = await db.query.pets.findMany({
    where: eq(pets.approvalStatus, "approved"),
  });

  const petsInfo = petsData.filter(p => petIds.includes(p.id)).map(p => ({
    id: p.id,
    name: p.name,
    breed: p.breed,
    weight: p.weight ? p.weight / 1000 : null, // kg
    energyLevel: p.energyLevel,
    notes: p.notes,
  }));

  // Buscar últimos comportamentos de cada pet
  const recentBehaviors = await Promise.all(
    petIds.map(async (petId) => {
      const behavior = await db.query.behaviorLogs.findFirst({
        where: eq(behaviorLogs.petId, petId),
        orderBy: [desc(behaviorLogs.logDate)],
      });
      return { petId, behavior };
    })
  );

  // Criar mapa de comportamentos
  const behaviorMap = new Map(
    recentBehaviors.map(b => [b.petId, b.behavior])
  );

  // Preparar dados para IA
  const petsWithBehavior = petsInfo.map(p => ({
    ...p,
    lastBehavior: behaviorMap.get(p.id) ? {
      socialization: behaviorMap.get(p.id)?.socialization,
      energy: behaviorMap.get(p.id)?.energy,
      anxiety: behaviorMap.get(p.id)?.anxiety,
      aggression: behaviorMap.get(p.id)?.aggression,
    } : null,
  }));

  // Analisar com IA
  const { text } = await generateText({
    model,
    system: `Você é um especialista em comportamento canino e gerenciamento de creches para cães.
Sua tarefa é otimizar a distribuição de cães nas salas para:
1. Manter equilíbrio de energia (não muitos cães de alta energia juntos)
2. Evitar conflitos (separar cães com tendência à agressividade)
3. Promover socialização positiva
4. Considerar tamanho e peso dos animais`,
    prompt: `Analise os seguintes pets que estarão na creche hoje e sugira a melhor distribuição em salas.

PETS CONFIRMADOS:
${JSON.stringify(petsWithBehavior, null, 2)}

Considere 3 salas:
- Sala A: Cães de alta energia e porte médio/grande
- Sala B: Cães de energia moderada, todos os portes
- Sala C: Cães de baixa energia, porte pequeno ou sensíveis

Retorne um JSON array com sugestões apenas para pets que deveriam mudar de sala ou precisam de atenção especial:
[
  {
    "petId": number,
    "petName": string,
    "suggestedRoom": "A" | "B" | "C",
    "reason": "motivo da sugestão",
    "priority": "low" | "medium" | "high"
  }
]

Se todos os pets estão bem distribuídos, retorne um array vazio.`,
  });

  try {
    // Extrair JSON da resposta
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }
    
    const suggestions = JSON.parse(jsonMatch[0]) as RoomSuggestion[];
    return suggestions;
  } catch (error) {
    console.error("Error parsing AI response:", error);
    return [];
  }
}
