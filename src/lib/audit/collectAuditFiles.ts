export interface AuditFileSet {
  streetlight: File | null;
  whitelist: File | null;
  order: File | null;
  repair: File | null;
  streetlightCandidates: number; // 資料夾內符合 Streetlight_*.csv 樣式的檔案數，供畫面顯示
}

const STREETLIGHT_PATTERN = /^Streetlight_(\d{14})\.csv$/i;
const WHITELIST_NAME = "智能燈清冊.xlsx";
const ORDER_NAME = "Info_Order.csv";
const REPAIR_NAME = "報修清單匯出.xlsx";

function basename(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const path = rel || file.name;
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1];
}

// 在使用者選取的資料夾（含子目錄）中辨識四種來源檔案：
// Streetlight_YYYYMMDDHHMMSS.csv 取時間戳記最新的一份，其餘三種為固定檔名比對
export function collectAuditFiles(fileList: FileList): AuditFileSet {
  let streetlight: File | null = null;
  let streetlightStamp = "";
  let streetlightCandidates = 0;
  let whitelist: File | null = null;
  let order: File | null = null;
  let repair: File | null = null;

  for (const file of Array.from(fileList)) {
    const name = basename(file);

    const slMatch = name.match(STREETLIGHT_PATTERN);
    if (slMatch) {
      streetlightCandidates++;
      if (slMatch[1] > streetlightStamp) {
        streetlightStamp = slMatch[1];
        streetlight = file;
      }
      continue;
    }
    if (name === WHITELIST_NAME) {
      whitelist = file;
      continue;
    }
    if (name === ORDER_NAME) {
      order = file;
      continue;
    }
    if (name === REPAIR_NAME) {
      repair = file;
      continue;
    }
  }

  return { streetlight, whitelist, order, repair, streetlightCandidates };
}
