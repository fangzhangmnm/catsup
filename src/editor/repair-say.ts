// editor/repair-say.ts —— 修复 / 擦线对人说的话（纯函数）。created 2026-11-13 by Claude Opus 5.5（从 editor.ts 原样搬出：本体的体重棘轮，一步全有或全无那一刀要的地方）

/** 提示行的「作用于」那半句（披露）。 */
export function scopeText(sc: { readonly mode: "selection" | "context"; readonly components: number; readonly copies: number; readonly locked: number }): string {
  const where = sc.mode === "selection" ? "选中的" : "整个物件";
  const parts = [sc.components ? `含 ${sc.components} 个组件、共 ${sc.copies} 份` : "", sc.locked ? `锁着的 ${sc.locked} 个跳过` : ""].filter(Boolean);
  return `作用于：${where}${parts.length ? `；${parts.join("；")}` : ""}`;
}
/** 擦线前问的那句话：要等多久、估计怎么来的（user 10-26「不要因为性能静默不做，宁愿弹警告问yes no」）。 */
export function eraseAskText(title: string, e: { edges: number; seconds: number; faces: number }): string {
  const t = e.seconds < 90 ? `${Math.round(e.seconds)} 秒` : `${(e.seconds / 60).toFixed(1)} 分钟`;
  return `${title}要擦掉 ${e.edges} 条面和面之间的线。内核现在每擦一次线都要把整个物件重新整理一遍（这里最大的物件有 ${e.faces} 张面），估计要 ${t} 左右，期间界面会卡住——按坦克 3.2 万面实测一次约 95 秒推算，只是量级。要做吗？`;
}
