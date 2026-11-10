// .ora 布局归一化：把任何历史布局的 entry 表变成**当前布局**（format 3），读端从此只认一种形状。
// created 2026-09-29 by Claude Fable 5.1（持久化立宪，user 同日「weebpaint升级同意」；机制照 CatsUp 契约 §7）
//
// 这是 ora.ts 读端过去散着的 20 处兼容分支（dualRead / 单张兜底 / 根目录 mp4 …）收拢成的一张表。
// 纯函数：进一张 { 路径 → 字节 } 表，出一张新表 + 做了哪些搬动（给日志）。不读写文件，不碰 DOM。
// 幂等：当前布局的文件跑一遍什么都不动。
//
// 为什么是「归一化」不是「按版本号链式升级」：WeebPaint 的历史布局从来没严格按版本走——format 2 的文件里
//   仍可能留着根目录的 timelapse.mp4（2026-08-30 整改批明说「旧 entry 追溯搬家不迁」）。所以布局这一层
//   用「旧路径 → 新路径」的条件搬动，任何文件跑一遍都安全；JSON 子结构（desk / 清单）才用严格的版本链。
//
// 当前布局（format 3；改动布局必须按 CLAUDE.md「ora 布局变更纪律」上报 + 附目录表）：
//   mimetype · stack.xml · mergedimage.png · data/layer<id>.png
//   .weebpaint/timelapse.mp4 · .weebpaint/timelapse.json
//   .weebpaint/references/manifest.json · .weebpaint/references/r<i>.<ext>    ← 参考窗（@internal/reference-window 的目录契约）
//   .weebpaint/editor-state.json                                              ← desk（format 3 起不再含 refPanels）
//   Thumbnails/thumbnail.png
//   webpaint/state.json                                                       ← 旧轨（v0.8.21 停写；只读，原样留着）

export type EntryMap = Record<string, Uint8Array>;

export const REFERENCES_DIR = ".weebpaint/references";
export const REFERENCES_MANIFEST = `${REFERENCES_DIR}/manifest.json`;

export interface NormalizedLayout {
  files: EntryMap;
  /** 做了哪些搬动（人话，给日志）。空 = 文件本来就是当前布局。 */
  migrated: string[];
}

const enc = new TextEncoder(), dec = new TextDecoder("utf-8");
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

export function normalizeLayout(input: EntryMap): NormalizedLayout {
  const files: EntryMap = { ...input };
  const migrated: string[] = [];
  const move = (from: string, to: string): boolean => {
    if (!(from in files) || to in files) return false;
    files[to] = files[from];
    delete files[from];
    migrated.push(`${from} → ${to}`);
    return true;
  };

  // ① 点目录改名（2026-08-20「新写旧读」）：.webpaint/… → .weebpaint/…
  for (const p of Object.keys(files)) {
    if (p.startsWith(".webpaint/")) move(p, ".weebpaint/" + p.slice(".webpaint/".length));
  }
  // ② timelapse.mp4 从根目录搬进 .weebpaint/（format 2 起与 json 团圆）
  move("timelapse.mp4", ".weebpaint/timelapse.mp4");

  // ③ 参考清单独立成文件（format 3）：desk（editor-state.json）里的 refPanels → references/manifest.json
  //    清单本身的形状不动（键名 index / items / kind / src / vp 就是库的 v1 清单，缺 version 当 v1）。
  if (!(REFERENCES_MANIFEST in files) && ".weebpaint/editor-state.json" in files) {
    const parsed = parseJson(files[".weebpaint/editor-state.json"]);
    if (isObj(parsed) && isObj(parsed.refPanels)) {
      const manifest = parsed.refPanels;
      if (Array.isArray(manifest.items) && manifest.items.length > 0) {
        files[REFERENCES_MANIFEST] = enc.encode(JSON.stringify(manifest));
        migrated.push(`editor-state.json#refPanels → ${REFERENCES_MANIFEST}`);
      }
      delete parsed.refPanels;
      files[".weebpaint/editor-state.json"] = enc.encode(JSON.stringify(parsed));
    }
  }

  // ④ 单张参考（format ≤1）：weebpaint/reference.png 或更老的 webpaint/reference.png → 一张卡的清单
  //    视口：老 desk 的 refPanel.viewport 若不是默认值（从没动过）就带上，否则留空让窗口打开时自适应。
  if (!(REFERENCES_MANIFEST in files)) {
    const legacy = ["weebpaint/reference.png", "webpaint/reference.png"].find((p) => p in files);
    if (legacy) {
      const dest = `${REFERENCES_DIR}/r0.png`;   // 名字叫 png 未必是 png（历史如此）——消费方按内容嗅探
      files[dest] = files[legacy];
      delete files[legacy];
      const vp = legacyRefViewport(files[".weebpaint/editor-state.json"]);
      files[REFERENCES_MANIFEST] = enc.encode(JSON.stringify({ index: 0, items: [{ kind: "image", src: dest, vp }] }));
      migrated.push(`${legacy} → ${dest} + ${REFERENCES_MANIFEST}`);
    }
  }
  // 两张旧单张同时存在（理论上不会）：剩下那张没人认领，原样留在表里，写端不会写它——等于自然清掉。

  return { files, migrated };
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return undefined;
  try { return JSON.parse(dec.decode(bytes)); } catch { return undefined; }
}
/** 老 desk 里单张参考的视口：默认单位视口 = 从没动过 → null（打开时 fit，无损）。 */
function legacyRefViewport(deskBytes: Uint8Array | undefined): { tx: number; ty: number; scale: number; rot: number } | null {
  const d = parseJson(deskBytes);
  const v = isObj(d) && isObj(d.refPanel) && isObj(d.refPanel.viewport) ? d.refPanel.viewport : null;
  if (!v) return null;
  const { tx, ty, scale, rot } = v as Record<string, unknown>;
  if (![tx, ty, scale, rot].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const moved = tx !== 0 || ty !== 0 || scale !== 1 || rot !== 0;
  return moved ? { tx: tx as number, ty: ty as number, scale: scale as number, rot: rot as number } : null;
}
