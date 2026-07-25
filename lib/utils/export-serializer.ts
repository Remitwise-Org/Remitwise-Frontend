/** Maximum rows allowed in a single export (one-click download cap). */
export const EXPORT_MAX_ROWS = 10_000;

export interface ExportRow {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  counterparty: string;
  date: string;
  fee: number;
}

/**
 * UTF-8 Byte Order Mark (BOM) for locale-safe Excel CSV import.
 */
export const UTF8_BOM = "\uFEFF";

/**
 * Escapes a single CSV field value according to RFC 4180 and Excel rules:
 * - If the value contains a comma, double quote, or line break (LF or CR),
 *   it is enclosed in double quotes.
 * - Any double quote character within a field is escaped by doubling it ("").
 * - Text fields starting with formula characters (=, @, \t, \r or +, - for non-numeric strings)
 *   are prefixed with a single quote (') to prevent Excel formula injection.
 */
export function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  let str = String(value);

  // Prevent Excel formula injection on string values starting with =, @, \t, \r or +, - (non-numeric)
  if (
    typeof value === "string" &&
    (/^[=@\t\r]/.test(str) || (/^[+\-]/.test(str) && isNaN(Number(str))))
  ) {
    str = `'${str}`;
  }

  const needsQuotes =
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r");

  if (needsQuotes) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serializes an array of transaction rows into an Excel-compliant CSV string.
 * Includes a UTF-8 BOM by default for locale-safe import in Microsoft Excel.
 */
export function serializeToCsv(rows: ExportRow[], includeBom = true): string {
  const limited = rows.slice(0, EXPORT_MAX_ROWS);

  const headers = [
    "id",
    "type",
    "status",
    "amount",
    "currency",
    "counterparty",
    "date",
    "fee",
  ];

  const headerRow = headers.map(escapeCsvField).join(",");
  
  const dataRows = limited.map((row) => {
    return [
      row.id,
      row.type,
      row.status,
      row.amount,
      row.currency,
      row.counterparty,
      row.date,
      row.fee,
    ]
      .map(escapeCsvField)
      .join(",");
  });

  const csvContent = [headerRow, ...dataRows].join("\n");
  return includeBom ? UTF8_BOM + csvContent : csvContent;
}

/**
 * Serializes an array of transaction rows into a formatted JSON string.
 */
export function serializeToJson(rows: ExportRow[]): string {
  const limited = rows.slice(0, EXPORT_MAX_ROWS);
  return JSON.stringify(limited, null, 2);
}

/**
 * Generates a sensible download filename incorporating date filters and a timestamp.
 */
export function getExportFilename(
  format: "csv" | "json",
  dateFrom?: string,
  dateTo?: string,
  now: Date = new Date()
): string {
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  let dateRangeStr = "";
  if (dateFrom || dateTo) {
    const from = dateFrom ? dateFrom : "start";
    const to = dateTo ? dateTo : "end";
    dateRangeStr = `_${from}_to_${to}`;
  }
  return `remitwise-transactions${dateRangeStr}_${timestamp}.${format}`;
}
