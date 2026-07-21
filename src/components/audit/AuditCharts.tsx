import type { AbnormalStatus } from "../../lib/audit/types";

const STATUS_TYPES: AbnormalStatus[] = ["控制器異常", "燈具異常", "複合異常"];

const CHART_W = 560;
const CHART_H = 260;
const MARGIN = { top: 24, right: 16, bottom: 28, left: 36 };
const BAR_W = 56;

// 總異常燈具數依三種類型（控制器異常/燈具異常/複合異常）拆分的單一數列柱狀圖
export function AuditStatusBarChart({ counts }: { counts: Record<AbnormalStatus, number> }) {
  const plotW = CHART_W - MARGIN.left - MARGIN.right;
  const plotH = CHART_H - MARGIN.top - MARGIN.bottom;

  const maxTotal = Math.max(1, ...STATUS_TYPES.map((s) => counts[s]));
  const niceMax = Math.ceil(maxTotal / 5) * 5 || 5;
  const yScale = (v: number) => plotH - (v / niceMax) * plotH;
  const slotW = plotW / STATUS_TYPES.length;

  return (
    <figure className="audit-chart">
      <figcaption>總異常燈具數 × 異常類型</figcaption>
      <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="總異常燈具數依異常類型拆分的柱狀圖">
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

          {STATUS_TYPES.map((status, i) => {
            const value = counts[status];
            const cx = slotW * i + slotW / 2;
            const barX = cx - BAR_W / 2;
            const y = yScale(value);
            const h = plotH - y;

            return (
              <g key={status}>
                {value > 0 && (
                  <>
                    <rect x={barX} y={y} width={BAR_W} height={Math.max(h, 0.0001)} fill="var(--accent)" rx={4} ry={4} />
                    {h > 4 && (
                      <rect x={barX} y={y + Math.min(4, h)} width={BAR_W} height={Math.max(h - 4, 0)} fill="var(--accent)" />
                    )}
                    <title>
                      {status} · {value} 筆
                    </title>
                  </>
                )}
                <text x={cx} y={y - 6} textAnchor="middle" className="chart-value-label">
                  {value}
                </text>
                <text x={cx} y={plotH + 18} textAnchor="middle" className="chart-tick">
                  {status}
                </text>
              </g>
            );
          })}

          <line x1={0} x2={plotW} y1={plotH} y2={plotH} stroke="var(--text)" strokeWidth={1} />
        </g>
      </svg>
    </figure>
  );
}

const PIE_R = 76;
const PIE_CX = 96;
const PIE_CY = 96;
const PIE_SIZE = 192;

// 總異常燈具數中，落在智能燈清冊（白名單）內 vs 不在清冊內的比例
export function AuditCoveragePie({
  totalAbnormalCount,
  whitelistAbnormalCount,
}: {
  totalAbnormalCount: number;
  whitelistAbnormalCount: number;
}) {
  const outsideCount = Math.max(totalAbnormalCount - whitelistAbnormalCount, 0);
  const data = [
    { key: "inList", label: "清冊內", value: whitelistAbnormalCount, color: "var(--accent)" },
    { key: "outsideList", label: "不在清冊內", value: outsideCount, color: "var(--chart-muted)" },
  ].filter((d) => d.value > 0);

  const total = totalAbnormalCount;
  const circumference = 2 * Math.PI * PIE_R;
  let offsetAccum = 0;

  return (
    <figure className="audit-chart">
      <figcaption>總異常燈具數 × 清冊涵蓋範圍</figcaption>
      <svg viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`} role="img" aria-label="總異常燈具數與清冊內異常燈具數的涵蓋比例圓餅圖">
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
          總異常燈具數
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
