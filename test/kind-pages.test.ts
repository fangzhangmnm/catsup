// 物体窗口里「每个种类自己的那一块」（第 1 版第五节第 1 条；created 2026-11-13 by Claude Opus 5.5）。
// ① 窗口那一层（app/object-window.ts）不认识种类：去掉注释之后，不许出现种类的 id / 给人看的种类名，不许直接调按种类分的列表 / 名字函数，不许问 kindOfDef。
//    要按种类长不一样的东西 = 进 app/kind-pages.ts 那张表（Record<BodyKind, …>，加一个种类少一条编译不过）。
// ② 表的键 = 全部身体种类；空物体的元素页说一句为什么没有。
import { describe, it, eq, assert } from "./runner.mjs";
import { BODY_KINDS } from "../src/scene/scene.ts";
import { KINDS } from "../src/scene/kinds.ts";
import { KIND_PAGES } from "../src/app/kind-pages.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, e: string): string };
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map((l) => { const i = l.indexOf("//"); return i >= 0 && !/["'`][^"'`]*\/\//.test(l.slice(0, i + 2)) ? l.slice(0, i) : l; }).join("\n");

describe("物体窗口不认识种类（第 1 版第五节第 1 条）", () => {
  const code = stripComments(fs.readFileSync("src/app/object-window.ts", "utf8"));
  it("不出现种类的 id", () => {
    for (const k of BODY_KINDS) assert(!code.includes(`"${k}"`) && !code.includes(`'${k}'`), `object-window.ts 里写了种类 id「${k}」：按种类长不一样的东西进 kind-pages.ts`);
  });
  it("不出现给人看的种类名", () => {
    for (const k of BODY_KINDS) assert(!code.includes(KINDS[k].noun), `object-window.ts 里写了「${KINDS[k].noun}」`);
    assert(!/硬表面|网格体|空物体/.test(code), "种类的叫法");
  });
  it("不直接问种类、不直接调按种类分的列表 / 名字函数", () => {
    for (const bad of ["kindOfDef", "meshAttributeList", "brepAttributeList", "meshAttrName", "brepAttrName", ".mesh(", ".brep("]) assert(!code.includes(bad), `object-window.ts 里出现 ${bad}`);
  });
});

describe("种类那一块的登记表", () => {
  it("表的键 = 全部身体种类", () => { eq(Object.keys(KIND_PAGES).sort().join(","), [...BODY_KINDS].sort().join(",")); });
  it("空物体：没有字段；元素页说一句为什么没有", () => {
    const fake = {} as never;   // 空物体那一页不碰编辑器
    eq(KIND_PAGES.empty.fields({ editor: fake, def: 0 }).length, 0);
    const el = KIND_PAGES.empty.elements({ editor: fake, def: 0 });
    assert("none" in el && el.none.length > 4, "说一句");
  });
});
