import type { RepairCaseRow } from "../../lib/repair/types";

export function CaseNumberCollisionTable({ rows }: { rows: RepairCaseRow[] }) {
  return (
    <section className="panel">
      <div className="timeline-header">
        <h3>案件編號重複明細（{rows.length} 筆，皆已列入計算）</h3>
      </div>
      <table className="log-table">
        <thead>
          <tr>
            <th>案件編號</th>
            <th>來源檔案</th>
            <th>通報來源</th>
            <th>行政區</th>
            <th>故障類別</th>
            <th>施工內容（欄位R）</th>
            <th>備註（欄位V）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.caseNo}-${i}`}>
              <td>{r.caseNo}</td>
              <td>{r.sourceFile}</td>
              <td>{r.source}</td>
              <td>{r.district}</td>
              <td>{r.faultType}</td>
              <td>{r.content}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
