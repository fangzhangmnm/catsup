// 工具提示 = 键表生成（controller/keymap.ts toolKeysOf / toolKeyText；created 2026-10-28 by Claude Opus 5.5）。
// user 10-28 晚「tooltip你没有更新，这背后有什么架构问题和可以设计瑞士奶酪的修」：以前左柱提示读 main.ts 工具表里手写的键名 = 键表外的第二份，而且不分工作台
// （自由建模「删除（E）」，那里 E = 挤出键盘起手）。这一组守卫是奶酪的第三层：① 第二份删了不许回来 ② 提示里的每个键反查回去确实拿起 / 起手这把工具 ③ 已知的错例钉住。
import { describe, it, eq, assert } from "./runner.mjs";
import { resolveKey, toolKeysOf, toolKeyText, type KeyContext } from "../src/controller/keymap.ts";
import { FreeformMode } from "../src/editor/modes/freeform.ts";
import { GeometryMode } from "../src/editor/modes/geometry.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: URL, enc: string): string };   // 同 placement.test：类型检查不认 node 模块
const MAIN = fs.readFileSync(new URL("../src/app/main.ts", import.meta.url), "utf8");
const modes = [new GeometryMode(), new FreeformMode()];
const evt = (ch: string) => { const p = ch.split("+"), n = p[p.length - 1]; return { key: n === "space" ? " " : n, code: /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : n, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") }; };

describe("工具提示从键表生成（keymap.ts toolKeyText）", () => {
  it("第二份删了：main.ts 的工具表没有 key 字段；按钮提示 / 小三角 / 手腕面板的键都从 specOf 的 toolKeyText 来", () => {
    const i = MAIN.indexOf("const TOOL_SPEC"), j = MAIN.indexOf("\n];", i), blk = MAIN.slice(i, j);
    assert(i > 0 && !/\bkey\s*:/.test(blk), "TOOL_SPEC 里又出现手写的 key");
    assert(/specOf[\s\S]{0,200}toolKeyText\(/.test(MAIN), "specOf 不再从 toolKeyText 拿键");
    assert(!/\.title = `[^`]*（[A-Z]）/.test(MAIN), "有按钮提示里写死了键名");
  });
  it("提示里的每个键反查：在那个工作台从别的工具按下去，确实拿起这把（或组里轮到它）/ 键盘起手这把", () => {
    for (const m of modes) for (const t of m.tools) {
      const from = t === "select" ? "line" : "select", c: KeyContext = { mode: m.id, tool: from, gesture: false, hasSelection: true, walk: "off", walking: false, mirrorSession: false, lockStyle: null, typingWants: () => false };
      for (const k of toolKeysOf(m.id, t, (x) => m.tools.includes(x))) {
        const r = resolveKey(c, evt(k.chord));
        assert(r && r !== "swallow", `${m.id}/${t}：${k.chord} 现在不绑东西`);
        if (r && r !== "swallow") assert(k.how === "modal" ? r.action.startsWith(`modal:${t}`) : r.action.startsWith("tool.key:"), `${m.id}/${t}：${k.chord} 实际是 ${r.action}`);
      }
    }
  });
  it("钉住的例子：自由建模的删除没有 E（E = 挤出起手）；挤出 = P · E 起手；移动 = M · G 起手；缩放只有 S 起手；硬表面橡皮 = E · X、焊边橡皮 = 再按 E / X", () => {
    const ff = (t: Parameters<typeof toolKeyText>[1]) => toolKeyText("freeform", t, (x) => modes[1].tools.includes(x));
    assert(!/\bE\b/.test(ff("erase")), `自由建模删除：${ff("erase")}`);
    eq(ff("pp"), "P · E 键盘起手"); eq(ff("move"), "M · G 键盘起手"); eq(ff("scale"), "S 键盘起手");
    eq(toolKeyText("geometry", "erase"), "E · X"); eq(toolKeyText("geometry", "weldErase"), "再按 E / X"); eq(toolKeyText("geometry", "move"), "M");
  });
});
