import { useState } from "react";
import { RepairAppendixTable } from "../components/repair/RepairAppendixTable";
import { RepairCategoryChart, RepairSourcePie } from "../components/repair/RepairCharts";
import { RepairInputPanel } from "../components/repair/RepairInputPanel";
import { UnclassifiedTable } from "../components/repair/UnclassifiedTable";
import { exportRepairToExcel, exportUnclassifiedOnly } from "../lib/repair/exportRepair";
import { parseRepairFile } from "../lib/repair/parseRepair";
import type { RepairAnalysisResult } from "../lib/repair/types";

export function RepairAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RepairAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const handleFileSelected = (f: File) => {
    setFile(f);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = await parseRepairFile(file);
      setResult(r);
      setShowDetail(false);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "分析過程發生錯誤，請確認檔案格式是否正確。");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <RepairInputPanel
        fileName={file?.name ?? null}
        busy={busy}
        canExportUnclassified={!!result}
        canExportFull={!!result}
        onFileSelected={handleFileSelected}
        onAnalyze={handleAnalyze}
        onExportUnclassified={() => result && exportUnclassifiedOnly(result)}
        onExportFull={() => result && exportRepairToExcel(result)}
      />

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {result && (
        <>
          {result.unclassifiedRows.length > 0 && (
            <div className="alert alert-warning">
              發現 {result.unclassifiedRows.length} 筆未能自動歸類工單！請於下方明細確認，並視需要補充關鍵字規則庫。
              <button type="button" className="btn btn-secondary btn-inline" onClick={() => setShowDetail((v) => !v)}>
                {showDetail ? "隱藏明細" : "顯示明細"}
              </button>
            </div>
          )}

          <section className="panel chart-panel">
            <h2>通報來源結構占比</h2>
            <div className="chart-grid">
              <RepairSourcePie summary={result.sourceSummary} />
            </div>
          </section>

          <RepairCategoryChart summaries={result.categorySummaries} />

          {showDetail && result.unclassifiedRows.length > 0 && (
            <UnclassifiedTable rows={result.unclassifiedRows} />
          )}

          <RepairAppendixTable />
        </>
      )}
    </div>
  );
}
