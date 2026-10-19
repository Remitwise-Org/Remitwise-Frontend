import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  serializeToCsv,
  serializeToJson,
  getExportFilename,
  ExportRow,
} from "@/lib/utils/export-serializer";

describe("export-serializer", () => {
  describe("escapeCsvField", () => {
    it("returns an empty string for null and undefined", () => {
      expect(escapeCsvField(null)).toBe("");
      expect(escapeCsvField(undefined)).toBe("");
    });

    it("returns standard strings as-is", () => {
      expect(escapeCsvField("TX001")).toBe("TX001");
      expect(escapeCsvField(12.34)).toBe("12.34");
    });

    it("encloses values containing commas in double quotes", () => {
      expect(escapeCsvField("Maria Santos, Jr.")).toBe('"Maria Santos, Jr."');
    });

    it("doubles existing double quotes and wraps field in double quotes", () => {
      expect(escapeCsvField('John "Jack" Smith')).toBe('"John ""Jack"" Smith"');
    });

    it("encloses values containing newlines in double quotes", () => {
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
      expect(escapeCsvField("Line 1\rLine 2")).toBe('"Line 1\rLine 2"');
    });
  });

  describe("serializeToCsv", () => {
    const mockRows: ExportRow[] = [
      {
        id: "TX001",
        type: "Send Money",
        status: "Completed",
        amount: -500.0,
        currency: "USDC",
        counterparty: "Maria Santos (Philippines)",
        date: "2026-06-02 14:32:15",
        fee: 0.5,
      },
      {
        id: "TX002",
        type: "Smart Split",
        status: "Completed",
        amount: -1200.0,
        currency: "USDC",
        counterparty: 'Smart Split: "4 allocations"',
        date: "2026-06-02 09:15:42",
        fee: 0.3,
      },
      {
        id: "TX003",
        type: "Bill Payment",
        status: "Failed",
        amount: -85.5,
        currency: "USDC",
        counterparty: "Water & Power, Inc.",
        date: "2026-05-31 16:45:23",
        fee: 0.1,
      },
    ];

    it("correctly generates a CSV with header row and properly escaped content", () => {
      const csv = serializeToCsv(mockRows);
      const lines = csv.split("\n");

      // Verify header row
      expect(lines[0]).toBe("id,type,status,amount,currency,counterparty,date,fee");

      // Verify row 1
      expect(lines[1]).toBe("TX001,Send Money,Completed,-500,USDC,Maria Santos (Philippines),2026-06-02 14:32:15,0.5");

      // Verify row 2 (contains quotes in counterparty)
      expect(lines[2]).toBe('TX002,Smart Split,Completed,-1200,USDC,"Smart Split: ""4 allocations""",2026-06-02 09:15:42,0.3');

      // Verify row 3 (contains comma in counterparty)
      expect(lines[3]).toBe('TX003,Bill Payment,Failed,-85.5,USDC,"Water & Power, Inc.",2026-05-31 16:45:23,0.1');
    });

    it("handles empty lists gracefully", () => {
      const csv = serializeToCsv([]);
      expect(csv).toBe("id,type,status,amount,currency,counterparty,date,fee");
    });
  });

  describe("serializeToJson", () => {
    const mockRows: ExportRow[] = [
      {
        id: "TX001",
        type: "Send Money",
        status: "Completed",
        amount: -500.0,
        currency: "USDC",
        counterparty: "Maria Santos",
        date: "2026-06-02 14:32:15",
        fee: 0.5,
      },
    ];

    it("serializes to correct JSON format", () => {
      const json = serializeToJson(mockRows);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(mockRows);
      expect(json).toContain("  "); // Verify pretty printing indentation
    });
  });

  describe("getExportFilename", () => {
    const mockNow = new Date("2026-06-21T07:47:57.000Z");

    it("returns correct filename with no date filters", () => {
      const filename = getExportFilename("csv", undefined, undefined, mockNow);
      expect(filename).toBe("remitwise-transactions_2026-06-21T07-47-57.csv");
    });

    it("returns correct filename with dateFrom filter only", () => {
      const filename = getExportFilename("json", "2026-06-01", undefined, mockNow);
      expect(filename).toBe("remitwise-transactions_2026-06-01_to_end_2026-06-21T07-47-57.json");
    });

    it("returns correct filename with dateTo filter only", () => {
      const filename = getExportFilename("csv", undefined, "2026-06-20", mockNow);
      expect(filename).toBe("remitwise-transactions_start_to_2026-06-20_2026-06-21T07-47-57.csv");
    });

    it("returns correct filename with both date filters", () => {
      const filename = getExportFilename("csv", "2026-06-01", "2026-06-20", mockNow);
      expect(filename).toBe("remitwise-transactions_2026-06-01_to_2026-06-20_2026-06-21T07-47-57.csv");
    });
  });
});
