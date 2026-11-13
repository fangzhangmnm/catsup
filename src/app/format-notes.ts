// app/format-notes.ts —— 打开一份文件时要说的话（读取侧三级拍子 + 素材架的两种情况；家族纪律：minor 更新提示一次、patch 静默）。纯函数（node 直测）。
// created 2026-11-04 by Claude Opus 5.5（从 session.noteFormat 搬出来，好直测；身份地基 ID-3 计划书 §15.1-F 加了素材架两句）。一条一个通知（通知是堆叠的，互相盖不掉）。
// 2026-11-11（贴图主线 1-2½，统筹审过时定的）：改成一张表 READ_NOTE_SAY，读入时记下的每一种（FormatReadNotes 的每一个键）都有一行。理由：记了不说等于没记，这类键以后还会加，
//   靠人记得补一句话靠不住。类型上每个键必须有一行（少了编译不过）；守卫 test/format-notes-guard.test.ts 读源码比对接口的键、每个键造一份样本看它真说出话来（少了 / 不说 = 红）。
//   唯一故意不说的是 newerPatch（家族纪律：patch 可无脑降，静默），在 SILENT_NOTES 里写明。
import { fmtStamp, type FormatReadNotes, type UvDropWhy, type UvRowWhy } from "../format/migrate/index.ts";

