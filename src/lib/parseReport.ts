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

function cellValue(ws: XLSX.WorkSheet, r: number, c: number): unknown {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell ? cell.v : undefined;
}

function findHeaderRow(
  ws: XLSX.WorkSheet,
  range: XLSX.Range
): { rowIndex: number; colIndex: Record<string, number> } | null {
  const searchLimit = Math.min(range.e.r, range.s.r + 4);
  for (let r = range.s.r; r <= searchLimit; r++) {
    const colIndex: Record<string, number> = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
      const v = cellValue(ws, r, c);
      if (v === undefined) continue;
      colIndex[cleanHeader(v)] = c;
    }
    if ("controller_id" in colIndex && "poles_id" in colIndex) {
      return { rowIndex: r, colIndex };
    }
  }
  return null;
}

// 掃描一個 sheet，回傳「已標準化的 poles_id -> 控制器紀錄」對照表
// 直接用座標讀取需要的兩個欄位，避免把整列（可能 40+ 欄）都轉成陣列
function indexSheetByPole(ws: XLSX.WorkSheet, sheetName: string): Map<string, FoundRecord> {
  const map = new Map<string, FoundRecord>();
  const ref = ws["!ref"];
  if (!ref) return map;
  const range = XLSX.utils.decode_range(ref);

  const header = findHeaderRow(ws, range);
  if (!header) return map;
  const polesCol = header.colIndex["poles_id"];
  const controllerCol = header.colIndex["controller_id"];

  for (let r = header.rowIndex + 1; r <= range.e.r; r++) {
    const polesRaw = cellValue(ws, r, polesCol);
    if (polesRaw === undefined || polesRaw === "") continue;
    const key = normalizePolesKey(cleanValue(polesRaw));
    // 同一份報表內若同一桿號出現多次，以第一筆有效紀錄為準
    if (map.has(key)) continue;
    const controllerId = cleanValue(cellValue(ws, r, controllerCol));
    if (controllerId) map.set(key, { controllerId, sheetName });
  }
  return map;
}

// xlsx 多 sheet 時的優先順序：Receive<10 -> Receive≠0 -> 其他（略過純摘要用的連線率 sheet）
const XLSX_SHEET_PRIORITY = [/receive\s*<\s*10/i, /receive\s*[≠!]\s*=?\s*0/i];

// 關閉不需要的樣式/格式化字串/公式解析，減少大型報表的解析開銷
const READ_OPTS: XLSX.ParsingOptions = {
  cellHTML: false,
  cellFormula: false,
  cellStyles: false,
  cellDates: false,
};

async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const isCsv = /\.csv$/i.test(file.name);
  if (isCsv) {
    const text = await file.text();
    return XLSX.read(text, { type: "string", ...READ_OPTS });
  }
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array", ...READ_OPTS });
}

function parseFile(file: File): Promise<Map<string, FoundRecord>> {
  return readWorkbook(file).then((wb) => {
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
  });
}

// 同一份檔案（同名/同大小/同修改時間）在同一個瀏覽器分頁內只解析一次，
// 重複按「開始分析」（換桿號或加桿號）時可以直接複用，不用重讀檔案
const fileIndexCache = new Map<string, Promise<Map<string, FoundRecord>>>();

function cacheKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

// 解析整份報表檔案一次，建立「桿號 -> 控制器」的完整索引，供多桿號查詢重複使用
export function indexFileByPole(file: File): Promise<Map<string, FoundRecord>> {
  const key = cacheKey(file);
  const cached = fileIndexCache.get(key);
  if (cached) return cached;

  const promise = parseFile(file);
  fileIndexCache.set(key, promise);
  return promise;
}
