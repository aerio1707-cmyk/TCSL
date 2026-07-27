import { useState } from "react";
import { CaseNumberCollisionTable } from "../components/repair/CaseNumberCollisionTable";
import { RepairCategoryPie, RepairCoreCategoryPie, RepairSourcePie } from "../components/repair/RepairCharts";
import { RepairInputPanel } from "../components/repair/RepairInputPanel";
import { UnclassifiedTable } from "../components/repair/UnclassifiedTable";
import {
  exportAppendixToExcel,
  exportCollisionsOnly,
  exportRepairToExcel,
  exportUnclassifiedOnly,
} from "../lib/repair/exportRepair";
import { parseRepairFiles } from "../lib/repair/parseRepair";
import type { RepairAnalysisResult } from "../lib/repair/types";

export function RepairAnalysisPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<RepairAnalysisResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showUnclassifiedDetail, setShowUnclassifiedDetail] = useState(false);
  const [showCollisionDetail, setShowCollisionDetail] = useState(false);

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const r = await parseRepairFiles(files);
      setResult(r);
      setShowUnclassifiedDetail(false);
      setShowCollisionDetail(false);
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
        fileNames={files.map((f) => f.name)}
        busy={busy}
        canExportUnclassified={!!result}
        canExportFull={!!result}
        canExportCollisions={!!result && result.caseNumberCollisions.length > 0}
        onFilesSelected={handleFilesSelected}
        onAnalyze={handleAnalyze}
        onExportUnclassified={() => result && exportUnclassifiedOnly(result)}
        onExportFull={() => result && exportRepairToExcel(result)}
        onExportAppendix={() => exportAppendixToExcel()}
        onExportCollisions={() => result && exportCollisionsOnly(result)}
      />

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {result && (
        <>
          {result.duplicateRowsRemoved > 0 && (
            <div className="alert alert-info">
              已自動排除 {result.duplicateRowsRemoved} 筆完全重複資料（案件編號與其餘所有欄位皆相同）。
            </div>
          )}

          {result.caseNumberCollisions.length > 0 && (
            <div className="alert alert-warning">
              發現 {result.caseNumberCollisions.length}{" "}
              筆案件編號重複但內容不同的資料！已全部保留計算，請於下方明細確認。
              <button
                type="button"
                className="btn btn-secondary btn-inline"
                onClick={() => setShowCollisionDetail((v) => !v)}
              >
                {showCollisionDetail ? "隱藏明細" : "顯示明細"}
              </button>
            </div>
          )}

          {result.unclassifiedRows.length > 0 && (
            <div className="alert alert-warning">
              發現 {result.unclassifiedRows.length} 筆未能自動歸類工單！請於下方明細確認，並視需要補充關鍵字規則庫。
              <button
                type="button"
                className="btn btn-secondary btn-inline"
                onClick={() => setShowUnclassifiedDetail((v) => !v)}
              >
                {showUnclassifiedDetail ? "隱藏明細" : "顯示明細"}
              </button>
            </div>
          )}

          <section className="panel chart-panel">
            <div className="chart-grid chart-grid-spaced">
              <RepairSourcePie summary={result.sourceSummary} />
              <RepairCategoryPie summaries={result.categorySummaries} />
              <RepairCoreCategoryPie summaries={result.categorySummaries} />
            </div>
          </section>

          {showCollisionDetail && result.caseNumberCollisions.length > 0 && (
            <CaseNumberCollisionTable rows={result.caseNumberCollisions} />
          )}

          {showUnclassifiedDetail && result.unclassifiedRows.length > 0 && (
            <UnclassifiedTable rows={result.unclassifiedRows} />
          )}
        </>
      )}
    </div>
  );
}
