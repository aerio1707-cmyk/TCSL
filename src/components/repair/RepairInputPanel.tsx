import { useRef } from "react";

interface Props {
  fileNames: string[];
  busy: boolean;
  canExportUnclassified: boolean;
  canExportFull: boolean;
  canExportCollisions: boolean;
  onFilesSelected: (files: File[]) => void;
  onAnalyze: () => void;
  onExportUnclassified: () => void;
  onExportFull: () => void;
  onExportAppendix: () => void;
  onExportCollisions: () => void;
}

export function RepairInputPanel({
  fileNames,
  busy,
  canExportUnclassified,
  canExportFull,
  canExportCollisions,
  onFilesSelected,
  onAnalyze,
  onExportUnclassified,
  onExportFull,
  onExportAppendix,
  onExportCollisions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel input-panel">
      <div className="field-row">
        <label className="field-label">來源檔案</label>
        <div className="folder-picker">
          <span className="folder-display">
            {fileNames.length > 0 ? `已選取 ${fileNames.length} 個檔案：${fileNames.join("、")}` : "尚未選擇檔案"}
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            瀏覽...
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            hidden
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              if (files.length > 0) onFilesSelected(files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="input-help">
        <div className="input-help-title">使用說明</div>
        <ul className="input-help-list">
          <li>
            <span className="input-help-name">來源位置</span>
            <span className="input-help-rule">
              檔名為「維修案件匯出.xlsx」「維修案件匯出 (1).xlsx」「維修案件匯出 (2).xlsx」依此類推
            </span>
          </li>
          <li>
            <span className="input-help-name">多檔選取</span>
            <span className="input-help-rule">點擊「瀏覽...」可一次選取多個檔案一起分析，之後檔案數量增加也適用</span>
          </li>
          <li>
            <span className="input-help-name">自動去重</span>
            <span className="input-help-rule">
              案件編號與其餘所有欄位皆相同才視為同一筆重複匯出，會自動排除只保留一筆
            </span>
          </li>
          <li>
            <span className="input-help-name">案件編號撞號</span>
            <span className="input-help-rule">
              若案件編號相同但其餘內容不同，判定為兩筆不同案件，會全部保留計算，並列出警示清單供人工複查
            </span>
          </li>
        </ul>
      </div>

      <div className="field-row actions">
        <button type="button" className="btn btn-primary" onClick={onAnalyze} disabled={busy || fileNames.length === 0}>
          {busy ? "分析中..." : "開始分析"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExportUnclassified}
          disabled={!canExportUnclassified}
        >
          匯出未歸類工單清單.xlsx
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExportCollisions}
          disabled={!canExportCollisions}
        >
          匯出案件編號重複清單.xlsx
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExportFull} disabled={!canExportFull}>
          匯出完整分析報告.xlsx
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExportAppendix}>
          下載分類關鍵字對照表.xlsx
        </button>
      </div>
    </section>
  );
}
