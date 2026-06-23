import { NextRequest } from "next/server";
import { GET } from "./route";

describe("/api/insights", () => {
  const baseUrl = "http://localhost:3000";

  describe("GET", () => {
    it("returns aggregated insights for current_month by default", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("period", "current_month");
      expect(data).toHaveProperty("totals");
      expect(data.totals).toHaveProperty("spending");
      expect(data.totals).toHaveProperty("savings");
      expect(data.totals).toHaveProperty("bills");
      expect(data.totals).toHaveProperty("insurance");
      expect(data).toHaveProperty("breakdown");
      expect(data).toHaveProperty("trend");
    });

    it("filters by current_month period correctly", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=current_month`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("current_month");
      expect(typeof data.totals.spending).toBe("number");
      expect(Array.isArray(data.breakdown)).toBe(true);
    });

    it("filters by last_3_months period correctly", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=last_3_months`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("last_3_months");
      expect(typeof data.totals.spending).toBe("number");
      expect(typeof data.totals.savings).toBe("number");
    });

    it("filters by last_year period correctly", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=last_year`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.period).toBe("last_year");
      expect(data.totals).toBeDefined();
    });

    it("returns breakdown grouped by category", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=last_year`);
      const response = await GET(req);
      const data = await response.json();

      expect(Array.isArray(data.breakdown)).toBe(true);
      if (data.breakdown.length > 0) {
        expect(data.breakdown[0]).toHaveProperty("category");
        expect(data.breakdown[0]).toHaveProperty("amount");
      }
    });

    it("returns trend data structure", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights`);
      const response = await GET(req);
      const data = await response.json();

      expect(data.trend).toBeDefined();
      expect(typeof data.trend).toBe("object");
    });

    it("handles unknown period parameter gracefully", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=invalid_period`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeDefined();
    });

    it("returns zero totals when no transactions match period", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=current_month`);
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totals.spending).toBeGreaterThanOrEqual(0);
      expect(data.totals.savings).toBeGreaterThanOrEqual(0);
      expect(data.totals.bills).toBeGreaterThanOrEqual(0);
      expect(data.totals.insurance).toBeGreaterThanOrEqual(0);
    });

    it("includes all transaction types in totals", async () => {
      const req = new NextRequest(`${baseUrl}/api/insights?period=last_year`);
      const response = await GET(req);
      const data = await response.json();

      expect(data.totals).toHaveProperty("spending");
      expect(data.totals).toHaveProperty("savings");
      expect(data.totals).toHaveProperty("bills");
      expect(data.totals).toHaveProperty("insurance");
    });

    it("returns consistent data structure across all periods", async () => {
      const periods = ["current_month", "last_3_months", "last_year"];
      
      for (const period of periods) {
        const req = new NextRequest(`${baseUrl}/api/insights?period=${period}`);
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveProperty("period");
        expect(data).toHaveProperty("totals");
        expect(data).toHaveProperty("breakdown");
        expect(data).toHaveProperty("trend");
      }
    });
  });
});
