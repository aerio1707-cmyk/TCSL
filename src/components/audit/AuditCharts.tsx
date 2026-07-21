import type { AbnormalStatus, AnalyzedRow } from "../../lib/audit/types";

const STATUS_TYPES: AbnormalStatus[] = ["控制器異常", "燈具異常", "複合異常"];

type Bucket = "normal" | "func1" | "func2" | "both";

const BUCKET_META: Record<Bucket, { label: string; color: string }> = {
  normal: { label: "正常", color: "var(--status-good)" },
  func1: { label: "功能1異常（應開單未開單）", color: "var(--status-warning)" },
  func2: { label: "功能2異常（已結案未恢復）", color: "var(--status-serious)" },
  both: { label: "雙重異常（功能1+2）", color: "var(--status-critical)" },
};
const BUCKET_ORDER: Bucket[] = ["normal", "func1", "func2", "both"];

function bucketOf(row: AnalyzedRow): Bucket {
  const f1 = row.flags.includes("func1_missing_order");
  const f2 = row.flags.includes("func2_closed_not_recovered");
  if (f1 && f2) return "both";
  if (f1) return "func1";
  if (f2) return "func2";
  return "normal";
}

const CHART_W = 560;
const CHART_H = 260;
const MARGIN = { top: 24, right: 16, bottom: 28, left: 36 };
const BAR_W = 56;
const GAP = 2; // 堆疊區塊間的表面色間隔

export function AuditStackedBarChart({ rows }: { rows: AnalyzedRow[] }) {
  const plotW = CHART_W - MARGIN.left - MARGIN.right;
  const plotH = CHART_H - MARGIN.top - MARGIN.bottom;

  const grouped = STATUS_TYPES.map((status) => {
    const inStatus = rows.filter((r) => r.status === status);
    const counts: Record<Bucket, number> = { normal: 0, func1: 0, func2: 0, both: 0 };
    for (const r of inStatus) counts[bucketOf(r)]++;
    return { status, total: inStatus.length, counts };
  });

  const maxTotal = Math.max(1, ...grouped.map((g) => g.total));
  const niceMax = Math.ceil(maxTotal / 5) * 5 || 5;
  const yScale = (v: number) => plotH - (v / niceMax) * plotH;
  const slotW = plotW / STATUS_TYPES.length;

  return (
    <figure className="audit-chart">
      <figcaption>異常類型 × 稽核結果</figcaption>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="異常類型與稽核結果堆疊柱狀圖">
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const v = niceMax * t;
            const y = yScale(v);
            return (
              <g key={t}>
                <line x1={0} x2={plotW} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
                <text x={-8} y={y} textAnchor="end" dominantBaseline="middle" className="chart-tick">
                  {Math.round(v)}
                </text>
              </g>
            );
          })}

          {grouped.map((g, i) => {
            const cx = slotW * i + slotW / 2;
            const barX = cx - BAR_W / 2;
            let cursor = 0; // 由底部往上疊加的累積值
            const segments = BUCKET_ORDER.filter((b) => g.counts[b] > 0).map((b) => {
              const value = g.counts[b];
              const y0 = yScale(cursor);
              const y1 = yScale(cursor + value);
              cursor += value;
              return { bucket: b, value, y0, y1 };
            });
            const topY = segments.length > 0 ? segments[segments.length - 1].y1 : plotH;

            return (
              <g key={g.status}>
                {segments.map((seg, si) => {
                  const isTop = si === segments.length - 1;
                  const h = seg.y0 - seg.y1;
                  const rectH = Math.max(0, h - (segments.length > 1 && si > 0 ? GAP : 0));
                  const y = seg.y1 + (segments.length > 1 && si > 0 ? GAP : 0);
                  return (
                    <g key={seg.bucket}>
                      <rect
                        x={barX}
                        y={y}
                        width={BAR_W}
                        height={Math.max(rectH, 0.0001)}
                        fill={BUCKET_META[seg.bucket].color}
                        rx={isTop ? 4 : 0}
                        ry={isTop ? 4 : 0}
                      />
                      {isTop && rectH > 4 && (
                        <rect x={barX} y={y + Math.min(4, rectH)} width={BAR_W} height={Math.max(rectH - 4, 0)} fill={BUCKET_META[seg.bucket].color} />
                      )}
                      <title>
                        {g.status} · {BUCKET_META[seg.bucket].label} · {seg.value} 筆
                      </title>
                    </g>
                  );
                })}
                {g.total > 0 && (
                  <text x={cx} y={topY - 6} textAnchor="middle" className="chart-value-label">
                    {g.total}
                  </text>
                )}
                <text x={cx} y={plotH + 18} textAnchor="middle" className="chart-tick">
                  {g.status}
                </text>
              </g>
            );
          })}

          <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="var(--text)" strokeWidth={1} />
        </g>
      </svg>

      <ul className="chart-legend">
        {BUCKET_ORDER.map((b) => (
          <li key={b}>
            <span className="legend-swatch" style={{ background: BUCKET_META[b].color }} />
            {BUCKET_META[b].label}
          </li>
        ))}
      </ul>
    </figure>
  );
}

interface PieDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

const PIE_R = 76;
const PIE_CX = 96;
const PIE_CY = 96;
const PIE_SIZE = 192;

export function AuditCompliancePie({
  normalCount,
  violationCount,
  suspendedCount,
}: {
  normalCount: number;
  violationCount: number;
  suspendedCount: number;
}) {
  const data: PieDatum[] = [
    { key: "normal", label: "合規", value: normalCount, color: "var(--status-good)" },
    { key: "violation", label: "違規", value: violationCount, color: "var(--status-critical)" },
    { key: "suspended", label: "暫停停用（無法判定）", value: suspendedCount, color: "var(--chart-muted)" },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0);
  const circumference = 2 * Math.PI * PIE_R;
  let offsetAccum = 0;

  return (
    <figure className="audit-chart">
      <figcaption>異常燈具合規／違規比例</figcaption>
      <svg viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`} role="img" aria-label="異常燈具合規與違規比例圓餅圖">
        <g transform={`rotate(-90 ${PIE_CX} ${PIE_CY})`}>
          {total === 0 ? (
            <circle cx={PIE_CX} cy={PIE_CY} r={PIE_R} fill="none" stroke="var(--border)" strokeWidth={24} />
          ) : (
            data.map((d) => {
              const frac = d.value / total;
              const dash = Math.max(frac * circumference - 2, 0); // 2px 表面色間隔
              const dashArray = `${dash} ${circumference - dash}`;
              const dashOffset = -offsetAccum;
              offsetAccum += frac * circumference;
              return (
                <circle
                  key={d.key}
                  cx={PIE_CX}
                  cy={PIE_CY}
                  r={PIE_R}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={24}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                >
                  <title>
                    {d.label} · {d.value} 筆（{((d.value / total) * 100).toFixed(1)}%）
                  </title>
                </circle>
              );
            })
          )}
        </g>
        <text x={PIE_CX} y={PIE_CY - 6} textAnchor="middle" className="chart-donut-value">
          {total}
        </text>
        <text x={PIE_CX} y={PIE_CY + 14} textAnchor="middle" className="chart-tick">
          異常燈具總數
        </text>
      </svg>

      <ul className="chart-legend">
        {data.map((d) => (
          <li key={d.key}>
            <span className="legend-swatch" style={{ background: d.color }} />
            {d.label}（{d.value}，{total > 0 ? ((d.value / total) * 100).toFixed(1) : "0"}%）
          </li>
        ))}
      </ul>
    </figure>
  );
}