type Say<K extends keyof FormatReadNotes> = (v: NonNullable<FormatReadNotes[K]>) => string[];
/** 读入时记下的每一种 → 打开之后说的话（空 = 这一次没什么要说）。键的先后 = 说的先后。 */
export const READ_NOTE_SAY: { readonly [K in keyof Required<FormatReadNotes>]: Say<K> } = {
  newerMinor: (v) => (v.length ? [`这份文件是更新版的 CatsUp 写的（${v.map((x) => `${x.ext.replace("CATSUP_", "")} ${fmtStamp(x.file)}，本版 ${fmtStamp(x.mine)}`).join("；")}）：能开能存，它多出来的内容会原样带回`] : []),
  newerPatch: () => [],   // 静默：家族纪律 patch 可无脑降（user 2026-10-21「三级语义 同意」）；SILENT_NOTES 里登记了
  deskTooNew: (v) => [`这份文件的界面记录（desk ${fmtStamp(v)}）比本版新：按默认显示，保存时原样带回`],
  referencesTooNew: (v) => [`这份文件的参考图是更新版的 CatsUp 写的（references ${fmtStamp(v)}）：本版先不显示参考窗，保存时原样带回`],
  shelfTooNew: (v) => [`这份文件的素材架是更新版写的（shelf ${fmtStamp(v)}）：本版读不出架上有什么、也不能改，保存时原样带回；为了不删到架上的东西，这份文件里先不能清理没人用的组件和材质`],
  danglingShelfRefs: (v) => [`素材架上有 ${v} 格指向的东西已经不在文件里，这次打开丢掉了（保存后就没了）`],
  remintedGuids: (v) => [`这份文件里有 ${v} 条身份重复或不合法（可能被手改过），这次打开换了新身份；保存后就固定了`],
  builtinFrontSlots: (v) => [`这份文件里有 ${v} 格默认材质的写法不标准（可能被手改过），已经按默认材质读进来；保存后就是标准写法`],
  // 存盘忠实度清点 R1、R2（统筹 11-12：读的时候悄悄修的要记一笔、打开时说一次）
  danglingMaterialSlots: (v) => [`这份文件里有 ${v} 格材质指着的材质不在文件里（可能被手改过或坏了），这次打开那几格按默认材质显示；再存盘会去掉这些引用`],
  danglingParents: (v) => [`这份文件里有 ${v} 个组 / 组件的上一层指着不在文件里的组（可能被手改过或坏了），这次打开把它们放在了所在那一层的最外面；再存盘就按现在的位置存`],
  // 贴图表（贴图主线 1-0½；1-2½ 审过时补上说的话）
  texturesTooNew: (v) => [`这份文件的贴图表是更新版的 CatsUp 写的（textures ${fmtStamp(v)}）：本版读不懂，用到贴图的材质先按底色显示，保存时原样带回；这份文件里先不能加贴图、清理贴图、开始画（用更新版打开再改）`],
  danglingTextureRefs: (v) => [`有 ${v} 处材质指着的贴图不在文件里，这次打开那几处当空的（按材质的底色显示）；再存盘会去掉这些引用`],
  unknownTextureKinds: (v) => [`有 ${v} 张贴图是更新版的 CatsUp 才认识的种类：先显示成灰色占位，保存时原样带回`],
  // 画这一层（贴图主线 1-2½；契约第五节：贴图坐标是模型的附属数据，坏了模型照开、坏的部分按没有处理、打开后说出来）
  uvDropped: (v) => {
    const byDef = new Map<string, string[]>();
    for (const x of v) {
      const set = x.uvSet ? `「${x.uvSet.name || x.uvSet.guid.slice(0, 8)}」` : "";
      const what = x.faces ? `贴图坐标${set}上有 ${x.faces} 张面${UV_WHY[x.why]}，这些面在这一套上按没有位置处理` : x.uvSet ? `有一套贴图坐标${set}${UV_WHY[x.why]}，整套不认` : `有一段贴图坐标${UV_WHY[x.why]}，这一段不认`;
      const k = x.def.name || x.def.guid; byDef.set(k, [...(byDef.get(k) ?? []), what]);
    }
    return [...byDef].map(([d, items]) => `「${d}」的贴图坐标有坏的地方（模型本身一点没少）：${items.join("；")}。再存盘会把这些坏的部分去掉`);
  },
  paintUnplaced: (v) => v.map((x) => `「${x.def.name || x.def.guid}」有 ${x.faces} 张画了的面在贴图坐标「${x.uvSet.name || x.uvSet.guid.slice(0, 8)}」上没有位置，先按材质的底色显示`),
  uvSetRowsDropped: (v) => (v.length ? [`排法表里有 ${v.length} 行这一版读不了（${[...new Set(v.map((x) => UV_ROW_WHY[x.why]))].join("、")}），那几套按没有处理：挂在上面的画按底色显示；再存盘会去掉这几行`] : []),
  oldPaintFormat: (v) => [`这份文件里有 ${v} 张旧存法的画，这一版读不了，按底色显示`],
  oldUvColumns: (v) => [`有 ${v} 个物件上记着画在面上的位置（旧存法），这一版读不了；保存之后不再保留`],
  orphanPaintTextures: (v) => [`有 ${v} 张画找不到它铺的那一套贴图坐标，先留着当没人用的（资源页能清）`],
  // 属性地基轮 3c（统筹 11-13，规程第九½节末）：面 / 边那两个字节里这一版不认识的位 = 不拒开，不读、说一句、不写
  unknownMarks: (v) => (v.faces || v.edges ? [`有${unknownMarksText(v)}，没读进来；保存之后不再保留`] : []),
};
/**
 * 「N 张面、M 条边带着这一版不认识的标记」——打开和导入素材两处共用（导入那句在 shelf-actions.ts）。只说事实：不猜是谁写的
 * （可能是更新版的 CatsUp、别的软件，也可能是文件坏了；统筹 11-13）。
 */
export function unknownMarksText(v: { faces: number; edges: number }): string {
  const parts = [v.faces ? `${v.faces} 张面` : "", v.edges ? `${v.edges} 条边` : ""].filter(Boolean).join("、");
  return ` ${parts}带着这一版不认识的标记`;
}
/** 故意不说的键（每一个写明为什么）。守卫只放过这几个「有值也不说」。 */
export const SILENT_NOTES: Readonly<Partial<Record<keyof FormatReadNotes, string>>> = { newerPatch: "家族纪律：patch 比本版新 = 可无脑降，静默" };

