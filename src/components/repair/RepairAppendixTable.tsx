import { CATEGORY_RULES } from "../../lib/repair/classify";

const CODES = ["a", "b", "c", "d", "e", "f"];

// 圖表3：分析類別項目對照表（附錄）—— 直接讀 classify.ts 的規則字典，兩者保證同步
export function RepairAppendixTable() {
  return (
    <section className="panel">
      <h2>分析類別項目對照表（附錄）</h2>
      <div className="pivot-table-wrap">
        <table className="log-table appendix-table">
          <thead>
            <tr>
              <th>類別代碼</th>
              <th>分類名稱</th>
              <th>欄位R(施工內容)包含關鍵字</th>
              <th>欄位V(備註)包含關鍵字</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_RULES.map((rule, i) => (
              <tr key={rule.category}>
                <td>{CODES[i]}</td>
                <td>{rule.category}</td>
                <td>{rule.contentKeywords.join("、")}</td>
                <td>{rule.noteKeywords.join("、") || "（無）"}</td>
              </tr>
            ))}
            <tr>
              <td>g</td>
              <td>其他</td>
              <td colSpan={2}>未滿足上述 a~f 任一條件者，自動歸類並列入待補齊提示清單</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
