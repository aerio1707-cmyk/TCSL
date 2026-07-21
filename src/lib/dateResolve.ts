export interface DateResolution {
  date: string; // YYYY-MM-DD
  source: "csv-tag" | "path" | "mtime";
}

function toIso(y: string, m: string, d: string): string | null {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yy.toString().padStart(4, "0")}-${mm.toString().padStart(2, "0")}-${dd
    .toString()
    .padStart(2, "0")}`;
}

// 優先層級 1：CSV 檔內容前幾列的 date: YYYY-MM-DD 標籤
export function resolveDateFromCsvText(text: string): string | null {
  const lines = text.split(/\r?\n/).slice(0, 15);
  for (const line of lines) {
    const m = line.match(/date\s*[:：]\s*(\d{4})-(\d{1,2})-(\d{1,2})/i);
    if (m) return toIso(m[1], m[2], m[3]);
  }
  return null;
}

// 優先層級 2：檔名內的 8 碼日期(YYYYMMDD)，如 EssReport_20260719.csv
export function resolveDateFromPath(relativePath: string): string | null {
  const segments = relativePath.split(/[/\\]/);
  const filename = segments[segments.length - 1];

  const eightDigit = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (eightDigit) {
    const iso = toIso(eightDigit[1], eightDigit[2], eightDigit[3]);
    if (iso) return iso;
  }
  return null;
}

// 備用層級：檔案最後修改時間
export function resolveDateFromMtime(lastModified: number): string {
  const d = new Date(lastModified);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
