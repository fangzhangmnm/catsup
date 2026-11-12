// 工作台只发自己的工具（统筹 11-11）：编辑器的 setTool 不换工作台；工具键跨工作台只按键表的跳转表 TOOL_KEY_JUMPS 明着跨；画画工作台不在表里。created 2026-11-11 by Claude Opus 5.5
// 起因：画画工作台里按 E，以前 setTool 悄悄换到自由建模、拿起建模的橡皮——人以为拿着画画的橡皮，拖一下删掉了模型（v0.19.46 实测「删除了 1 处」）。
// 行为（在真 app 里把每个工具键按一遍）在探针 test/probes/probe-workbench-tools.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { TOOL_KEY_JUMPS } from "../src/controller/keymap.ts";
import { workbenches } from "../src/editor/modes/index.ts";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string };

const ALL = workbenches().map((m) => m.id);

describe("工作台只发自己的工具", () => {
  it("跳转表里没有画画工作台：画画那一行不在、别的行里也没有它（工具键从画画出不去、也进不来）", () => {
    assert(!("paint" in TOOL_KEY_JUMPS), "跳转表里有画画那一行");
    for (const [from, to] of Object.entries(TOOL_KEY_JUMPS)) assert(!(to ?? []).includes("paint"), `「${from}」那一行能跳进画画`);
  });
  it("跳转表只认真有的工作台；初始内容 = 以前 setTool 悄悄做的规则原样（每个建模工作台都能跳去别的建模工作台，再按管不管得了这种身体筛）", () => {
    for (const [from, to] of Object.entries(TOOL_KEY_JUMPS)) {
      assert(ALL.includes(from as never), `跳转表里有不存在的工作台 ${from}`);
      for (const t of to ?? []) assert(ALL.includes(t), `「${from}」那一行有不存在的工作台 ${t}`);
      eq([...(to ?? [])].sort().join(","), ALL.filter((m) => m !== from && m !== "paint").sort().join(","), `「${from}」那一行（改了 = 明着改这里）`);
    }
    eq(Object.keys(TOOL_KEY_JUMPS).sort().join(","), ALL.filter((m) => m !== "paint").sort().join(","), "表里的行 = 除画画以外的工作台（新工作台默认不在表里，要通才登记 = 改这里）");
  });
  it("编辑器的 setTool 不换工作台：函数体里没有 setMode（要跨工作台 = 调用方先明着 setMode）", () => {
    const s = readFileSync("src/editor/editor.ts", "utf8"), i = s.indexOf("  setTool(t: Tool): void {");
    assert(i >= 0, "找不到 setTool");
    const j = s.indexOf("\n  }\n", i), body = s.slice(i, j);
    assert(!/setMode\(/.test(body.split("\n").filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\/\/.*$/, "")).join("\n")), "setTool 里调了 setMode");
  });
  it("app 的工具键走跳转表：toolKey 不在当前工作台时只按 TOOL_KEY_JUMPS[当前工作台] 明着跨", () => {
    const m = readFileSync("src/app/main.ts", "utf8"), i = m.indexOf("function toolKey("), body = m.slice(i, m.indexOf("\n}\n", i));
    assert(/takeTool\(t, TOOL_KEY_JUMPS\[editor\.modeId\] \?\? \[\]\)/.test(body), "toolKey 没按跳转表走");
  });
});
