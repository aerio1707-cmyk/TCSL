import type { DayEntry, DayStatus, LogRange, PoleTimeline, ReportFile } from "./types";
import { normalizePolesKey } from "./clean";
import { indexFileByPole } from "./parseReport";

function isoToUtcMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToIso(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function enumerateDateRange(minIso: string, maxIso: string): string[] {
  const start = isoToUtcMs(minIso);
  const end = isoToUtcMs(maxIso);
  const dates: string[] = [];
  for (let t = start; t <= end; t += 86_400_000) dates.push(utcMsToIso(t));
  return dates;
}

// 依時間軸（舊到新）逐一標記狀態：初始 / 不變 / 異動 / 缺漏
function classify(entries: DayEntry[]): void {
  let lastKnownControllerId: string | undefined;
  for (const entry of entries) {
    if (entry.controllerId === null) {
      entry.status = "missing";
      continue;
    }
    if (lastKnownControllerId === undefined) {
      entry.status = "initial";
      entry.note = entry.note || "該桿號在查詢範圍內第一次出現紀錄";
    } else if (entry.controllerId === lastKnownControllerId) {
      entry.status = "unchanged";
    } else {
      entry.status = "changed";
      entry.prevControllerId = lastKnownControllerId;
      entry.note = `控制器由 ${lastKnownControllerId} 變更為 ${entry.controllerId}`;
    }
    lastKnownControllerId = entry.controllerId;
  }
}

// 把連續同狀態（且同值）的日期壓成一個區間，方便精簡日誌顯示
function buildRanges(entries: DayEntry[]): LogRange[] {
  const ranges: LogRange[] = [];
  for (const entry of entries) {
    const last = ranges[ranges.length - 1];
    const canMerge =
      last &&
      last.status === entry.status &&
      (entry.status === "unchanged" || entry.status === "missing") &&
      last.controllerId === entry.controllerId;

    if (canMerge && last) {
      last.endDate = entry.date;
      last.dayCount += 1;
    } else {
      ranges.push({
        status: entry.status,
        startDate: entry.date,
        endDate: entry.date,
        controllerId: entry.controllerId,
        prevControllerId: entry.prevControllerId,
        dayCount: 1,
        note: entry.note,
      });
    }
  }
  return ranges.reverse(); // 顯示由新到舊
}

const STATUS_NOTE: Record<DayStatus, string> = {
  initial: "初始紀錄",
  unchanged: "保持不變",
  changed: "控制器異動",
  missing: "資料缺漏/未上線",
};

export async function buildTimelines(
  winners: Map<string, ReportFile>,
  poleIds: string[]
): Promise<Map<string, PoleTimeline>> {
  const result = new Map<string, PoleTimeline>();
  const entriesByPole = new Map<string, DayEntry[]>();
  for (const id of poleIds) entriesByPole.set(id, []);

  if (winners.size === 0 || poleIds.length === 0) {
    for (const id of poleIds) {
      result.set(id, {
        polesId: id,
        entries: [],
        ranges: [],
        changeCount: 0,
        latestControllerId: null,
        latestDate: null,
      });
    }
    return result;
  }

  const allDates = [...winners.keys()].sort();
  const dateRange = enumerateDateRange(allDates[0], allDates[allDates.length - 1]);
  const keyByPole = new Map(poleIds.map((id) => [id, normalizePolesKey(id)]));

  for (const date of dateRange) {
    const rf = winners.get(date);
    const index = rf ? await indexFileByPole(rf.file) : null;

    for (const poleId of poleIds) {
      const list = entriesByPole.get(poleId)!;
      if (!rf) {
        list.push({
          date,
          polesId: poleId,
          controllerId: null,
          status: "missing",
          note: "當日查無報表（掃描範圍內無檔案）",
        });
        continue;
      }
      const found = index!.get(keyByPole.get(poleId)!);
      if (found) {
        list.push({
          date,
          polesId: poleId,
          controllerId: found.controllerId,
          status: "unchanged",
          note: "",
          sourceFile: rf.relativePath,
          sourceSheet: found.sheetName,
        });
      } else {
        list.push({
          date,
          polesId: poleId,
          controllerId: null,
          status: "missing",
          note: "報表中查無此桿號資料",
          sourceFile: rf.relativePath,
        });
      }
    }
  }

  for (const poleId of poleIds) {
    const entries = entriesByPole.get(poleId)!;
    classify(entries);
    for (const e of entries) {
      if (!e.note) e.note = STATUS_NOTE[e.status];
    }
    const ranges = buildRanges(entries);
    const changeCount = entries.filter((e) => e.status === "changed").length;
    const lastWithData = [...entries].reverse().find((e) => e.controllerId !== null);

    result.set(poleId, {
      polesId: poleId,
      entries,
      ranges,
      changeCount,
      latestControllerId: lastWithData?.controllerId ?? null,
      latestDate: lastWithData?.date ?? null,
    });
  }

  return result;
}
