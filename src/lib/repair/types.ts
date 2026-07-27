export type RepairCategory = "燈具" | "電源" | "網路訊號" | "智控器" | "台電" | "正常" | "其他";

export interface RepairCaseRow {
  caseNo: string;
  source: string; // 欄位 K：通報來源
  content: string; // 欄位 R：施工內容
  note: string; // 欄位 V：備註
  district: string; // 欄位：行政區（供案件編號撞號時人工判斷用）
  faultType: string; // 欄位：故障類別（同上）
  sourceFile: string; // 這筆資料來自哪個來源檔案
  inScope: boolean; // 通報來源是否為 承商自主通報／自主API
  category: RepairCategory | null; // inScope 為 false 時不分類，維持 null
}

export interface SourceSummary {
  totalCount: number;
  inScopeCount: number; // 承商自主通報 + 自主API
  otherSourceCount: number; // 其餘通報來源
}

export interface CategorySummary {
  category: RepairCategory;
  count: number;
  ratio: number; // 佔 inScopeCount 的比例（0~1）
}

export interface RepairAnalysisResult {
  sourceFileNames: string[];
  duplicateRowsRemoved: number; // 案件編號＋其餘所有欄位皆相同，判定為同一筆重複匯出而排除的筆數
  caseNumberCollisions: RepairCaseRow[]; // 案件編號相同但其餘內容不同（皆保留計算，僅列出供人工複查）
  sourceSummary: SourceSummary;
  categorySummaries: CategorySummary[]; // 依 a~g 固定順序排列
  unclassifiedRows: RepairCaseRow[]; // category === "其他"
  allInScopeRows: RepairCaseRow[];
}
