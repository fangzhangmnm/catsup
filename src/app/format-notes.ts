// app/format-notes.ts —— 打开一份文件时要说的话（读取侧三级拍子 + 素材架的两种情况；家族纪律：minor 更新提示一次、patch 静默）。纯函数（node 直测）。
// created 2026-11-04 by Claude Opus 5.5（从 session.noteFormat 搬出来，好直测；身份地基 ID-3 计划书 §15.1-F 加了素材架两句）。一条一个通知（通知是堆叠的，互相盖不掉）。
import { fmtStamp, type FormatReadNotes, type UvDropWhy } from "../format/migrate/index.ts";

export function formatNotesSay(n: FormatReadNotes): string[] {
  const out: string[] = [];
  if (n.newerMinor.length) out.push(`这份文件是更新版的 CatsUp 写的（${n.newerMinor.map((x) => `${x.ext.replace("CATSUP_", "")} ${fmtStamp(x.file)}，本版 ${fmtStamp(x.mine)}`).join("；")}）：能开能存，它多出来的内容会原样带回`);
  if (n.deskTooNew) out.push(`这份文件的界面记录（desk ${fmtStamp(n.deskTooNew)}）比本版新：按默认显示，保存时原样带回`);
  if (n.shelfTooNew) out.push(`这份文件的素材架是更新版写的（shelf ${fmtStamp(n.shelfTooNew)}）：本版读不出架上有什么、也不能改，保存时原样带回；为了不删到架上的东西，这份文件里先不能清理没人用的组件和材质`);
  if (n.danglingShelfRefs) out.push(`素材架上有 ${n.danglingShelfRefs} 格指向的东西已经不在文件里，这次打开丢掉了（保存后就没了）`);
  if (n.remintedGuids) out.push(`这份文件里有 ${n.remintedGuids} 条身份重复或不合法（可能被手改过），这次打开换了新身份；保存后就固定了`);
  // 画这一层（贴图主线 1-2½；契约第五节：贴图坐标是模型的附属数据，坏了模型照开、坏的部分按没有处理、打开后说出来）
  if (n.uvDropped?.length) {
    const byDef = new Map<string, string[]>();
    for (const x of n.uvDropped) {
      const set = x.uvSet ? `「${x.uvSet.name || x.uvSet.guid.slice(0, 8)}」` : "";
      const what = x.faces ? `贴图坐标${set}上有 ${x.faces} 张面${UV_WHY[x.why]}，这些面在这一套上按没有位置处理` : `有一套贴图坐标${set}${UV_WHY[x.why]}，整套不认`;
      const k = x.def.name || x.def.guid; byDef.set(k, [...(byDef.get(k) ?? []), what]);
    }
    for (const [d, items] of byDef) out.push(`「${d}」的贴图坐标有坏的地方（模型本身一点没少）：${items.join("；")}。再存盘会把这些坏的部分去掉`);
  }
  if (n.foreignPaintSlots) out.push(`有 ${n.foreignPaintSlots} 处别的物件用了只属于某一个物件的画，这次打开那几处当没有材质；再存盘会去掉这些引用`);
  if (n.orphanPaintTextures) out.push(`有 ${n.orphanPaintTextures} 张画找不到它铺的那一套贴图坐标，先留着当没人用的（资源页能清）`);
  for (const x of n.paintUnplaced ?? []) out.push(`「${x.def.name || x.def.guid}」有 ${x.faces} 张画了的面在贴图坐标「${x.uvSet.name || x.uvSet.guid.slice(0, 8)}」上没有位置，先按材质的底色显示`);
  return out;
}
/** 贴图坐标坏在哪（formatNotesSay 用；接在「整套」或「N 张面」后面）。 */
const UV_WHY: Record<UvDropWhy, string> = {
  "not-a-list": "（整份贴图坐标的格式不对）", "not-an-object": "（格式不对）", "bad-guid": "（身份号缺了或不对）", "bad-size": "（画布的宽高不是正整数）",
  "bad-density": "（密度不是正数）", "no-loopUv": "（角上的数找不到）", "bad-length": "（角上的数个数和模型对不上）", "duplicate-guid": "（和同一个物件的另一套用了同一个身份号）",
  "partial-corners": "的角一半有坐标一半没有", "non-finite-corners": "的角坐标不是有限的数", "off-canvas-corners": "的角落在画布外面",
};
