import type { RepairCaseRow } from "../../lib/repair/types";

export function UnclassifiedTable({ rows }: { rows: RepairCaseRow[] }) {
  return (
    <section className="panel">
      <div className="timeline-header">
        <h3>未歸類工單明細（{rows.length} 筆）</h3>
      </div>
      <table className="log-table">
        <thead>
          <tr>
            <th>案件編號</th>
            <th>施工內容（欄位R）</th>
            <th>備註（欄位V）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.caseNo}>
              <td>{r.caseNo}</td>
              <td>{r.content}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
