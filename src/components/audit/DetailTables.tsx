import { useMemo, useState } from "react";
import type { AnalyzedRow, SuspendedRow } from "../../lib/audit/types";

type TabId = "func1" | "func2" | "suspended";

const TABS: { id: TabId; label: (n: number) => string }[] = [
  { id: "func1", label: (n) => `應開單未開單明細 (${n})` },
  { id: "func2", label: (n) => `已結案未恢復明細 (${n})` },
  { id: "suspended", label: (n) => `暫停停用明細 (${n})` },
];

function matchesSearch(polesId: string, controllerId: string, keyword: string): boolean {
  if (!keyword) return true;
  const k = keyword.trim().toLowerCase();
  return polesId.toLowerCase().includes(k) || controllerId.toLowerCase().includes(k);
}

export function DetailTables({
  func1Rows,
  func2Rows,
  suspendedRows,
}: {
  func1Rows: AnalyzedRow[];
  func2Rows: AnalyzedRow[];
  suspendedRows: SuspendedRow[];
}) {
  const [tab, setTab] = useState<TabId>("func1");
  const [keyword, setKeyword] = useState("");

  const counts: Record<TabId, number> = {
    func1: func1Rows.length,
    func2: func2Rows.length,
    suspended: suspendedRows.length,
  };

  const filteredFunc1 = useMemo(
    () => func1Rows.filter((r) => matchesSearch(r.polesId, r.controllerId, keyword)),
    [func1Rows, keyword]
  );
  const filteredFunc2 = useMemo(
    () => func2Rows.filter((r) => matchesSearch(r.polesId, r.controllerId, keyword)),
    [func2Rows, keyword]
  );
  const filteredSuspended = useMemo(
    () => suspendedRows.filter((r) => matchesSearch(r.polesId, r.controllerId, keyword)),
    [suspendedRows, keyword]
  );

  return (
    <section className="panel detail-tables">
      <div className="timeline-header">
        <nav className="tab-bar tab-bar-sub">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-button${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label(counts[t.id])}
            </button>
          ))}
        </nav>
        <input
          type="text"
          className="text-input search-input"
          placeholder="搜尋 poles_id 或 controller_id"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {tab === "func1" && (
        <table className="log-table">
          <thead>
            <tr>
              <th>poles_id</th>
              <th>controller_id</th>
              <th>異常類型</th>
              <th>異常發生時間 (T_base)</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {filteredFunc1.map((r, i) => (
              <tr key={i} className="row-changed">
                <td>{r.polesId}</td>
                <td>{r.controllerId}</td>
                <td>{r.status}</td>
                <td>{r.lastReceiveTimeLabel}</td>
                <td>過去 24 小時內查無對應開單紀錄</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "func2" && (
        <table className="log-table">
          <thead>
            <tr>
              <th>poles_id</th>
              <th>controller_id</th>
              <th>異常類型</th>
              <th>異常發生時間 (T_base)</th>
              <th>結案時間</th>
            </tr>
          </thead>
          <tbody>
            {filteredFunc2.map((r, i) => (
              <tr key={i} className="row-changed">
                <td>{r.polesId}</td>
                <td>{r.controllerId}</td>
                <td>{r.status}</td>
                <td>{r.lastReceiveTimeLabel}</td>
                <td>{r.func2MatchedCaseTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === "suspended" && (
        <table className="log-table">
          <thead>
            <tr>
              <th>poles_id</th>
              <th>controller_id</th>
              <th>異常類型</th>
              <th>備註</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuspended.map((r, i) => (
              <tr key={i} className="row-missing">
                <td>{r.polesId}</td>
                <td>{r.controllerId}</td>
                <td>{r.status}</td>
                <td>last_receive_time 為空，暫停停用，不列入功能1/功能2分析</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
