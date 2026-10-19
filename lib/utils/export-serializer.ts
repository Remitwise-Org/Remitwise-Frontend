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
 * Escapes a single CSV field value according to RFC 4180:
 * - If the value contains a comma, double quote, or line break (LF or CR),
 *   it must be enclosed in double quotes.
 * - Any double quote character within a field must be escaped by preceding it
 *   with another double quote character (i.e. doubled).
 */
export function escapeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
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
 * Serializes an array of transaction rows into a CSV string.
 */
export function serializeToCsv(rows: ExportRow[]): string {
  const headers = [
    "id",
    "type",
    "status",
    "amount",
    "currency",
    "counterparty",
    "date",
    "fee"
  ];
  
  const headerRow = headers.map(escapeCsvField).join(",");
  
  const dataRows = rows.map((row) => {
    return [
      row.id,
      row.type,
      row.status,
      row.amount,
      row.currency,
      row.counterparty,
      row.date,
      row.fee
    ]
      .map(escapeCsvField)
      .join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Serializes an array of transaction rows into a formatted JSON string.
 */
export function serializeToJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2);
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
