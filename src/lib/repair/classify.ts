import type { RepairCategory } from "./types";

export const IN_SCOPE_SOURCES = ["承商自主通報", "自主API"];

interface CategoryRule {
  category: RepairCategory;
  contentKeywords: string[]; // 欄位 R（施工內容）
  noteKeywords: string[]; // 欄位 V（備註）
}

// 按優先順序檢查，任一關鍵字命中（OR 判斷邏輯）即歸類；全部未命中歸為「其他」。
// 這份關鍵字字典也是圖表 3 附錄「分析類別項目對照表」的資料來源，兩者需保持同步。
export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "燈具",
    contentKeywords: ["更換燈具", "換燈具", "換燈泡", "LED燈具", "LED燈泡", "智能燈"],
    noteKeywords: ["更換燈具", "燈線", "智能燈"],
  },
  {
    category: "電源",
    contentKeywords: [
      "拉線", "線路整修", "線斷", "線路+挖斷", "線路重整", "點滅器", "復歸", "斷線",
      "開關跳脫", "線路檢修", "外線重整", "更換材料", "開關箱", "短路", "安定器",
      "更換開關", "更換A架", "防水開關", "突波器", "更換燈管", "基座桶", "鎖固",
      "立桿", "螺絲", "施工+挖斷", "地下線", "架空線", "拉電線",
      "基礎座", "架空", "漏電", "線路查修", "外線", "無熔絲開關", "引線", "鐵桿", "水泥桿",
      "安裝新燈桿", "燈桿扶正",
    ],
    noteKeywords: ["電線", "燈具異常"],
  },
  {
    category: "網路訊號",
    contentKeywords: ["網路", "訊號", "天線", "SIM卡", "網關", "通訊"],
    noteKeywords: ["訊號弱", "斷線"],
  },
  {
    category: "智控器",
    contentKeywords: ["智控器", "更換智能控制器", "更換智控", "智控器離線"],
    noteKeywords: ["智控"],
  },
  {
    category: "台電",
    contentKeywords: ["台電", "停電"],
    noteKeywords: ["台電欠相", "台電停電"],
  },
  {
    category: "正常",
    contentKeywords: [
      "正常", "放亮", "非維護路燈", "非維護範圍", "安排換裝", "非納管", "私燈",
      "調整角度", "無安全疑慮", "拉高固定", "燈桿已換新", "燈桿換新", "換點",
      "採光罩", "調整照射角度", "燈具轉向", "轉向", "通報有誤", "燈桿載離",
      "重新立桿", "昨日已維修完畢", "周邊收拾", "非路燈設備", "無危險疑慮",
      "補孔蓋", "私設", "新設路燈", "無法入內", "設有門禁", "燈具歪斜", "遮光罩",
      "歪斜扶正", "調整燈頭", "安裝後遮", "車禍", "無異常", "補蓋板", "蓋回", "無問題",
    ],
    noteKeywords: ["車禍"],
  },
];

export const CATEGORY_ORDER: RepairCategory[] = [...CATEGORY_RULES.map((r) => r.category), "其他"];

export function classify(content: string, note: string): RepairCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.contentKeywords.some((kw) => content.includes(kw))) return rule.category;
    if (rule.noteKeywords.some((kw) => note.includes(kw))) return rule.category;
  }
  return "其他";
}
