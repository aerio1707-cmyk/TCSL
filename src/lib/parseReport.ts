import * as XLSX from "xlsx";
import { cleanValue, normalizePolesKey } from "./clean";

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
  // 正式報表在真正的欄位表頭前可能有數十行統計摘要（date:、total_streetlights_count: 等），
  // 放寬到 50 列以涵蓋這類前導內容；找到就立即回傳，不影響效能。
  const searchLimit = Math.min(range.e.r, range.s.r + 49);
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

// 掃描 CSV 唯一的 sheet，回傳「已標準化的 poles_id -> controller_id」對照表
// 直接用座標讀取需要的兩個欄位，避免把整列（可能 40+ 欄）都轉成陣列
function indexSheetByPole(ws: XLSX.WorkSheet): Map<string, string> {
  const map = new Map<string, string>();
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
    if (controllerId) map.set(key, controllerId);
  }
  return map;
}

// 關閉不需要的樣式/格式化字串/公式解析，減少大型報表的解析開銷
const READ_OPTS: XLSX.ParsingOptions = {
  cellHTML: false,
  cellFormula: false,
  cellStyles: false,
  cellDates: false,
};

function parseFile(file: File): Promise<Map<string, string>> {
  return file.text().then((text) => {
    const wb = XLSX.read(text, { type: "string", ...READ_OPTS });
    return indexSheetByPole(wb.Sheets[wb.SheetNames[0]]);
  });
}

// 同一份檔案（同名/同大小/同修改時間）在同一個瀏覽器分頁內只解析一次，
// 重複按「開始分析」（換桿號或加桿號）時可以直接複用，不用重讀檔案
const fileIndexCache = new Map<string, Promise<Map<string, string>>>();

function cacheKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

// 解析整份報表檔案一次，建立「桿號 -> 控制器」的完整索引，供多桿號查詢重複使用
export function indexFileByPole(file: File): Promise<Map<string, string>> {
  const key = cacheKey(file);
  const cached = fileIndexCache.get(key);
  if (cached) return cached;

  const promise = parseFile(file);
  fileIndexCache.set(key, promise);
  return promise;
}
