import { useState } from "react";
import type { PoleTimeline } from "../lib/types";

interface Props {
  timeline: PoleTimeline;
}

const STATUS_ICON: Record<string, string> = {
  initial: "⚪",
  unchanged: "🟢",
  changed: "🔴",
  missing: "🟡",
};

export function TimelinePanel({ timeline }: Props) {
  const [showFull, setShowFull] = useState(false);

  return (
    <section className="panel timeline-panel">
      <div className="timeline-header">
        <h3>歷史異動日誌</h3>
        <label className="toggle">
          <input type="checkbox" checked={showFull} onChange={(e) => setShowFull(e.target.checked)} />
          顯示完整逐日紀錄
        </label>
      </div>

      {!showFull ? (
        <table className="log-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>狀態</th>
              <th>變更細節 / 說明</th>
              <th>天數</th>
            </tr>
          </thead>
          <tbody>
            {timeline.ranges.map((r, i) => (
              <tr key={i} className={`row-${r.status}`}>
                <td>{r.startDate === r.endDate ? r.startDate : `${r.startDate} ~ ${r.endDate}`}</td>
                <td>
                  {STATUS_ICON[r.status]} {r.note && r.status !== "changed" ? "" : ""}
                  {r.status === "changed"
                    ? "控制器異動"
                    : r.status === "unchanged"
                      ? "保持不變"
                      : r.status === "missing"
                        ? "資料缺漏/未上線"
                        : "初始紀錄"}
                </td>
                <td>
                  {r.status === "changed"
                    ? `${r.prevControllerId} ➔ ${r.controllerId}`
                    : r.status === "initial"
                      ? `${r.controllerId}`
                      : r.note}
                </td>
                <td>{r.dayCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="log-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>poles_id</th>
              <th>controller_id</th>
              <th>狀態</th>
              <th>變更細節</th>
              <th>備註與檔案來源</th>
            </tr>
          </thead>
          <tbody>
            {[...timeline.entries].reverse().map((e) => (
              <tr key={e.date} className={`row-${e.status}`}>
                <td>{e.date}</td>
                <td>{e.polesId}</td>
                <td>{e.controllerId ?? "(無紀錄)"}</td>
                <td>
                  {STATUS_ICON[e.status]}{" "}
                  {e.status === "changed"
                    ? "控制器異動"
                    : e.status === "unchanged"
                      ? "保持不變"
                      : e.status === "missing"
                        ? "資料缺漏"
                        : "初始紀錄"}
                </td>
                <td>{e.status === "changed" ? `${e.prevControllerId} ➔ ${e.controllerId}` : "-"}</td>
                <td>{e.sourceFile ? `${e.sourceFile}${e.sourceSheet ? ` (${e.sourceSheet})` : ""}` : e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
