import type { AbnormalStatus } from "../../lib/audit/types";

const STATUS_TYPES: AbnormalStatus[] = ["控制器異常", "燈具異常", "複合異常"];
const STATUS_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)"];

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
            const color = STATUS_COLORS[i];

            return (
              <g key={status}>
                {value > 0 && (
                  <>
                    <rect x={barX} y={y} width={BAR_W} height={Math.max(h, 0.0001)} fill={color} rx={4} ry={4} />
                    {h > 4 && <rect x={barX} y={y + Math.min(4, h)} width={BAR_W} height={Math.max(h - 4, 0)} fill={color} />}
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

// 總異常燈具數中，應開單未開單（功能1）vs 其餘的比例
// 分子分母跟 KPI 卡片「應開單未開單數（功能1）」下方的百分比使用同一個定義，兩者數字一致
export function AuditFunc1Pie({
  totalAbnormalCount,
  func1Count,
}: {
  totalAbnormalCount: number;
  func1Count: number;
}) {
  const restCount = Math.max(totalAbnormalCount - func1Count, 0);
  const data = [
    { key: "func1", label: "應開單未開單", value: func1Count, color: "var(--pie-a)" },
    { key: "rest", label: "其餘", value: restCount, color: "var(--pie-b)" },
  ].filter((d) => d.value > 0);

  const total = totalAbnormalCount;
  const circumference = 2 * Math.PI * PIE_R;
  let offsetAccum = 0;

  // 色塊中間標示百分比：換算成「未旋轉座標系」下的角度，文字才不會跟著圓弧一起轉向
  const MIN_LABEL_FRACTION = 0.08; // 太窄的色塊放不下文字，交給圖例呈現即可
  const labels = data.map((d) => {
    const frac = d.value / total;
    const startFrac = offsetAccum / circumference;
    const midFrac = startFrac + frac / 2;
    offsetAccum += frac * circumference;
    const angleRad = ((midFrac * 360 - 90) * Math.PI) / 180;
    return {
      key: d.key,
      pct: (frac * 100).toFixed(1),
      show: frac >= MIN_LABEL_FRACTION,
      x: PIE_CX + PIE_R * Math.cos(angleRad),
      y: PIE_CY + PIE_R * Math.sin(angleRad),
    };
  });
  offsetAccum = 0;

  return (
    <figure className="audit-chart">
      <figcaption>總異常燈具數 × 應開單未開單佔比</figcaption>
      <svg viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`} role="img" aria-label="總異常燈具數中應開單未開單的佔比圓餅圖">
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
        {labels
          .filter((l) => l.show)
          .map((l) => (
            <text key={l.key} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" className="chart-pie-label">
              {l.pct}%
            </text>
          ))}
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
