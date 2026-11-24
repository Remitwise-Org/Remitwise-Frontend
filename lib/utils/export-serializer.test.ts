import { describe, expect, it } from "vitest";
import {
  escapeCsvField,
  getExportFilename,
  serializeToCsv,
  serializeToJson,
  type ExportRow,
} from "./export-serializer";

describe("escapeCsvField", () => {
  it.each<{ name: string; input: unknown; expected: string }>([
    { name: "null returns empty string", input: null, expected: "" },
    { name: "undefined returns empty string", input: undefined, expected: "" },
    { name: "empty string returns empty string", input: "", expected: "" },
    { name: "plain string is unchanged", input: "USD", expected: "USD" },
    { name: "integer number", input: 42, expected: "42" },
    { name: "zero number", input: 0, expected: "0" },
    { name: "negative decimal number", input: -12.5, expected: "-12.5" },
    { name: "boolean value", input: true, expected: "true" },
    {
      name: "string with comma is quoted",
      input: "Acme, Inc.",
      expected: '"Acme, Inc."',
    },
    {
      name: "string with double quotes doubles quotes and wraps",
      input: 'Say "hello"',
      expected: '"Say ""hello"""',
    },
    {
      name: "string with only a double quote",
      input: '"',
      expected: '""""',
    },
    {
      name: "string with LF newline is quoted",
      input: "line1\nline2",
      expected: '"line1\nline2"',
    },
    {
      name: "string with CR carriage return is quoted",
      input: "line1\rline2",
      expected: '"line1\rline2"',
    },
    {
      name: "string with CRLF is quoted",
      input: "line1\r\nline2",
      expected: '"line1\r\nline2"',
    },
    {
      name: "string with comma, quotes, and newline",
      input: 'Note: "urgent",\ncheck\rnow',
      expected: '"Note: ""urgent"",\ncheck\rnow"',
    },
  ])("$name", ({ input, expected }) => {
    expect(escapeCsvField(input)).toBe(expected);
  });
});

describe("serializeToCsv", () => {
  const expectedHeader = "id,type,status,amount,currency,counterparty,date,fee";

  it("returns only the header row in exact order for an empty rows array", () => {
    expect(serializeToCsv([])).toBe(expectedHeader);
  });

  it("serializes multiple rows with exact column order and RFC 4180 escaping", () => {
    const rows: ExportRow[] = [
      {
        id: "tx-1",
        type: "remittance",
        status: "completed",
        amount: 250.5,
        currency: "USD",
        counterparty: "Jane Doe",
        date: "2026-03-01T10:00:00Z",
        fee: 2.5,
      },
      {
        id: "tx-2",
        type: "bill_payment",
        status: "pending",
        amount: 1000,
        currency: "EUR",
        counterparty: 'Acme, "Global"\nCorp\rLtd',
        date: "2026-03-02T12:30:00Z",
        fee: 0,
      },
    ];

    const expected = [
      expectedHeader,
      "tx-1,remittance,completed,250.5,USD,Jane Doe,2026-03-01T10:00:00Z,2.5",
      'tx-2,bill_payment,pending,1000,EUR,"Acme, ""Global""\nCorp\rLtd",2026-03-02T12:30:00Z,0',
    ].join("\n");

    expect(serializeToCsv(rows)).toBe(expected);
  });

  it("renders null and undefined field values as empty CSV cells", () => {
    const rowWithMissingValues = {
      id: "tx-3",
      type: null,
      status: undefined,
      amount: 10,
      currency: "USDC",
      counterparty: undefined,
      date: "2026-03-03",
      fee: null,
    } as unknown as ExportRow;

    const expected = [
      expectedHeader,
      "tx-3,,,10,USDC,,2026-03-03,",
    ].join("\n");

    expect(serializeToCsv([rowWithMissingValues])).toBe(expected);
  });
});

describe("serializeToJson", () => {
  it("serializes an empty rows array as []", () => {
    expect(serializeToJson([])).toBe("[]");
  });

  it("serializes rows as pretty-printed 2-space indented JSON (not compact)", () => {
    const rows: ExportRow[] = [
      {
        id: "tx-1",
        type: "remittance",
        status: "completed",
        amount: 100,
        currency: "USD",
        counterparty: "Alice",
        date: "2026-03-01",
        fee: 1.5,
      },
    ];

    const result = serializeToJson(rows);

    expect(result).toBe(JSON.stringify(rows, null, 2));
    expect(result).not.toBe(JSON.stringify(rows));
    expect(result).toContain("\n  {\n");
    expect(JSON.parse(result)).toEqual(rows);
  });
});

describe("getExportFilename", () => {
  const fixedDate = new Date("2026-03-15T14:30:45.678Z");

  it.each<{
    name: string;
    format: "csv" | "json";
    dateFrom?: string;
    dateTo?: string;
    expected: string;
  }>([
    {
      name: "csv without date filters sanitises colons from ISO timestamp",
      format: "csv",
      expected: "remitwise-transactions_2026-03-15T14-30-45.csv",
    },
    {
      name: "json without date filters",
      format: "json",
      expected: "remitwise-transactions_2026-03-15T14-30-45.json",
    },
    {
      name: "both dateFrom and dateTo provided",
      format: "csv",
      dateFrom: "2026-01-01",
      dateTo: "2026-03-15",
      expected:
        "remitwise-transactions_2026-01-01_to_2026-03-15_2026-03-15T14-30-45.csv",
    },
    {
      name: "only dateFrom provided defaults end to 'end'",
      format: "json",
      dateFrom: "2026-01-01",
      expected:
        "remitwise-transactions_2026-01-01_to_end_2026-03-15T14-30-45.json",
    },
    {
      name: "only dateTo provided defaults start to 'start'",
      format: "csv",
      dateTo: "2026-03-15",
      expected:
        "remitwise-transactions_start_to_2026-03-15_2026-03-15T14-30-45.csv",
    },
  ])("$name", ({ format, dateFrom, dateTo, expected }) => {
    const filename = getExportFilename(format, dateFrom, dateTo, fixedDate);
    expect(filename).toBe(expected);
    expect(filename).not.toContain(":");
  });

  it("uses current date when now parameter is omitted", () => {
    const filename = getExportFilename("csv");
    expect(filename).toMatch(
      /^remitwise-transactions_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.csv$/
    );
  });
});
