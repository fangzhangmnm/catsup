// 读入时记下的每一种都要说出来（贴图主线 1-2½ 审过时统筹定的：「记了不说等于没记，这类键以后还会加，靠人记得补一句话靠不住」）。created 2026-11-11 by Claude Opus 5.5
// ① 读源码：FormatReadNotes（src/format/migrate/index.ts）的每一个键，READ_NOTE_SAY（src/app/format-notes.ts）里都有一行，反过来也一样。
// ② 每个键造一份样本：说出来的话不空、不带 undefined / NaN / [object …]；只有 SILENT_NOTES 里登记过、写了理由的键可以不说。
import { describe, it, eq, assert } from "./runner.mjs";
import { READ_NOTE_SAY, SILENT_NOTES, formatNotesSay, LOSSY_NOTES, lossySay } from "../src/app/format-notes.ts";
import type { FormatReadNotes } from "../src/format/migrate/index.ts";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string };

/** 接口体里第一层的字段名（跳过注释、嵌套的花括号 / 方括号 / 尖括号里面的东西）。 */
function interfaceKeys(src: string, name: string): string[] {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), at = s.indexOf(`export interface ${name} {`);
  assert(at >= 0, `找到 interface ${name}`);
  const keys: string[] = [];
  let depth = 0, i = s.indexOf("{", at), token = "";
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "{" || c === "[" || c === "(" || c === "<") { depth++; token = ""; continue; }
    if (c === "}" || c === "]" || c === ")" || c === ">") { depth--; token = ""; if (depth === 0) break; continue; }
    if (depth !== 1) continue;
    if (/[A-Za-z0-9_$]/.test(c)) { token += c; continue; }
    if ((c === ":" || c === "?") && token) { if (!keys.includes(token)) keys.push(token); }
    if (c === ";" || c === "," || c === "\n") token = "";
    else if (c !== " " && c !== "?") token = "";
  }
  return keys;
}
const KEYS = interfaceKeys(readFileSync("src/format/migrate/index.ts", "utf8"), "FormatReadNotes").sort();
const stamp = { major: 9, minor: 1, patch: 0 };
/** 每个键一份样本（新加了键这里也要加：下面那条会红）。 */
const SAMPLE: Required<FormatReadNotes> = {
  remintedGuids: 2,
  newerMinor: [{ ext: "CATSUP_mesh", file: { major: 2, minor: 5, patch: 0 }, mine: { major: 2, minor: 0, patch: 0 } }],
  newerPatch: [{ ext: "CATSUP_mesh", file: { major: 2, minor: 0, patch: 3 }, mine: { major: 2, minor: 0, patch: 0 } }],
  deskTooNew: stamp, builtinFrontSlots: 1, referencesTooNew: stamp, shelfTooNew: stamp, danglingShelfRefs: 3,
  texturesTooNew: stamp, danglingTextureRefs: 2, unknownTextureKinds: 1,
  uvDropped: [{ def: { guid: "00000000-0000-4000-8000-000000000001", name: "画盒" }, uvSet: { guid: "00000000-0000-4000-8000-000000000002", name: "UV" }, faces: 2, why: "partial-corners" }],
  paintUnplaced: [{ def: { guid: "00000000-0000-4000-8000-000000000001", name: "画盒" }, uvSet: { guid: "00000000-0000-4000-8000-000000000002", name: "UV" }, faces: 4 }],
  foreignPaintSlots: 1, orphanPaintTextures: 1,
};

describe("读入时记下的每一种都要说出来（1-2½）", () => {
  it("① FormatReadNotes 的每一个键，读入提示的表里都有一行（反过来也一样）", () => {
    assert(KEYS.length >= 15, `读出了 ${KEYS.length} 个键：${KEYS.join(", ")}`);
    eq(Object.keys(READ_NOTE_SAY).sort().join(", "), KEYS.join(", "), "表的键 = 接口的键");
    eq(Object.keys(SAMPLE).sort().join(", "), KEYS.join(", "), "这里的样本也覆盖每个键（新加了键要在这里加一份）");
  });
  it("② 每个键都说出一句看得懂的话；只有登记过理由的可以不说", () => {
    for (const k of KEYS as (keyof FormatReadNotes)[]) {
      const lines = (READ_NOTE_SAY[k] as (x: unknown) => string[])(SAMPLE[k]);
      if (k in SILENT_NOTES) { assert(!!SILENT_NOTES[k], `${k}：不说要写理由`); eq(lines.length, 0, `${k} 是登记过的静默`); continue; }
      assert(lines.length > 0, `${k}：有值却没说话`);
      for (const l of lines) assert(l.length > 8 && !/undefined|NaN|\[object /.test(l), `${k}：「${l}」`);
    }
    const total = formatNotesSay(SAMPLE).length;
    assert(total >= KEYS.length - Object.keys(SILENT_NOTES).length, `一共说了 ${total} 句`);
  });
});

describe("会丢 / 不丢的名单（1-8b，统筹 11-11 定）", () => {
  it("每个键都表态；会丢的正好是这四种：uvDropped、foreignPaintSlots、danglingTextureRefs、danglingShelfRefs", () => {
    eq(Object.keys(LOSSY_NOTES).sort().join(", "), KEYS.join(", "), "名单的键 = 接口的键");
    eq(Object.entries(LOSSY_NOTES).filter(([, v]) => v).map(([k]) => k).sort().join(", "), "danglingShelfRefs, danglingTextureRefs, foreignPaintSlots, uvDropped");
  });
  it("lossySay：只说会丢的那几种；空的 / 0 不算", () => {
    eq(lossySay({ newerMinor: [], newerPatch: [], foreignPaintSlots: 2, remintedGuids: 3 } as FormatReadNotes).length, 1, "只说会丢的");
    eq(lossySay({ newerMinor: [], newerPatch: [], uvDropped: [] } as FormatReadNotes).length, 0, "空数组不算");
    eq(lossySay(undefined).length, 0);
  });
});
