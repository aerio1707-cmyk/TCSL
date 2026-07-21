import { useRef } from "react";

interface Props {
  fileName: string | null;
  busy: boolean;
  canExportUnclassified: boolean;
  canExportFull: boolean;
  onFileSelected: (file: File) => void;
  onAnalyze: () => void;
  onExportUnclassified: () => void;
  onExportFull: () => void;
}

export function RepairInputPanel({
  fileName,
  busy,
  canExportUnclassified,
  canExportFull,
  onFileSelected,
  onAnalyze,
  onExportUnclassified,
  onExportFull,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel input-panel">
      <div className="field-row">
        <label className="field-label">來源檔案</label>
        <div className="folder-picker">
          <span className="folder-display">{fileName ?? "尚未選擇檔案（固定檔名：維修案件匯出.xlsx）"}</span>
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            瀏覽...
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="field-row actions">
        <button type="button" className="btn btn-primary" onClick={onAnalyze} disabled={busy || !fileName}>
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
        <button type="button" className="btn btn-secondary" onClick={onExportFull} disabled={!canExportFull}>
          匯出完整分析報告.xlsx
        </button>
      </div>
    </section>
  );
}
