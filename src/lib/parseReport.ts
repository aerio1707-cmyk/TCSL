import * as XLSX from "xlsx";
import { cleanValue, normalizePolesKey } from "./clean";

export interface FoundRecord {
  controllerId: string;
  sheetName: string;
}

function stripBom(s: string): string {
  return s.replace(/^﻿/, "");
}

function cleanHeader(raw: unknown): string {
  return stripBom(cleanValue(raw)).toLowerCase();
}

function sheetToRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false }) as unknown[][];
}

function findHeaderRow(
  rows: unknown[][]
): { rowIndex: number; colIndex: Record<string, number> } | null {
  const searchLimit = Math.min(rows.length, 5);
  for (let r = 0; r < searchLimit; r++) {
    const row = rows[r];
    if (!row) continue;
    const colIndex: Record<string, number> = {};
    row.forEach((cell, i) => {
      colIndex[cleanHeader(cell)] = i;
    });
    if ("controller_id" in colIndex && "poles_id" in colIndex) {
      return { rowIndex: r, colIndex };
    }
  }
  return null;
}

// 掃描一個 sheet，回傳「已標準化的 poles_id -> 控制器紀錄」對照表
function indexSheetByPole(ws: XLSX.WorkSheet, sheetName: string): Map<string, FoundRecord> {
  const map = new Map<string, FoundRecord>();
  const rows = sheetToRows(ws);
  const header = findHeaderRow(rows);
  if (!header) return map;
  const polesCol = header.colIndex["poles_id"];
  const controllerCol = header.colIndex["controller_id"];
  for (let r = header.rowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const polesRaw = row[polesCol];
    if (polesRaw === undefined || polesRaw === "") continue;
    const key = normalizePolesKey(cleanValue(polesRaw));
    // 同一份報表內若同一桿號出現多次，以第一筆有效紀錄為準
    if (map.has(key)) continue;
    const controllerId = cleanValue(row[controllerCol]);
    if (controllerId) map.set(key, { controllerId, sheetName });
  }
  return map;
}

// xlsx 多 sheet 時的優先順序：Receive<10 -> Receive≠0 -> 其他（略過純摘要用的連線率 sheet）
const XLSX_SHEET_PRIORITY = [/receive\s*<\s*10/i, /receive\s*[≠!]\s*=?\s*0/i];

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const isCsv = /\.csv$/i.test(file.name);
  if (isCsv) {
    const text = await file.text();
    return XLSX.read(text, { type: "string" });
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

// 解析整份報表檔案一次，建立「桿號 -> 控制器」的完整索引，供多桿號查詢重複使用（避免同一檔案重複解析）
export async function indexFileByPole(file: File): Promise<Map<string, FoundRecord>> {
  const wb = await readWorkbook(file);
  const isCsv = /\.csv$/i.test(file.name);

  if (isCsv) {
    const sheetName = wb.SheetNames[0];
    return indexSheetByPole(wb.Sheets[sheetName], sheetName);
  }

  const orderedNames: string[] = [];
  for (const pattern of XLSX_SHEET_PRIORITY) {
    const match = wb.SheetNames.find((n) => pattern.test(n));
    if (match && !orderedNames.includes(match)) orderedNames.push(match);
  }
  for (const n of wb.SheetNames) {
    if (!orderedNames.includes(n)) orderedNames.push(n);
  }

  // 依 sheet 優先順序合併；同一桿號已經在較高優先的 sheet 找到過就不再覆蓋
  const merged = new Map<string, FoundRecord>();
  for (const sheetName of orderedNames) {
    const sheetMap = indexSheetByPole(wb.Sheets[sheetName], sheetName);
    for (const [key, val] of sheetMap) {
      if (!merged.has(key)) merged.set(key, val);
    }
  }
  return merged;
}
