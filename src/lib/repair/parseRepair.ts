import * as XLSX from "xlsx";
import { CATEGORY_ORDER, IN_SCOPE_SOURCES, classify } from "./classify";
import type { CategorySummary, RepairAnalysisResult, RepairCaseRow, RepairCategory } from "./types";

const COL = {
  caseNo: "案件編號",
  source: "通報來源",
  content: "施工內容",
  note: "備註",
  district: "行政區",
  faultType: "故障類別",
};

function cell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

interface RawRow {
  data: Record<string, unknown>;
  sourceFile: string;
}

async function readFileRows(file: File): Promise<RawRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) {
    throw new Error(`「${file.name}」找不到資料列，請確認檔案內容與表頭是否正確`);
  }
  for (const key of Object.values(COL)) {
    if (!(key in rows[0])) {
      throw new Error(`「${file.name}」找不到欄位「${key}」，請確認來源檔表頭是否變動`);
    }
  }

  return rows.map((data) => ({ data, sourceFile: file.name }));
}

// 完全重複判定：案件編號＋其餘所有欄位皆相同才視為同一筆重複匯出
function rowDedupKey(data: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(data)
      .sort()
      .map((k) => [k, data[k]])
  );
}

export async function parseRepairFiles(files: File[]): Promise<RepairAnalysisResult> {
  const rawBatches = await Promise.all(files.map(readFileRows));
  const allRaw = rawBatches.flat();

  const seen = new Map<string, RawRow>();
  let duplicateRowsRemoved = 0;
  for (const raw of allRaw) {
    const key = rowDedupKey(raw.data);
    if (seen.has(key)) {
      duplicateRowsRemoved++;
    } else {
      seen.set(key, raw);
    }
  }

  const caseRows: RepairCaseRow[] = [...seen.values()].map(({ data: row, sourceFile }) => {
    const source = cell(row[COL.source]);
    const content = cell(row[COL.content]);
    const note = cell(row[COL.note]);
    const inScope = IN_SCOPE_SOURCES.includes(source);
    return {
      caseNo: cell(row[COL.caseNo]),
      source,
      content,
      note,
      district: cell(row[COL.district]),
      faultType: cell(row[COL.faultType]),
      sourceFile,
      inScope,
      category: inScope ? classify(content, note) : null,
    };
  });

  // 案件編號重複但內容不同（撞號）：完全重複已在上面排除，這裡剩下的同編號都是真的內容衝突，
  // 依需求全部保留計算，僅列出來供人工複查
  const byCaseNo = new Map<string, RepairCaseRow[]>();
  for (const r of caseRows) {
    const group = byCaseNo.get(r.caseNo);
    if (group) group.push(r);
    else byCaseNo.set(r.caseNo, [r]);
  }
  const caseNumberCollisions = [...byCaseNo.entries()]
    .filter(([, group]) => group.length > 1)
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, group]) => group);

  const totalCount = caseRows.length;
  const inScopeRows = caseRows.filter((r) => r.inScope);
  const inScopeCount = inScopeRows.length;

  const countByCategory = new Map<RepairCategory, number>();
  for (const cat of CATEGORY_ORDER) countByCategory.set(cat, 0);
  for (const r of inScopeRows) {
    const cat = r.category as RepairCategory;
    countByCategory.set(cat, (countByCategory.get(cat) ?? 0) + 1);
  }

  const categorySummaries: CategorySummary[] = CATEGORY_ORDER.map((category) => {
    const count = countByCategory.get(category) ?? 0;
    return { category, count, ratio: inScopeCount > 0 ? count / inScopeCount : 0 };
  });

  return {
    sourceFileNames: files.map((f) => f.name),
    duplicateRowsRemoved,
    caseNumberCollisions,
    sourceSummary: {
      totalCount,
      inScopeCount,
      otherSourceCount: totalCount - inScopeCount,
    },
    categorySummaries,
    unclassifiedRows: inScopeRows.filter((r) => r.category === "其他"),
    allInScopeRows: inScopeRows,
  };
}
