import { formatUtcMsAsNaive, HOURS_24_MS } from "./dateUtils";
import {
  parseOrderFile,
  parseRepairFile,
  parseStreetlightFile,
  parseWhitelistFile,
  type PoleTimeIndex,
} from "./parseAuditFiles";
import type { AbnormalStatus, AnalyzedRow, AuditFlag, AuditResult, SuspendedRow } from "./types";
import type { AuditFileSet } from "./collectAuditFiles";

// 在桿號自己的時間清單中找落在 [from, to] 區間內、時間最新的一筆紀錄
// （同一桿號可能有多筆落在區間內，例如多次開單／報修，要以最新一筆為準；同一桿號紀錄通常不多，線性掃描即可）
function findInWindow(times: number[] | undefined, from: number, to: number): number | null {
  if (!times) return null;
  let latest: number | null = null;
  for (const t of times) {
    if (t >= from && t <= to && (latest === null || t > latest)) latest = t;
  }
  return latest;
}

export async function runAudit(files: AuditFileSet): Promise<AuditResult> {
  if (!files.streetlight || !files.whitelist || !files.order || !files.repair) {
    throw new Error("缺少必要的來源檔案，無法執行分析。");
  }

  const [streetlightIndex, whitelist, orderIndex, repairIndex] = await Promise.all([
    parseStreetlightFile(files.streetlight),
    parseWhitelistFile(files.whitelist),
    parseOrderFile(files.order),
    parseRepairFile(files.repair),
  ]);

  const analyzedRows: AnalyzedRow[] = [];
  const suspendedRows: SuspendedRow[] = [];
  let whitelistAbnormalCount = 0;
  const abnormalByStatus: Record<AbnormalStatus, number> = {
    控制器異常: 0,
    燈具異常: 0,
    複合異常: 0,
  };

  for (const row of streetlightIndex.abnormalRows) {
    abnormalByStatus[row.status]++;
    if (!whitelist.has(row.polesKey)) continue;
    whitelistAbnormalCount++;

    if (row.lastReceiveTimeMs === null) {
      suspendedRows.push({
        polesKey: row.polesKey,
        polesId: row.polesId,
        controllerId: row.controllerId,
        status: row.status,
      });
      continue;
    }

    const tBase = row.lastReceiveTimeMs;
    const flags: AuditFlag[] = [];

    const orderMatch = findInWindow(
      (orderIndex as PoleTimeIndex).get(row.polesKey),
      tBase - HOURS_24_MS,
      tBase
    );
    if (orderMatch === null) flags.push("func1_missing_order");

    const repairMatch = findInWindow(
      (repairIndex as PoleTimeIndex).get(row.polesKey),
      tBase - HOURS_24_MS,
      tBase + HOURS_24_MS
    );
    if (repairMatch !== null) flags.push("func2_closed_not_recovered");

    analyzedRows.push({
      polesKey: row.polesKey,
      polesId: row.polesId,
      controllerId: row.controllerId,
      status: row.status,
      lastReceiveTimeMs: tBase,
      lastReceiveTimeLabel: formatUtcMsAsNaive(tBase),
      flags,
      func1MatchedOrderTime: orderMatch !== null ? formatUtcMsAsNaive(orderMatch) : null,
      func2MatchedCaseTime: repairMatch !== null ? formatUtcMsAsNaive(repairMatch) : null,
    });
  }

  const func1Count = analyzedRows.filter((r) => r.flags.includes("func1_missing_order")).length;
  const func2Count = analyzedRows.filter((r) => r.flags.includes("func2_closed_not_recovered")).length;
  const analyzedCount = analyzedRows.length;
  const totalAbnormalCount = streetlightIndex.abnormalRows.length;

  return {
    summary: {
      totalStreetlightRows: streetlightIndex.totalRows,
      totalAbnormalCount,
      abnormalByStatus,
      whitelistAbnormalCount,
      suspendedCount: suspendedRows.length,
      analyzedCount,
      func1Count,
      func2Count,
      func1Rate: totalAbnormalCount > 0 ? func1Count / totalAbnormalCount : 0,
    },
    analyzedRows,
    suspendedRows,
    sourceFileNames: {
      streetlight: files.streetlight.name,
      whitelist: files.whitelist.name,
      order: files.order.name,
      repair: files.repair.name,
    },
  };
}
