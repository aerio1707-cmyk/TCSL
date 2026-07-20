// 去除 Excel 公式字串符號 ="0200090" -> 0200090，並 trim 前後空白
export function cleanValue(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let v = String(raw).trim();
  const formulaMatch = v.match(/^="?(.*?)"?$/);
  if (formulaMatch) v = formulaMatch[1];
  return v.trim();
}

// 將 poles_id 正規化為「去除前導零」的比對用鍵值，讓 0200090 與 200090 視為同一支
// （Excel 數字儲存格會遺失前導零，因此用這個 key 做比對，但畫面顯示仍用原始/清理後字串）
export function normalizePolesKey(raw: string): string {
  const cleaned = cleanValue(raw);
  if (/^\d+$/.test(cleaned)) {
    const stripped = cleaned.replace(/^0+/, "");
    return stripped === "" ? "0" : stripped;
  }
  return cleaned;
}

export function parsePoleIdsInput(input: string): string[] {
  return input
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
