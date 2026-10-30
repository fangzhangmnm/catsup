// 画风翻译器的守卫（窄接口设计稿 §7.1 / 元规则 ①；2026-10-29 Claude Opus 5.5）：编辑器只说「这是什么」，GL 量和颜色值只住画风表 src/look/aux.ts。
// user 10-29「画风翻译器也需要定义辅助几何」「小栗鼠不应该认识gizmos」。一条线想换样子 = 改画风表一行；在编辑器里写线宽 / 颜色值 = 这里红。
import { describe, it, assert, eq } from "./runner.mjs";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, e: string): string };

/** 仓里的相对路径（src/editor/xxx.ts）→ 文件内容。 */
function* walk(rel: string): Generator<string> {
  const dir = new URL(`../${rel}/`, import.meta.url);
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) { if (d.isDirectory()) yield* walk(`${rel}/${d.name}`); else if (d.name.endsWith(".ts")) yield `${rel}/${d.name}`; }
}
const read = (rel: string): string => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const EDITOR = [...walk("src/editor")];
/** 内容流（面 / 边的默认色烘进块）是内容那一半，不是辅助几何。 */
const CONTENT_OK = new Set(["src/editor/stream-provider.ts"]);

describe("画风翻译器守卫：编辑器里没有 GL 量和颜色值", () => {
  it("src/editor 里不出现辅助几何的 GL 量（线宽 / 点大小 / 深度写 / 双面 / 画序 / 往前拉 / 画在哪一遍）", () => {
    const bad: string[] = [];
    // 字段名太常见的（pass / stage / pull）只认画法的那几个值，免得误伤 StepPass、工具的 stage
    const RE = /\b(widthPx|sizePx|depthWrite|doubleSide|renderOrder)\b|\bpass:\s*"(content|overlay)"|\bstage:\s*[01]\s*[,}]|\bresolution:\s*"(main|native)"|\bpull:\s*(0\.\d|null)/;
    for (const p of EDITOR) read(p).split("\n").forEach((l: string, i: number) => { const t = l.trimStart(); if (!t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*") && RE.test(l.replace(/\/\/.*$/, ""))) bad.push(`${p}:${i + 1}: ${l.trim().slice(0, 120)}`); });
    eq(bad.join("\n"), "", "GL 量要写进 src/look/aux.ts 的表");
  });
  it("src/editor 里不出现颜色值（0xRRGGBB）——颜色角色（AuxColor）写名字，值在画风表", () => {
    const bad: string[] = [];
    for (const p of EDITOR) { if (CONTENT_OK.has(p)) continue; read(p).split("\n").forEach((l: string, i: number) => { if (/\b0x[0-9a-fA-F]{6}\b/.test(l.replace(/\/\/.*$/, ""))) bad.push(`${p}:${i + 1}: ${l.trim().slice(0, 120)}`); }); }
    eq(bad.join("\n"), "", "颜色值要进画风表的色板");
  });
  it("只有 view-state.ts 调翻译器（别处只拿类型）", () => {
    const bad: string[] = [];
    for (const p of EDITOR) { const s = read(p); if (/^import \{[^}]*\} from "\.\.\/look\/aux\.ts"/m.test(s) && p !== "src/editor/view-state.ts") bad.push(p); }
    eq(bad.join(","), "");
    assert(/translateAux\(/.test(read("src/editor/view-state.ts")), "view-state 走翻译器");
  });
  it("小栗鼠不认识编辑器的种类名（gizmo / 量角器 / 顶点……只在画风表和编辑器里）", () => {
    const bad: string[] = [];
    const WORDS = /\b(protractor|xformGizmo|planeGizmo|selVert|faceDot|snapHint|teleportArc|markedEdge)\b/;
    for (const p of walk("src/minccino")) read(p).split("\n").forEach((l: string, i: number) => { if (WORDS.test(l.replace(/\/\/.*$/, ""))) bad.push(`${p}:${i + 1}`); });
    eq(bad.join(","), "");
  });
});