/**
 * 读入时记下的每一种：再存盘会不会把东西去掉（贴图主线 1-8b，统筹 11-11 定）。true = 会丢 → 第一次存盘之前要用户明着点一次头，在那之前自动保存不写这份文件。
 * 每个键都要表态（类型上少一个编译不过；守卫 test/format-notes-guard.test.ts 钉住哪几个是 true）。
 */
export const LOSSY_NOTES: { readonly [K in keyof Required<FormatReadNotes>]: boolean } = {
  newerMinor: false, newerPatch: false, deskTooNew: false, referencesTooNew: false, shelfTooNew: false,
  danglingShelfRefs: true,       // 「保存后就没了」
  remintedGuids: false, builtinFrontSlots: false, texturesTooNew: false,
  danglingMaterialSlots: true,   // 「再存盘会去掉这些引用」
  danglingParents: true,         // 原来写的上一层存回去就没了
  danglingTextureRefs: true,     // 「再存盘会去掉这些引用」
  unknownTextureKinds: false,
  uvDropped: true,               // 「再存盘会把这些坏的部分去掉」
  paintUnplaced: false,
  uvSetRowsDropped: true,        // 「再存盘会去掉这几行」
  oldPaintFormat: false,         // 贴图行原样带回，存了不丢
  oldUvColumns: true,            // 「保存之后不再保留」（施工单十八第五节；统筹 11-13 定的字的意思：要有保存的后果）
  orphanPaintTextures: false,
  unknownMarks: true,            // 「保存之后不再保留」（统筹 11-13：不读、说一句、不写）
};
/** 这次读入记下的、会丢东西的那几种说的话（没有 = 空）。 */
export function lossySay(n: FormatReadNotes | undefined): string[] {
  if (!n) return [];
  const out: string[] = [];
  for (const k of Object.keys(LOSSY_NOTES) as (keyof FormatReadNotes)[]) {
    const v = n[k];
    if (!LOSSY_NOTES[k] || v === undefined || v === null || (Array.isArray(v) && !v.length) || v === 0) continue;
    out.push(...(READ_NOTE_SAY[k] as (x: unknown) => string[])(v));
  }
  return out;
}
export function formatNotesSay(n: FormatReadNotes): string[] {
  const out: string[] = [];
  for (const k of Object.keys(READ_NOTE_SAY) as (keyof FormatReadNotes)[]) {
    const v = n[k];
    if (v === undefined || v === null) continue;
    out.push(...(READ_NOTE_SAY[k] as (x: unknown) => string[])(v));
  }
  return out;
}
/** 贴图坐标坏在哪（uvDropped 用；接在「整套」或「N 张面」后面）。 */
const UV_WHY: Record<UvDropWhy, string> = {
  "not-a-list": "（整份角上的列的格式不对）", "not-an-object": "（格式不对）", "bad-guid": "（身份号缺了或不对）", "bad-kind": "（种类或每角几个数不对）",
  "no-data": "（角上的数找不到）", "bad-length": "（角上的数个数和模型对不上）", "duplicate-guid": "（和同一个物件的另一列用了同一个身份号）", "no-row": "（排法表里没有这一套）",
  "partial-corners": "的角一半有坐标一半没有", "non-finite-corners": "的角坐标不是有限的数", "off-canvas-corners": "的角落在画布外面",
  "bad-sets": "（对照表的格式不对）", "bad-face-set": "指的那一套对不上（对照表里没有那一项、或者那一项不是身份号）",
  "face-set-mismatch": "的「有没有位置」和角上的坐标对不上", "extra-channel": "在第二套贴图坐标上也有位置（这一版一张面只放得下一套，第二套不认）",
};
/** 排法表的一行读不了的原因（uvSetRowsDropped 用）。 */
const UV_ROW_WHY: Record<UvRowWhy, string> = {
  "not-a-list": "整张表的格式不对", "not-an-object": "格式不对", "bad-guid": "身份号缺了或不对", "bad-size": "画布的宽高不是 1–16384 的整数",
  "bad-density": "密度不是正数", "bad-fit": "没写定住的是什么", "duplicate-guid": "两行用了同一个身份号",
};
