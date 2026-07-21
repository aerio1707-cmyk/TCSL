import * as XLSX from "xlsx";
import { CATEGORY_RULES } from "./classify";
import type { RepairAnalysisResult } from "./types";

export function exportRepairToExcel(
  result: RepairAnalysisResult,
  filename = `維修案件分析報告_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();
  const { sourceSummary, categorySummaries, unclassifiedRows } = result;

  const sourceRows: (string | number)[][] = [
    ["類別", "筆數", "佔比%"],
    ["承商自主通報 + 自主API", sourceSummary.inScopeCount, pct(sourceSummary.inScopeCount, sourceSummary.totalCount)],
    ["其餘通報來源", sourceSummary.otherSourceCount, pct(sourceSummary.otherSourceCount, sourceSummary.totalCount)],
    ["總計", sourceSummary.totalCount, "100.00%"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sourceRows), "通報來源結構占比");

  const categoryRows: (string | number)[][] = [["類別", "筆數", "佔比%"]];
  for (const c of categorySummaries) {
    categoryRows.push([c.category, c.count, pct(c.count, sourceSummary.inScopeCount)]);
  }
  categoryRows.push(["總計", sourceSummary.inScopeCount, "100.00%"]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(categoryRows), "工單處置分類");

  const unclassifiedSheetRows: (string | number)[][] = [["案件編號", "施工內容 (欄位R)", "備註 (欄位V)"]];
  for (const r of unclassifiedRows) {
    unclassifiedSheetRows.push([r.caseNo, r.content, r.note]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(unclassifiedSheetRows), "未歸類工單清單");

  const appendixRows: (string | number)[][] = [
    ["類別代碼", "分類名稱", "欄位R(施工內容)包含關鍵字", "欄位V(備註)包含關鍵字"],
  ];
  const codes = ["a", "b", "c", "d", "e", "f"];
  CATEGORY_RULES.forEach((rule, i) => {
    appendixRows.push([codes[i], rule.category, rule.contentKeywords.join("、"), rule.noteKeywords.join("、") || "（無）"]);
  });
  appendixRows.push(["g", "其他", "未滿足上述 a~f 任一條件者", "自動歸類並列入待補齊提示清單"]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(appendixRows), "分類關鍵字對照表(附錄)");

  XLSX.writeFile(wb, filename);
}

export function exportUnclassifiedOnly(
  result: RepairAnalysisResult,
  filename = `未歸類工單清單_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [["案件編號", "施工內容 (欄位R)", "備註 (欄位V)"]];
  for (const r of result.unclassifiedRows) {
    rows.push([r.caseNo, r.content, r.note]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "未歸類工單清單");
  XLSX.writeFile(wb, filename);
}

function pct(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(2)}%` : "0.00%";
}
