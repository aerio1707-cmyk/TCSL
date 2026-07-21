export type AbnormalStatus = "控制器異常" | "燈具異常" | "複合異常";

export type AuditFlag = "func1_missing_order" | "func2_closed_not_recovered";

export interface AnalyzedRow {
  polesKey: string; // 正規化（去前導零）後的比對用鍵值
  polesId: string; // 原始/清理後字串，畫面顯示用
  controllerId: string;
  status: AbnormalStatus;
  lastReceiveTimeMs: number; // T_base
  lastReceiveTimeLabel: string;
  flags: AuditFlag[];
  func1MatchedOrderTime: string | null; // 有找到就記錄下來，方便明細呈現
  func2MatchedCaseTime: string | null;
}

export interface SuspendedRow {
  polesKey: string;
  polesId: string;
  controllerId: string;
  status: AbnormalStatus;
}

export interface AuditSummary {
  totalStreetlightRows: number;
  whitelistAbnormalCount: number; // 白名單內異常燈具數（含暫停停用）
  suspendedCount: number; // 暫停停用（last_receive_time 為空）
  analyzedCount: number; // 實際進入功能1/2判斷的筆數
  func1Count: number; // 應開單未開單
  func2Count: number; // 已結案仍異常
  func1Rate: number; // 0~1
  func2Rate: number; // 0~1
}

export interface AuditResult {
  summary: AuditSummary;
  analyzedRows: AnalyzedRow[]; // 全部已分析列（含正常與異常）
  suspendedRows: SuspendedRow[];
  sourceFileNames: {
    streetlight: string;
    whitelist: string;
    order: string;
    repair: string;
  };
}
