// 工作台只发自己的工具（统筹 11-11）：编辑器的 setTool 不换工作台；工具键跨工作台只按键表的跳转表 TOOL_KEY_JUMPS 明着跨；画画工作台不在表里。created 2026-11-11 by Claude Opus 5.5
// 起因：画画工作台里按 E，以前 setTool 悄悄换到自由建模、拿起建模的橡皮——人以为拿着画画的橡皮，拖一下删掉了模型（v0.19.46 实测「删除了 1 处」）。
// 行为（在真 app 里把每个工具键按一遍）在探针 test/probes/probe-workbench-tools.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { TOOL_KEY_JUMPS } from "../src/controller/keymap.ts";
import { workbenches, workbenchOf, lockedHold } from "../src/editor/modes/index.ts";
import { isReadOnlyTool } from "../src/editor/tool-ids.ts";
const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };

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
  it("每个工作台都声明了锁上时拿哪把只读工具（whenLocked；v0.19.48）：就在这里拿 = 单子上有；去别处拿 = 别的工作台有、管得了这个工作台的身体", () => {
    for (const m of workbenches()) {
      const w = m.whenLocked as { tool?: string; elsewhere?: string } | undefined;
      assert(!!w && (!!w.tool !== !!w.elsewhere), `「${m.label}」没写 whenLocked（或者两样都写了）`);
      const t = (w!.tool ?? w!.elsewhere) as never;
      assert(isReadOnlyTool(t), `「${m.label}」锁上时拿的 ${t} 不是只读工具`);
      if (w!.tool) assert(m.tools.includes(t), `「${m.label}」写的 ${t} 不在它自己的单子上`);
      else for (const k of m.kinds) assert(!!workbenchOf(workbenches(), t, k), `「${m.label}」说去别处拿 ${t}，可是管 ${k} 的工作台里没有它`);
    }
    eq(JSON.stringify(workbenches().find((m) => m.id === "paint")!.whenLocked), JSON.stringify({ elsewhere: "select" }), "画画工作台 = 去有「选择」的工作台（行为 = v0.19.46）");
    // 按身体种类逐个走一遍 lockedHold：每个工作台管的每一种身体都找得到去处（missing 永远 false），去处真有那把工具、也管得了这种身体
    const list = workbenches();
    for (const m of list) for (const k of m.kinds) {
      const h = lockedHold(list, m, k);
      assert(!h.missing, `「${m.label}」管 ${k} 时锁上找不到去处`);
      const at = h.mode ? list.find((x) => x.id === h.mode)! : m;
      assert(at.tools.includes(h.tool) && (at.kinds as readonly string[]).includes(k), `「${m.label}」管 ${k} 时锁上去「${at.label}」拿 ${h.tool}：那里没有它或者管不了 ${k}`);
    }
  });
  it("src 里每一处调 setTool 的地方都表态了（v0.19.48；v0.19.47 漏的就是这一类：以为 setTool 会替人换工作台）", () => {
    // 加一处 = 这里加一行，写明它拿的是哪种：当前工作台单子上的 / 走 takeTool（明着换工作台）/ 照声明（先明着 setMode）
    const SITES: Record<string, { n: number; why: string }> = {
      "src/editor/editor.ts": { n: 7, why: "holdChanged 照工作台声明（要换先 setMode）；改组件原点拿 axes（先查这个工作台有没有）、结束 / 取消拿回原来那把（同一个工作台）×3；键盘起手 startModal 和环切 armLoopCut 只在自由建模里" },
      "src/app/paint-workbench.ts": { n: 1, why: "吸完色回到画画的笔（画画工作台自己的）" },
      "src/app/main.ts": { n: 9, why: "左柱 / 笔刷小三角（只列这个工作台的工具）；离开步行放回选择（验证工作台有）；takeTool ×2（明着换工作台的那一口）；轮换组（只轮这个工作台有的）；键盘起手没选区时（只在自由建模）；开机拿选择（硬表面有）；画布小窗的吸管取完色回到上一把笔（吸管只在画画工作台，笔也是这个工作台的；施工单二十一第 2 刀）" },
    };
    function* walk(dir: string): Generator<string> { const fs = (globalThis as unknown as { __fs?: unknown }).__fs; void fs; for (const f of readdirSync(dir)) { const p = `${dir}/${f}`; if (statSync(p).isDirectory()) { if (f !== "kernel") yield* walk(p); } else if (/\.ts$/.test(f)) yield p; } }
    const got: Record<string, number> = {};
    for (const f of walk("src")) { const n = (readFileSync(f, "utf8").match(/(?<![A-Za-z])setTool\(/g) ?? []).length - (f === "src/editor/editor.ts" ? 1 : 0); if (n > 0) got[f] = n; }   // editor.ts 减掉 setTool 自己的定义
    const sorted = (o: Record<string, number>): string => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    eq(sorted(got), sorted(Object.fromEntries(Object.entries(SITES).map(([k, v]) => [k, v.n]))), "setTool 的调用处（变了 = 在 SITES 里表态）");
  });
});

