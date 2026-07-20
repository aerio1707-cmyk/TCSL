import * as XLSX from "xlsx";
import type { PoleTimeline } from "./types";

const STATUS_LABEL: Record<string, string> = {
  initial: "⚪ 初始紀錄",
  unchanged: "🟢 保持不變",
  changed: "🔴 控制器異動",
  missing: "🟡 資料缺漏",
};

export function exportTimelinesToExcel(
  timelines: PoleTimeline[],
  filename = `控制器異動追蹤_${new Date().toISOString().slice(0, 10)}.xlsx`
) {
  const wb = XLSX.utils.book_new();

  const summaryRows: (string | number)[][] = [
    ["poles_id", "日期區間", "狀態", "舊控制器 ID", "新/當前控制器 ID", "天數", "備註"],
  ];
  for (const t of timelines) {
    for (const r of t.ranges) {
      if (r.status === "unchanged") continue; // 摘要只列事件，不變區間不重複列出
      const dateLabel = r.startDate === r.endDate ? r.startDate : `${r.startDate} ~ ${r.endDate}`;
      summaryRows.push([
        t.polesId,
        dateLabel,
        STATUS_LABEL[r.status],
        r.prevControllerId ?? "",
        r.controllerId ?? "",
        r.dayCount,
        r.note,
      ]);
    }
  }
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, "異動摘要");

  const detailRows: (string | number)[][] = [
    ["日期", "poles_id", "controller_id", "狀態", "變更細節", "備註/檔案來源"],
  ];
  for (const t of timelines) {
    for (const e of [...t.entries].reverse()) {
      const detail =
        e.status === "changed" ? `${e.prevControllerId} ➔ ${e.controllerId}` : "-";
      const source = [e.sourceFile, e.sourceSheet].filter(Boolean).join(" / ");
      detailRows.push([
        e.date,
        e.polesId,
        e.controllerId ?? "(無紀錄)",
        STATUS_LABEL[e.status],
        detail,
        source || e.note,
      ]);
    }
  }
  const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, detailSheet, "完整明細");

  XLSX.writeFile(wb, filename);
}
