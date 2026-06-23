import { describe, it, expect } from "vitest";
import {
  ordenarAlertas,
  contarPorSeveridade,
  type AlertaUnificado,
} from "@/components/central-inteligencia/ordenar";

function alerta(
  id: string,
  severidade: AlertaUnificado["severidade"],
  tipo: AlertaUnificado["tipo"] = "Execução",
): AlertaUnificado {
  return {
    id,
    severidade,
    tipo,
    titulo: `motivo ${id}`,
    rotulo: "Sinal",
    assistidoNome: "Fulano",
    processoNumero: "0000000-00.0000.0.00.0000",
    href: "/admin/processos/1",
  };
}

describe("ordenarAlertas", () => {
  it("ordena red > amber > emerald (oportunidades por último)", () => {
    const entrada = [
      alerta("a", "emerald"),
      alerta("b", "red"),
      alerta("c", "amber"),
    ];
    const ordenado = ordenarAlertas(entrada);
    expect(ordenado.map((x) => x.severidade)).toEqual(["red", "amber", "emerald"]);
  });

  it("é estável dentro da mesma severidade (preserva ordem de entrada)", () => {
    const entrada = [
      alerta("a1", "amber"),
      alerta("r1", "red"),
      alerta("a2", "amber"),
      alerta("r2", "red"),
    ];
    const ordenado = ordenarAlertas(entrada);
    expect(ordenado.map((x) => x.id)).toEqual(["r1", "r2", "a1", "a2"]);
  });

  it("não muta o array recebido", () => {
    const entrada = [alerta("a", "emerald"), alerta("b", "red")];
    const copia = [...entrada];
    ordenarAlertas(entrada);
    expect(entrada).toEqual(copia);
  });

  it("retorna lista vazia para entrada vazia", () => {
    expect(ordenarAlertas([])).toEqual([]);
  });
});

describe("contarPorSeveridade", () => {
  it("conta por severidade", () => {
    const r = contarPorSeveridade([
      alerta("a", "red"),
      alerta("b", "red"),
      alerta("c", "amber"),
      alerta("d", "emerald"),
    ]);
    expect(r).toEqual({ red: 2, amber: 1, emerald: 1 });
  });

  it("zera tudo para entrada vazia", () => {
    expect(contarPorSeveridade([])).toEqual({ red: 0, amber: 0, emerald: 0 });
  });
});
