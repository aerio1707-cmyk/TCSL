import { useMemo, useState } from "react";
import { AuditFunc1Pie, AuditStatusBarChart } from "../components/audit/AuditCharts";
import { AuditInputPanel } from "../components/audit/AuditInputPanel";
import { DetailTables } from "../components/audit/DetailTables";
import { KpiDashboard } from "../components/audit/KpiDashboard";
import { collectAuditFiles, type AuditFileSet } from "../lib/audit/collectAuditFiles";
import { runAudit } from "../lib/audit/auditEngine";
import { exportAuditToExcel } from "../lib/audit/exportAudit";
import type { AuditResult } from "../lib/audit/types";

export function FaultAuditorPage() {
  const [fileSet, setFileSet] = useState<AuditFileSet | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFolderSelected = (files: FileList) => {
    const collected = collectAuditFiles(files);
    setFileSet(collected);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!fileSet) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const auditResult = await runAudit(fileSet);
      setResult(auditResult);
    } catch (err) {
      console.error(err);
      setErrorMsg("分析過程發生錯誤，請確認資料夾內容是否符合預期格式。");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    exportAuditToExcel(result);
  };

  const func1Rows = useMemo(
    () => (result ? result.analyzedRows.filter((r) => r.flags.includes("func1_missing_order")) : []),
    [result]
  );
  const func2Rows = useMemo(
    () => (result ? result.analyzedRows.filter((r) => r.flags.includes("func2_closed_not_recovered")) : []),
    [result]
  );
  return (
    <div className="page-shell">
      <AuditInputPanel
        fileSet={fileSet}
        onFolderSelected={handleFolderSelected}
        onAnalyze={handleAnalyze}
        onExport={handleExport}
        canExport={!!result}
        busy={busy}
        showDetail={showDetail}
        onShowDetailChange={setShowDetail}
      />

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {result && (
        <>
          <KpiDashboard summary={result.summary} />

          <section className="panel chart-panel">
            <div className="chart-grid">
              <AuditStatusBarChart counts={result.summary.abnormalByStatus} />
              <AuditFunc1Pie
                totalAbnormalCount={result.summary.totalAbnormalCount}
                func1Count={result.summary.func1Count}
              />
            </div>
          </section>

          {showDetail && (
            <DetailTables func1Rows={func1Rows} func2Rows={func2Rows} suspendedRows={result.suspendedRows} />
          )}
        </>
      )}
    </div>
  );
}
