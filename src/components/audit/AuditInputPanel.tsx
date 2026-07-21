import { useEffect, useRef } from "react";
import type { AuditFileSet } from "../../lib/audit/collectAuditFiles";

interface Props {
  fileSet: AuditFileSet | null;
  onFolderSelected: (files: FileList) => void;
  onAnalyze: () => void;
  onExport: () => void;
  canExport: boolean;
  busy: boolean;
  showDetail: boolean;
  onShowDetailChange: (v: boolean) => void;
}

const SLOTS: { key: keyof AuditFileSet; label: string }[] = [
  { key: "streetlight", label: "控制器狀態 (Streetlight_*.csv，取最新)" },
  { key: "whitelist", label: "白名單 (智能燈清冊.xlsx)" },
  { key: "order", label: "開單紀錄 (Info_Order.csv)" },
  { key: "repair", label: "報修清單 (報修清單匯出.xlsx)" },
];

const HELP_ITEMS = [
  { name: "控制器狀態", rule: "Streetlight_YYYYMMDDHHMMSS.csv（若資料夾內有多份，自動取時間戳記最新的一份）" },
  { name: "白名單／清冊", rule: "智能燈清冊.xlsx（固定檔名）" },
  { name: "開單紀錄", rule: "Info_Order.csv（固定檔名）" },
  { name: "報修清單", rule: "報修清單匯出.xlsx（固定檔名）" },
];

export function AuditInputPanel({
  fileSet,
  onFolderSelected,
  onAnalyze,
  onExport,
  canExport,
  busy,
  showDetail,
  onShowDetailChange,
}: Props) {
  const dirInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dirInputRef.current?.setAttribute("webkitdirectory", "");
    dirInputRef.current?.setAttribute("directory", "");
  }, []);

  const allFound = !!fileSet && SLOTS.every((s) => fileSet[s.key]);

  return (
    <section className="panel input-panel">
      <div className="field-row">
        <label className="field-label">資料夾路徑</label>
        <div className="folder-picker">
          <span className="folder-display">
            {fileSet ? "已選取資料夾（預設 桌面/Report）" : "尚未選擇資料夾"}
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

      {fileSet ? (
        <div className="file-slot-list">
          {SLOTS.map((s) => {
            const file = fileSet[s.key] as File | null;
            return (
              <div key={s.key} className={`file-slot${file ? " found" : " missing"}`}>
                <span className="file-slot-dot" />
                <span className="file-slot-label">{s.label}</span>
                <span className="file-slot-name">
                  {file
                    ? file.name +
                      (s.key === "streetlight" && fileSet.streetlightCandidates > 1
                        ? `（共偵測到 ${fileSet.streetlightCandidates} 份，已取最新）`
                        : "")
                    : "未偵測到"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="input-help">
          <div className="input-help-title">選擇的資料夾內需包含以下 4 個檔案：</div>
          <ul className="input-help-list">
            {HELP_ITEMS.map((item) => (
              <li key={item.name}>
                <span className="input-help-name">{item.name}</span>
                <span className="input-help-rule">{item.rule}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="field-row actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAnalyze}
          disabled={busy || !allFound}
        >
          {busy ? "分析中..." : "開始分析"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onExport} disabled={!canExport}>
          匯出 Excel 稽核報告
        </button>
        <label className="toggle checkbox-inline">
          <input
            type="checkbox"
            checked={showDetail}
            onChange={(e) => onShowDetailChange(e.target.checked)}
          />
          顯示詳細數據清單
        </label>
      </div>
    </section>
  );
}
