/**
 * Axiom Integration - Monitorização de Performance
 * 
 * Este módulo integra o Axiom para monitorização de performance,
 * permitindo ver exatamente quanto tempo cada query do Drizzle levou
 * e onde o sistema está lento.
 */

// Tipos para métricas customizadas
interface QueryMetric {
  query: string;
  duration: number;
  timestamp: Date;
  table?: string;
  operation?: "select" | "insert" | "update" | "delete";
}

interface ApiMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
}

// Logger para métricas customizadas
class MetricsLogger {
  private axiomToken: string | undefined;
  private axiomDataset: string;

  constructor() {
    this.axiomToken = process.env.AXIOM_TOKEN;
    this.axiomDataset = process.env.AXIOM_DATASET || "tetecare";
  }

  private async send(data: Record<string, unknown>[]) {
    if (!this.axiomToken) {
      // Em desenvolvimento, apenas loga no console
      if (process.env.NODE_ENV === "development") {
        console.log("[Axiom Mock]", JSON.stringify(data, null, 2));
      }
      return;
    }

    try {
      await fetch(`https://api.axiom.co/v1/datasets/${this.axiomDataset}/ingest`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.axiomToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error("[Axiom] Failed to send metrics:", error);
    }
  }

  async logQuery(metric: QueryMetric) {
    await this.send([{
      _time: metric.timestamp.toISOString(),
      type: "query",
      query: metric.query.substring(0, 500), // Limitar tamanho
      duration_ms: metric.duration,
      table: metric.table,
      operation: metric.operation,
    }]);
  }

  async logApi(metric: ApiMetric) {
    await this.send([{
      _time: metric.timestamp.toISOString(),
      type: "api",
      endpoint: metric.endpoint,
      method: metric.method,
      duration_ms: metric.duration,
      status_code: metric.statusCode,
    }]);
  }

  async logEvent(eventName: string, data: Record<string, unknown>) {
    await this.send([{
      _time: new Date().toISOString(),
      type: "event",
      event: eventName,
      ...data,
    }]);
  }
}

export const metrics = new MetricsLogger();

// Wrapper para medir tempo de queries
export function withQueryTiming<T>(
  queryFn: () => Promise<T>,
  queryName: string,
  table?: string,
  operation?: QueryMetric["operation"]
): Promise<T> {
  const start = performance.now();
  
  return queryFn().finally(() => {
    const duration = performance.now() - start;
    metrics.logQuery({
      query: queryName,
      duration,
      timestamp: new Date(),
      table,
      operation,
    });
  });
}

// Wrapper para medir tempo de API calls
export async function withApiTiming<T>(
  apiFn: () => Promise<T>,
  endpoint: string,
  method: string
): Promise<{ result: T; statusCode: number }> {
  const start = performance.now();
  let statusCode = 200;
  
  try {
    const result = await apiFn();
    return { result, statusCode };
  } catch (error: unknown) {
    statusCode = (error as { status?: number })?.status || 500;
    throw error;
  } finally {
    const duration = performance.now() - start;
    metrics.logApi({
      endpoint,
      method,
      duration,
      statusCode,
      timestamp: new Date(),
    });
  }
}
