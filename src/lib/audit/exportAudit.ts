import * as XLSX from "xlsx";
import type { AuditResult } from "./types";

export function exportAuditToExcel(
  result: AuditResult,
  filename = `路燈異常稽核報告_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();
  const { summary } = result;

  const summaryRows: (string | number)[][] = [
    ["項目", "數值"],
    ["總檢測燈具數", summary.totalStreetlightRows],
    ["白名單內異常燈具數", summary.whitelistAbnormalCount],
    ["暫停停用燈具數", summary.suspendedCount],
    ["實際分析筆數", summary.analyzedCount],
    ["應開單未開單數（功能1）", summary.func1Count],
    ["未開率", `${(summary.func1Rate * 100).toFixed(1)}%`],
    ["已結案仍異常數（功能2）", summary.func2Count],
    ["異常結案率", `${(summary.func2Rate * 100).toFixed(1)}%`],
    ["來源檔案 - 控制器狀態", result.sourceFileNames.streetlight],
    ["來源檔案 - 白名單", result.sourceFileNames.whitelist],
    ["來源檔案 - 開單紀錄", result.sourceFileNames.order],
    ["來源檔案 - 報修清單", result.sourceFileNames.repair],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "稽核摘要");

  const func1Rows: (string | number)[][] = [
    ["poles_id", "controller_id", "異常類型", "異常發生時間 (T_base)", "說明"],
  ];
  for (const r of result.analyzedRows) {
    if (!r.flags.includes("func1_missing_order")) continue;
    func1Rows.push([r.polesId, r.controllerId, r.status, r.lastReceiveTimeLabel, "過去24小時內查無對應開單紀錄"]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(func1Rows), "應開單未開單明細");

  const func2Rows: (string | number)[][] = [
    ["poles_id", "controller_id", "異常類型", "異常發生時間 (T_base)", "結案時間"],
  ];
  for (const r of result.analyzedRows) {
    if (!r.flags.includes("func2_closed_not_recovered")) continue;
    func2Rows.push([r.polesId, r.controllerId, r.status, r.lastReceiveTimeLabel, r.func2MatchedCaseTime ?? ""]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(func2Rows), "已結案未恢復明細");

  const suspendedRows: (string | number)[][] = [["poles_id", "controller_id", "異常類型"]];
  for (const r of result.suspendedRows) {
    suspendedRows.push([r.polesId, r.controllerId, r.status]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(suspendedRows), "暫停停用明細");

  XLSX.writeFile(wb, filename);
}
