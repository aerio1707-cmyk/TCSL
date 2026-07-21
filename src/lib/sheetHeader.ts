import * as XLSX from "xlsx";
import { cleanValue } from "./clean";

export interface HeaderMatch {
  rowIndex: number;
  colIndex: Record<string, number>;
}

export function cellValue(ws: XLSX.WorkSheet, r: number, c: number): unknown {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}

function cleanHeader(raw: unknown): string {
  return cleanValue(raw).toLowerCase();
}

// 在工作表前 50 列內尋找同時包含所有 requiredHeaders 的表頭列（大小寫不拘）。
// 正式報表常在真正的欄位表頭前夾帶數十行統計摘要，不能只看第一列。
export function findHeaderRow(
  ws: XLSX.WorkSheet,
  range: XLSX.Range,
  requiredHeaders: string[]
): HeaderMatch | null {
  const required = requiredHeaders.map((h) => h.toLowerCase());
  const searchLimit = Math.min(range.e.r, range.s.r + 49);
  for (let r = range.s.r; r <= searchLimit; r++) {
    const colIndex: Record<string, number> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = cellValue(ws, r, c);
      if (v === undefined) continue;
      colIndex[cleanHeader(v)] = c;
    }
    if (required.every((h) => h in colIndex)) {
      return { rowIndex: r, colIndex };
    }
  }
  return null;
}
