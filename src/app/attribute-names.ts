// app/attribute-names.ts —— 物体窗口「元素」页的显示名（属性地基轮第 3½ 步；统筹 11-13 深夜裁定，规程第九½节末）。created 2026-11-13 by Claude Opus 5.5
// 网格体：保留名 → 中文，行上另带小灰字原名（这一页的用意 = 让人看见物体是一本「名字 → 数组」的字典，名字就是键）；文件里带来的不认识的列 = 原样显示它的名字。
// 硬表面体：layers.ts 的层名 → 中文，不带原名（那套还没搬上属性表，没有这个键，写上去是假的）。
// 同一个意思同一个名字（不要让人学两套叫法）：两边都用的显示名只许是 SYNONYMS 里登记过的那几对（守卫 test/attribute-names.test.ts）。
// 叫法沿用界面上已经有的词：手标菜单「标成棱 / 标成平滑」、「接缝」、硬表面的「软边橡皮」「折缝：软边」、「隐藏」、「材质」。有两面的材质写「材质（正面）」「材质（背面）」。

import { UV_AT_COL, UV_SET_COL } from "../scene/uv.ts";

/** 网格体的列（保留名 + 贴图坐标那两列；那两列的名字只在 scene/uv.ts 写，守卫 paint-start-guard）→ 显示名。 */
export const MESH_NAMES: Readonly<Record<string, string>> = {
  sharp_edge: "棱", smooth: "平滑", soft: "软边", uv_seam: "接缝", hide_edge: "隐藏",
  hide_poly: "隐藏", material_index: "材质",
  [UV_SET_COL.id]: "画布代号", [UV_AT_COL.id]: "贴图坐标",
};
/** 硬表面体的层（挂在哪 + 层名）→ 显示名。 */
export const BREP_NAMES: Readonly<Record<string, string>> = {
  "edge:soft": "软边", "edge:smooth": "平滑", "edge:hidden": "隐藏", "edge:curve": "曲线", "edge:fold": "折线",
  "face:material": "材质（正面）", "face:materialBack": "材质（背面）", "face:hidden": "隐藏",
};
/** 两边意思相同、用同一个显示名的（网格体的列名 ↔ 硬表面的「挂在哪:层名」）。 */
export const SYNONYMS: readonly { readonly label: string; readonly mesh: readonly string[]; readonly brep: readonly string[] }[] = [
  { label: "平滑", mesh: ["smooth"], brep: ["edge:smooth"] },
  { label: "软边", mesh: ["soft"], brep: ["edge:soft"] },
  { label: "隐藏", mesh: ["hide_edge", "hide_poly"], brep: ["edge:hidden", "face:hidden"] },
];

/** 网格体一列的显示：中文名 + 原名（小灰字）；不认识的 = 原样的名字、不另带原名。 */
export function meshAttrName(id: string): { label: string; code: string | null } {
  const zh = MESH_NAMES[id];
  return zh ? { label: zh, code: id } : { label: id, code: null };
}
/** 硬表面一层的显示：中文名，不带原名；不认识的层 = 原样的名字。 */
export function brepAttrName(on: "edge" | "face", id: string): string { return BREP_NAMES[`${on}:${id}`] ?? id; }
/** 类型的说法：布尔 = 是 / 否，整数 = 整数，每个几个小数（columns.ts typeName：bool / int / floats:n）。 */
export function typeSay(type: string): string {
  if (type === "bool") return "是 / 否";
  if (type === "int") return "整数";
  const m = /^floats:(\d+)$/.exec(type);
  return m ? `${m[1]} 个小数` : type;
}
/** 大小：B / KB / MB。 */
export function bytesSay(n: number): string {
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}
