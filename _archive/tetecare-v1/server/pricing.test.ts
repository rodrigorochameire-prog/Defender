import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

describe("Pricing Router", () => {
  it("should have pricing router defined", () => {
    expect(appRouter.pricing).toBeDefined();
  });

  it("should have getServicePrices procedure", () => {
    expect(appRouter.pricing.getServicePrices).toBeDefined();
  });

  it("should have getServicePrice procedure", () => {
    expect(appRouter.pricing.getServicePrice).toBeDefined();
  });

  it("should have getEffectivePrice procedure", () => {
    expect(appRouter.pricing.getEffectivePrice).toBeDefined();
  });

  it("should have createCustomPlan procedure", () => {
    expect(appRouter.pricing.createCustomPlan).toBeDefined();
  });

  it("should have updateCustomPlan procedure", () => {
    expect(appRouter.pricing.updateCustomPlan).toBeDefined();
  });

  it("should have deactivateCustomPlan procedure", () => {
    expect(appRouter.pricing.deactivateCustomPlan).toBeDefined();
  });
});
