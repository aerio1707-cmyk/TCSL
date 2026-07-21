import type { CategorySummary, SourceSummary } from "../../lib/repair/types";

const PIE_R = 76;
const PIE_CX = 96;
const PIE_CY = 96;
const PIE_SIZE = 192;

interface PieDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

// 通用色塊環狀圖：沿用稽核頁 AuditFunc1Pie 的畫法（stroke-dasharray 疊環），
// 支援任意色塊數量，色塊中間標示百分比、太窄的色塊改由圖例呈現
function PieChart({ data, total, centerLabel }: { data: PieDatum[]; total: number; centerLabel: string }) {
  const shown = data.filter((d) => d.value > 0);
  const circumference = 2 * Math.PI * PIE_R;
  const MIN_LABEL_FRACTION = 0.05;

  let offsetAccum = 0;
  const labels = shown.map((d) => {
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
    <svg viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`} role="img" aria-label={`${centerLabel}圓餅圖`}>
      <g transform={`rotate(-90 ${PIE_CX} ${PIE_CY})`}>
        {total === 0 ? (
          <circle cx={PIE_CX} cy={PIE_CY} r={PIE_R} fill="none" stroke="var(--border)" strokeWidth={24} />
        ) : (
          shown.map((d) => {
            const frac = d.value / total;
            const dash = Math.max(frac * circumference - 2, 0);
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
                  {d.label} · {d.value} 筆（{((d.value / total) * 100).toFixed(2)}%）
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
        {centerLabel}
      </text>
    </svg>
  );
}

function Legend({ data, total }: { data: PieDatum[]; total: number }) {
  return (
    <ul className="chart-legend">
      {data
        .filter((d) => d.value > 0)
        .map((d) => (
          <li key={d.key}>
            <span className="legend-swatch" style={{ background: d.color }} />
            {d.label}（{d.value}，{total > 0 ? ((d.value / total) * 100).toFixed(2) : "0"}%）
          </li>
        ))}
    </ul>
  );
}

// 圖表1：通報來源結構占比（承商自主通報＋自主API vs 其餘通報來源）
export function RepairSourcePie({ summary }: { summary: SourceSummary }) {
  const data: PieDatum[] = [
    { key: "inScope", label: "承商自主通報＋自主API", value: summary.inScopeCount, color: "var(--pie-a)" },
    { key: "other", label: "其餘通報來源", value: summary.otherSourceCount, color: "var(--pie-b)" },
  ];
  return (
    <figure className="audit-chart chart-compact">
      <figcaption>通報來源結構占比</figcaption>
      <PieChart data={data} total={summary.totalCount} centerLabel="全部工單" />
      <Legend data={data} total={summary.totalCount} />
    </figure>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  燈具: "var(--repair-cat-1)",
  電源: "var(--repair-cat-2)",
  網路訊號: "var(--repair-cat-3)",
  智控器: "var(--repair-cat-4)",
  台電: "var(--repair-cat-5)",
  正常: "var(--repair-cat-6)",
  其他: "var(--repair-cat-7)",
};

// 圖表2 前半：工單處置分類樞紐摘要表
export function RepairCategoryTable({ summaries }: { summaries: CategorySummary[] }) {
  return (
    <div className="pivot-table-wrap">
      <table className="log-table pivot-table">
        <thead>
          <tr>
            <th>列標籤</th>
            <th>計數 - 案件編號</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.category}>
              <td>
                <span className="legend-swatch" style={{ background: CATEGORY_COLORS[s.category] }} />
                {s.category}
              </td>
              <td>{(s.ratio * 100).toFixed(2)}%</td>
            </tr>
          ))}
          <tr className="pivot-total-row">
            <td>總計</td>
            <td>100.00%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// 圖表2 後半：類別占比圓餅圖（佔比以篩選後承商自主通報＋自主API筆數為分母）
export function RepairCategoryPie({ summaries }: { summaries: CategorySummary[] }) {
  const total = summaries.reduce((sum, s) => sum + s.count, 0);
  const data: PieDatum[] = summaries.map((s) => ({
    key: s.category,
    label: s.category,
    value: s.count,
    color: CATEGORY_COLORS[s.category] ?? "var(--text)",
  }));

  return (
    <figure className="audit-chart chart-compact">
      <figcaption>類別占比（共 {total} 筆）</figcaption>
      <PieChart data={data} total={total} centerLabel="篩選後工單" />
      <Legend data={data} total={total} />
    </figure>
  );
}
