import { useEffect, useRef } from "react";

interface Props {
  folderLabel: string | null;
  fileCount: number;
  poleIdsInput: string;
  onPoleIdsChange: (v: string) => void;
  onFolderSelected: (files: FileList) => void;
  onAnalyze: () => void;
  onExport: () => void;
  canExport: boolean;
  busy: boolean;
}

export function InputPanel({
  folderLabel,
  fileCount,
  poleIdsInput,
  onPoleIdsChange,
  onFolderSelected,
  onAnalyze,
  onExport,
  canExport,
  busy,
}: Props) {
  const dirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dirInputRef.current?.setAttribute("webkitdirectory", "");
    dirInputRef.current?.setAttribute("directory", "");
  }, []);

  return (
    <section className="panel input-panel">
      <div className="field-row">
        <label className="field-label">資料夾路徑</label>
        <div className="folder-picker">
          <span className="folder-display">
            {folderLabel ? `${folderLabel}（共 ${fileCount} 份報表檔案）` : "尚未選擇資料夾"}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => dirInputRef.current?.click()}
          >
            瀏覽...
          </button>
          <input
            ref={dirInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onFolderSelected(e.target.files);
              }
            }}
          />
        </div>
      </div>

      <div className="field-row">
        <label className="field-label" htmlFor="poleIds">
          查詢桿號 (poles_id)
        </label>
        <input
          id="poleIds"
          type="text"
          className="text-input"
          placeholder="例如：0200090, 1023336"
          value={poleIdsInput}
          onChange={(e) => onPoleIdsChange(e.target.value)}
        />
      </div>

      <div className="field-row actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={busy || fileCount === 0 || poleIdsInput.trim() === ""}
        >
          {busy ? "分析中..." : "開始分析"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExport} disabled={!canExport}>
          匯出 Excel 報表
        </button>
      </div>
    </section>
  );
}
