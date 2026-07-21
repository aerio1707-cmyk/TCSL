import type { ReportFile } from "./types";
import {
  resolveDateFromCsvText,
  resolveDateFromMtime,
  resolveDateFromPath,
} from "./dateResolve";

// 從檔名尾端擷取時間戳記（例如 xxx_143000.csv 的 143000 -> 14:30:00），用於同日多檔案取捨
function extractFilenameTimeMs(filename: string, dateIso: string): number | null {
  const m = filename.match(/_(\d{2})(\d{2})(\d{2})(?=\.\w+$)/);
  if (!m) return null;
  const [, hh, mm, ss] = m;
  const h = Number(hh);
  const mi = Number(mm);
  const s = Number(ss);
  if (h > 23 || mi > 59 || s > 59) return null;
  return new Date(`${dateIso}T${hh}:${mm}:${ss}`).getTime();
}

function isSupportedReport(filename: string): boolean {
  return /\.csv$/i.test(filename);
}

async function resolveFile(file: File, relativePath: string): Promise<ReportFile> {
  let date: string | null = null;
  let dateSource: ReportFile["dateSource"] = "mtime";

  const head = await file.text();
  const tagDate = resolveDateFromCsvText(head);
  if (tagDate) {
    date = tagDate;
    dateSource = "csv-tag";
  }

  if (!date) {
    const pathDate = resolveDateFromPath(relativePath);
    if (pathDate) {
      date = pathDate;
      dateSource = "path";
    }
  }

  if (!date) {
    date = resolveDateFromMtime(file.lastModified);
    dateSource = "mtime";
  }

  const filenameTimeMs = extractFilenameTimeMs(file.name, date);
  const tieBreakKey = filenameTimeMs ?? file.lastModified;

  return { file, relativePath, date, dateSource, tieBreakKey };
}

// 掃描 <input webkitdirectory> 選取的所有檔案，解析日期、過濾非報表檔案
export async function collectReportFiles(fileList: FileList): Promise<ReportFile[]> {
  const candidates = Array.from(fileList).filter((f) => isSupportedReport(f.name));
  const relPaths = candidates.map(
    (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
  );
  return Promise.all(candidates.map((f, i) => resolveFile(f, relPaths[i])));
}

// 同一天若有多份檔案，取捨出獲勝檔案（最後修改時間/檔名時間戳記最晚者）
export function pickWinnersByDate(files: ReportFile[]): Map<string, ReportFile> {
  const winners = new Map<string, ReportFile>();
  for (const rf of files) {
    const current = winners.get(rf.date);
    if (!current || rf.tieBreakKey > current.tieBreakKey) {
      winners.set(rf.date, rf);
    }
  }
  return winners;
}
