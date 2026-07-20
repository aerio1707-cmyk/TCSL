// 單一控制器紀錄（來自某一天的報表）
export interface ControllerRecord {
  polesId: string;
  controllerId: string;
  sourceFile: string; // 相對路徑
  sourceSheet?: string; // xlsx 才有
}

// 掃描到的原始報表檔案（尚未解析內容，先做日期歸類與同日競爭）
export interface ReportFile {
  file: File;
  relativePath: string;
  date: string; // YYYY-MM-DD
  dateSource: "csv-tag" | "path" | "mtime";
  tieBreakKey: number; // 用於同日多檔案取捨，越大越優先
}

export type DayStatus = "initial" | "unchanged" | "changed" | "missing";

// 單一桿號、單一日期的分析結果（完整明細表的一列）
export interface DayEntry {
  date: string;
  polesId: string;
  controllerId: string | null; // null 表示查無資料
  status: DayStatus;
  prevControllerId?: string; // status === "changed" 時才有
  note: string; // 說明文字
  sourceFile?: string;
  sourceSheet?: string;
}

// 精簡日誌：把連續同狀態(且值相同)的日期壓成一個區間
export interface LogRange {
  status: DayStatus;
  startDate: string;
  endDate: string;
  controllerId: string | null;
  prevControllerId?: string;
  dayCount: number;
  note: string;
}

export interface PoleTimeline {
  polesId: string;
  entries: DayEntry[]; // 由舊到新
  ranges: LogRange[]; // 由新到舊，供畫面顯示
  changeCount: number;
  latestControllerId: string | null;
  latestDate: string | null;
}
