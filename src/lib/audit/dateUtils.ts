// 報表來源的日期時間可能是兩種形式：
// 1. CSV 文字日期字串（如 "2026-07-20 03:25:00"），解析器有時會自動轉成 Excel 序列數字
// 2. xlsx 原生日期儲存格，本來就是 Excel 序列數字
// 兩者都在這裡統一換算成同一個時間基準（把原始的年月日時分秒直接視為 UTC 欄位），
// 這樣不論來源是字串還是序列數字，同一個時間點換算出來的 ms 一定相等，
// ±24 小時比對才不會因為瀏覽器時區設定不同而產生誤差。
const EXCEL_EPOCH_OFFSET_DAYS = 25569; // 1899-12-30 -> 1970-01-01

function excelSerialToUtcMs(serial: number): number {
  return Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * 86400 * 1000);
}

const DATETIME_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

export function parseNaiveDateTime(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    return excelSerialToUtcMs(raw);
  }

  const s = String(raw).trim();
  if (!s) return null;

  const dt = s.match(DATETIME_PATTERN);
  if (dt) {
    const [, y, mo, d, h, mi, se] = dt;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se ?? 0));
  }

  const dateOnly = s.match(DATE_ONLY_PATTERN);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    return Date.UTC(Number(y), Number(mo) - 1, Number(d));
  }

  // 退路：純數字字串（Excel 序列數字被當成文字讀入的情況）
  const asNumber = Number(s);
  if (Number.isFinite(asNumber) && asNumber > 0) return excelSerialToUtcMs(asNumber);

  return null;
}

export function formatUtcMsAsNaive(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const h = d.getUTCHours().toString().padStart(2, "0");
  const mi = d.getUTCMinutes().toString().padStart(2, "0");
  const s = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}:${s}`;
}

export const HOURS_24_MS = 24 * 60 * 60 * 1000;
