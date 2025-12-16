import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Food Router", () => {
  it("should have food router defined", () => {
    expect(appRouter.food).toBeDefined();
  });

  it("should have getStats procedure", () => {
    expect(appRouter.food.getStats).toBeDefined();
  });

  it("should have addStock procedure", () => {
    expect(appRouter.food.addStock).toBeDefined();
  });

  it("should have recordConsumption procedure", () => {
    expect(appRouter.food.recordConsumption).toBeDefined();
  });

  it("should have getMovements procedure", () => {
    expect(appRouter.food.getMovements).toBeDefined();
  });
});
