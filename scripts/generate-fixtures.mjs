// 產生假的測試資料（不含任何真實座標/IMEI/地址），僅供本機開發測試用
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "sample-data");

const HEADER = [
  "controller_id",
  "poles_id",
  "district",
  "vendor",
  "note",
  "last_receive_time",
];

// pole A: 0200090 -> 有兩次異動 + 一段大缺漏
// pole B: 1023336 -> 全程不變
// pole C: 9999999 -> 從未出現過
function poleRows(dateKey) {
  const scenario = {
    "2026-06-09": { a: "C11-202501-000123", b: "C11-202400-000001" },
    "2026-06-10": { a: "C11-202501-000123", b: "C11-202400-000001" },
    "2026-06-11": { a: "C11-202501-000123", b: "C11-202400-000001" },
    "2026-06-12": { a: "C11-202505-008888", b: "C11-202400-000001" }, // 異動1
    "2026-06-16": { a: "C11-202505-008888", b: "C11-202400-000001" },
    // 06-17 ~ 07-09 刻意不產生任何檔案 -> 缺漏區間
    "2026-07-10": { a: "C11-202505-008888", b: "C11-202400-000001" },
    "2026-07-11": { a: "C11-202505-008888", b: "C11-202400-000001" },
    "2026-07-12": { a: "C11-202508-014916", b: "C11-202400-000001" }, // 異動2
    "2026-07-13": { a: "C11-202508-014916", b: "C11-202400-000001" },
  }[dateKey];
  if (!scenario) return [];
  return [
    [scenario.a, "0200090", "東區", "光林", "", `${dateKey} 05:00:00`],
    [scenario.b, "1023336", "大里區", "光林", "", `${dateKey} 05:00:00`],
  ];
}

function writeXlsx(dateKey, folder, filename) {
  const rows = poleRows(dateKey);
  const wb = XLSX.utils.book_new();

  const overview = XLSX.utils.aoa_to_sheet([["date", dateKey], ["Log", "sample"]]);
  XLSX.utils.book_append_sheet(wb, overview, "連線率");

  const small = XLSX.utils.aoa_to_sheet([HEADER, ...rows.slice(0, 1)]);
  XLSX.utils.book_append_sheet(wb, small, "Receive<10");

  const full = XLSX.utils.aoa_to_sheet([HEADER, ...rows]);
  XLSX.utils.book_append_sheet(wb, full, "Receive≠0");

  mkdirSync(folder, { recursive: true });
  XLSX.writeFile(wb, join(folder, filename));
}

// 正式報表其實是「摘要區塊」與「明細區塊」兩段各自匯出的 CSV 拼接而成，
// 每段各自帶有 UTF-8 BOM；明細表頭列前的第二個 BOM 正是導致表頭解析失敗的真實成因，
// 這裡如實重現這個結構，避免測試資料失真而讓 bug 再次被掩蓋。
function writeCsv(dateKey, folder, filename) {
  const rows = poleRows(dateKey);
  const dataLines = rows.map(
    ([controllerId, polesId, district, vendor, note, t]) =>
      `"${controllerId}","=""${polesId}""","${district}","${vendor}","${note}","${t}"`
  );
  const BOM = "﻿";
  const summaryLines = [
    `date:${dateKey}`,
    "total_streetlights_count:2",
    "total_average_connection_rate:99%",
    "threej_streetlights_count:0",
    "threej_average_connection_rate:0%",
    "delta_streetlights_count:0",
    "delta_average_connection_rate:0%",
    "liteon_streetlights_count:2",
    "liteon_average_connection_rate:99%",
    "oring_streetlights_count:0",
    "oring_average_connection_rate:0%",
  ];
  const detailLines = [HEADER.map((h) => `"${h}"`).join(","), ...dataLines];
  const finalContent = `${BOM}${summaryLines.join("\n")}\n${BOM}${detailLines.join("\n")}`;
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, filename), finalContent, "utf-8");
}

const juneDir = join(ROOT, "202606");
writeXlsx("2026-06-09", juneDir, "0609 DailyReport.xlsx");
writeXlsx("2026-06-10", juneDir, "0610 DailyReport.xlsx");
writeXlsx("2026-06-11", juneDir, "0611 DailyReport.xlsx");
writeXlsx("2026-06-12", juneDir, "0612 DailyReport.xlsx");
writeXlsx("2026-06-16", juneDir, "0616 DailyReport.xlsx");

const julyDir = join(ROOT, "202607");
writeCsv("2026-07-10", julyDir, "EssReport_20260710.csv");
writeCsv("2026-07-11", julyDir, "EssReport_20260711.csv");
writeCsv("2026-07-12", julyDir, "EssReport_20260712.csv");
writeCsv("2026-07-13", julyDir, "EssReport_20260713.csv");

console.log("Fixtures generated under", ROOT);
