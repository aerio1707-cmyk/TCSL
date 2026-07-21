import { useMemo, useState } from "react";
import { InputPanel } from "../components/InputPanel";
import { PoleList } from "../components/PoleList";
import { SummaryCard } from "../components/SummaryCard";
import { TimelinePanel } from "../components/TimelinePanel";
import { collectReportFiles, pickWinnersByDate } from "../lib/collectFiles";
import { parsePoleIdsInput } from "../lib/clean";
import { buildTimelines } from "../lib/timeline";
import { exportTimelinesToExcel } from "../lib/exportExcel";
import type { PoleTimeline } from "../lib/types";

export function ControllerTrackerPage() {
  const [fileList, setFileList] = useState<FileList | null>(null);
  const [folderLabel, setFolderLabel] = useState<string | null>(null);
  const [reportFileCount, setReportFileCount] = useState(0);
  const [poleIdsInput, setPoleIdsInput] = useState("");
  const [timelines, setTimelines] = useState<Map<string, PoleTimeline> | null>(null);
  const [selectedPoleId, setSelectedPoleId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanInfo, setScanInfo] = useState<string | null>(null);

  const handleFolderSelected = (files: FileList) => {
    setFileList(files);
    const first = files[0] as File & { webkitRelativePath?: string };
    const rootName = first.webkitRelativePath?.split("/")[0] ?? "已選取資料夾";
    setFolderLabel(rootName);
    const reportCount = Array.from(files).filter((f) => /\.(csv|xlsx)$/i.test(f.name)).length;
    setReportFileCount(reportCount);
    setTimelines(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!fileList) return;
    const poleIds = parsePoleIdsInput(poleIdsInput);
    if (poleIds.length === 0) return;

    setBusy(true);
    setErrorMsg(null);
    try {
      const reportFiles = await collectReportFiles(fileList);
      if (reportFiles.length === 0) {
        setErrorMsg("在此資料夾中找不到任何 .xlsx 或 .csv 報表檔案。");
        setTimelines(null);
        return;
      }
      const winners = pickWinnersByDate(reportFiles);
      const result = await buildTimelines(winners, poleIds);
      setTimelines(result);
      setSelectedPoleId(poleIds[0]);

      const dates = [...winners.keys()].sort();
      setScanInfo(
        `掃描到 ${reportFiles.length} 份報表檔案，共 ${winners.size} 個日期（${dates[0]} ~ ${
          dates[dates.length - 1]
        }）`
      );
    } catch (err) {
      console.error(err);
      setErrorMsg("分析過程發生錯誤，請確認資料夾內容是否符合預期格式。");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    if (!timelines) return;
    exportTimelinesToExcel([...timelines.values()]);
  };

  const timelineList = useMemo(() => (timelines ? [...timelines.values()] : []), [timelines]);
  const selectedTimeline = timelines && selectedPoleId ? timelines.get(selectedPoleId) : null;

  return (
    <div className="page-shell">
      <InputPanel
        folderLabel={folderLabel}
        fileCount={reportFileCount}
        poleIdsInput={poleIdsInput}
        onPoleIdsChange={setPoleIdsInput}
        onFolderSelected={handleFolderSelected}
        onAnalyze={handleAnalyze}
        onExport={handleExport}
        canExport={!!timelines}
        busy={busy}
      />

      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}
      {scanInfo && !errorMsg && <div className="scan-info">{scanInfo}</div>}

      {timelineList.length > 0 && (
        <div className="results-layout">
          <PoleList timelines={timelineList} selectedPoleId={selectedPoleId} onSelect={setSelectedPoleId} />
          <div className="results-main">
            {selectedTimeline && (
              <>
                <SummaryCard timeline={selectedTimeline} />
                <TimelinePanel timeline={selectedTimeline} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
