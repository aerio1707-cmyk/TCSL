import * as XLSX from "xlsx";
import { cleanValue, normalizePolesKey } from "../clean";
import { cellValue, findHeaderRow } from "../sheetHeader";
import { parseNaiveDateTime } from "./dateUtils";
import { withFileCache } from "./fileCache";
import type { AbnormalStatus } from "./types";

const ABNORMAL_STATUSES = new Set<AbnormalStatus>(["控制器異常", "燈具異常", "複合異常"]);

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

function firstSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  return wb.Sheets[wb.SheetNames[0]];
}

export interface StreetlightRow {
  polesKey: string;
  polesId: string;
  controllerId: string;
  status: AbnormalStatus;
  lastReceiveTimeMs: number | null; // null = 暫停停用
  lastReceiveTimeRaw: string;
}

export interface StreetlightIndex {
  totalRows: number;
  abnormalRows: StreetlightRow[];
}

function parseStreetlightImpl(file: File): Promise<StreetlightIndex> {
  return readWorkbook(file).then((wb) => {
    const ws = firstSheet(wb);
    const ref = ws["!ref"];
    if (!ref) return { totalRows: 0, abnormalRows: [] };
    const range = XLSX.utils.decode_range(ref);

    const header = findHeaderRow(ws, range, ["poles_id", "status", "last_receive_time"]);
    if (!header) return { totalRows: 0, abnormalRows: [] };
    const polesCol = header.colIndex["poles_id"];
    const controllerCol = header.colIndex["controller_id"];
    const statusCol = header.colIndex["status"];
    const lastCol = header.colIndex["last_receive_time"];

    let totalRows = 0;
    const abnormalRows: StreetlightRow[] = [];

    for (let r = header.rowIndex + 1; r <= range.e.r; r++) {
      const polesRaw = cellValue(ws, r, polesCol);
      if (polesRaw === undefined || polesRaw === "") continue;
      totalRows++;

      const status = cleanValue(cellValue(ws, r, statusCol)) as AbnormalStatus;
      if (!ABNORMAL_STATUSES.has(status)) continue;

      const lastRaw = cleanValue(cellValue(ws, r, lastCol));
      const lastMs = lastRaw ? parseNaiveDateTime(lastRaw) : null;

      abnormalRows.push({
        polesKey: normalizePolesKey(String(polesRaw)),
        polesId: cleanValue(polesRaw),
        controllerId: controllerCol !== undefined ? cleanValue(cellValue(ws, r, controllerCol)) : "",
        status,
        lastReceiveTimeMs: lastMs,
        lastReceiveTimeRaw: lastRaw,
      });
    }

    return { totalRows, abnormalRows };
  });
}

export function parseStreetlightFile(file: File): Promise<StreetlightIndex> {
  return withFileCache(file, () => parseStreetlightImpl(file));
}

function parseWhitelistImpl(file: File): Promise<Set<string>> {
  return readWorkbook(file).then((wb) => {
    const ws = firstSheet(wb);
    const ref = ws["!ref"];
    const whitelist = new Set<string>();
    if (!ref) return whitelist;
    const range = XLSX.utils.decode_range(ref);

    const header = findHeaderRow(ws, range, ["路燈編號"]);
    if (!header) return whitelist;
    const col = header.colIndex["路燈編號"];

    for (let r = header.rowIndex + 1; r <= range.e.r; r++) {
      const raw = cellValue(ws, r, col);
      if (raw === undefined || raw === "") continue;
      whitelist.add(normalizePolesKey(String(raw)));
    }
    return whitelist;
  });
}

export function parseWhitelistFile(file: File): Promise<Set<string>> {
  return withFileCache(file, () => parseWhitelistImpl(file));
}

// 桿號 -> 該桿號所有開單時間（ms），供功能1查詢用
export type PoleTimeIndex = Map<string, number[]>;

function parseOrderImpl(file: File): Promise<PoleTimeIndex> {
  return readWorkbook(file).then((wb) => {
    const ws = firstSheet(wb);
    const ref = ws["!ref"];
    const index: PoleTimeIndex = new Map();
    if (!ref) return index;
    const range = XLSX.utils.decode_range(ref);

    const header = findHeaderRow(ws, range, ["poles_id", "creation_time"]);
    if (!header) return index;
    const polesCol = header.colIndex["poles_id"];
    const timeCol = header.colIndex["creation_time"];

    for (let r = header.rowIndex + 1; r <= range.e.r; r++) {
      const polesRaw = cellValue(ws, r, polesCol);
      if (polesRaw === undefined || polesRaw === "") continue;
      const ms = parseNaiveDateTime(cellValue(ws, r, timeCol));
      if (ms === null) continue;
      const key = normalizePolesKey(String(polesRaw));
      const list = index.get(key);
      if (list) list.push(ms);
      else index.set(key, [ms]);
    }
    return index;
  });
}

export function parseOrderFile(file: File): Promise<PoleTimeIndex> {
  return withFileCache(file, () => parseOrderImpl(file));
}

// 桿號 -> 該桿號所有「已結案」的立案時間（ms），供功能2查詢用
function parseRepairImpl(file: File): Promise<PoleTimeIndex> {
  return readWorkbook(file).then((wb) => {
    const ws = firstSheet(wb);
    const ref = ws["!ref"];
    const index: PoleTimeIndex = new Map();
    if (!ref) return index;
    const range = XLSX.utils.decode_range(ref);

    const header = findHeaderRow(ws, range, ["路燈編號", "立案日期", "狀態"]);
    if (!header) return index;
    const polesCol = header.colIndex["路燈編號"];
    const dateCol = header.colIndex["立案日期"];
    const statusCol = header.colIndex["狀態"];

    for (let r = header.rowIndex + 1; r <= range.e.r; r++) {
      const polesRaw = cellValue(ws, r, polesCol);
      if (polesRaw === undefined || polesRaw === "") continue;
      const status = cleanValue(cellValue(ws, r, statusCol));
      if (status !== "結案") continue;
      const ms = parseNaiveDateTime(cellValue(ws, r, dateCol));
      if (ms === null) continue;
      const key = normalizePolesKey(String(polesRaw));
      const list = index.get(key);
      if (list) list.push(ms);
      else index.set(key, [ms]);
    }
    return index;
  });
}

export function parseRepairFile(file: File): Promise<PoleTimeIndex> {
  return withFileCache(file, () => parseRepairImpl(file));
}
