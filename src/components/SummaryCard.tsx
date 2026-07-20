import type { PoleTimeline } from "../lib/types";

interface Props {
  timeline: PoleTimeline;
}

export function SummaryCard({ timeline }: Props) {
  const changes = timeline.ranges.filter((r) => r.status === "changed");
  const missingGaps = timeline.ranges.filter((r) => r.status === "missing");

  return (
    <section className="panel summary-card">
      <h2>查詢桿號：{timeline.polesId}</h2>

      <div className="summary-line">
        <span className="summary-key">最新控制器 ID</span>
        <span className="summary-value">
          {timeline.latestControllerId ?? "（查無資料）"}
          {timeline.latestDate && (
            <span className="summary-sub">（最後紀錄日期：{timeline.latestDate}）</span>
          )}
        </span>
      </div>

      <div className="summary-line">
        <span className="summary-key">歷史累計異動</span>
        <span className="summary-value">{timeline.changeCount} 次控制器異動</span>
      </div>

      {changes.length > 0 && (
        <div className="summary-block">
          <div className="summary-key">異動歷史總結</div>
          <ul className="summary-list">
            {changes.map((c, i) => (
              <li key={i}>
                📍 {c.startDate}：舊值 {c.prevControllerId} ➔ 新值 {c.controllerId}
              </li>
            ))}
          </ul>
        </div>
      )}

      {missingGaps.length > 0 && (
        <div className="summary-block">
          <div className="summary-key">異常提醒</div>
          <ul className="summary-list warning">
            {missingGaps.map((g, i) => (
              <li key={i}>
                ⚠️{" "}
                {g.startDate === g.endDate
                  ? `${g.startDate} 無上線紀錄（資料缺漏）`
                  : `${g.startDate} 至 ${g.endDate} 期間無上線紀錄（資料缺漏）`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
