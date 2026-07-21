import * as XLSX from "xlsx";
import { CATEGORY_ORDER, IN_SCOPE_SOURCES, classify } from "./classify";
import type { CategorySummary, RepairAnalysisResult, RepairCaseRow, RepairCategory } from "./types";

const COL = {
  caseNo: "案件編號",
  source: "通報來源",
  content: "施工內容",
  note: "備註",
};

function cell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

export async function parseRepairFile(file: File): Promise<RepairAnalysisResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) {
    throw new Error("找不到資料列，請確認檔案內容與表頭是否正確");
  }
  for (const key of Object.values(COL)) {
    if (!(key in rows[0])) {
      throw new Error(`找不到欄位「${key}」，請確認來源檔表頭是否變動`);
    }
  }

  const caseRows: RepairCaseRow[] = rows.map((row) => {
    const source = cell(row[COL.source]);
    const content = cell(row[COL.content]);
    const note = cell(row[COL.note]);
    const inScope = IN_SCOPE_SOURCES.includes(source);
    return {
      caseNo: cell(row[COL.caseNo]),
      source,
      content,
      note,
      inScope,
      category: inScope ? classify(content, note) : null,
    };
  });

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
    sourceFileName: file.name,
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
