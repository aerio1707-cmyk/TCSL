import type { AuditSummary } from "../../lib/audit/types";

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function KpiDashboard({ summary }: { summary: AuditSummary }) {
  const tiles = [
    { label: "總檢測燈具數", value: summary.totalStreetlightRows.toLocaleString() },
    { label: "總異常燈具數", value: summary.totalAbnormalCount.toLocaleString() },
    { label: "清冊內異常燈具數量", value: summary.whitelistAbnormalCount.toLocaleString() },
    {
      label: "應開單未開單數（功能1）",
      value: summary.func1Count.toLocaleString(),
      sub: `占總異常燈具數 ${pct(summary.func1Rate)}`,
      tone: summary.func1Count > 0 ? "warning" : undefined,
    },
    {
      label: "已結案仍異常數（功能2）",
      value: summary.func2Count.toLocaleString(),
      tone: summary.func2Count > 0 ? "serious" : undefined,
    },
  ];

  return (
    <section className="panel kpi-dashboard">
      <div className="kpi-grid">
        {tiles.map((t) => (
          <div key={t.label} className={`kpi-tile${t.tone ? ` kpi-tone-${t.tone}` : ""}`}>
            <div className="kpi-label">{t.label}</div>
            <div className="kpi-value">{t.value}</div>
            {t.sub && <div className="kpi-sub">{t.sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
