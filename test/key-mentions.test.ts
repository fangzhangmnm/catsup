// 界面文字里手写的组合键必须真的绑着（计划书 `ai-docs/20261109-audit-fixes-plan.md` 工单 4；家族周账 F-120 的「还没挡的同类」；created 2026-11-09 by Claude Opus 5.5）。
// user 10-28 晚：「tooltip你没有更新，这背后有什么架构问题和可以设计瑞士奶酪的修」。v0.16.23 起工具提示 / 帮助页的键名从键表现算；
// 但提示行文案、立场表格子、菜单说明里还有约 110 行手写键名（11-09 审查），改键位时它们不会跟着变。逐行改成派生是慢活（另排），这条先守住：
//   src/ 里任何字符串字面量（不含 vendor/ 和 controller/keymap.ts 自己）写到的「修饰键 + 键」，换成键表的和弦写法后，必须在 keymap.ts 的某一层里绑着。
// 和弦集合从 keymap.ts 导出的 ALL_LAYERS 取（不用正则读键表源码）。
// **挡不住的**（留给以后的派生）：① 键在键表里、但意思 / 工作台不对（「Ctrl+J = 合并」写成「Ctrl+J = 连线」）；② 单个字母键（「按 G」「X 删除」）；
// ③ 修饰键语义（「按住 Shift = 15°」「Alt 点边 = 环」）——这些不是和弦，键表里本来就没有。
import { describe, it, eq, assert } from "./runner.mjs";
import { ALL_LAYERS } from "../src/controller/keymap.ts";
const fs = (await import("node:fs" as string)) as { readdirSync(u: URL, o: { withFileTypes: true }): { name: string; isDirectory(): boolean }[]; readFileSync(u: URL, e: string): string };   // tsconfig 没装 Node 类型：动态引（同 aux-look-guard.test.ts）

function* walk(rel: string): Generator<string> {
  for (const d of fs.readdirSync(new URL(`../src/${rel}`, import.meta.url), { withFileTypes: true })) { const r = rel ? `${rel}/${d.name}` : d.name; if (d.isDirectory()) { if (d.name !== "vendor") yield* walk(r); } else if (d.name.endsWith(".ts")) yield r; }
}
const read = (rel: string): string => fs.readFileSync(new URL(`../src/${rel}`, import.meta.url), "utf8");

/** 「Ctrl+Shift+B」「Alt + S」「Ctrl+方向键」→ 键表和弦（修饰键按 ctrl / alt / shift 的固定顺序，同 keymap.ts chordOf）；方向键 = 四个方向任一个绑着就算。 */
const MENTION = /((?:Ctrl|Alt|Shift)(?:\s*\+\s*(?:Ctrl|Alt|Shift))*)\s*\+\s*(方向键|Tab|空格|Space|Delete|Backspace|Enter|Esc(?:ape)?|[A-Za-z0-9])(?![A-Za-z0-9])/g;
const KEY_NAME: Readonly<Record<string, string>> = { 空格: "space", Space: "space", Tab: "tab", Delete: "delete", Backspace: "backspace", Enter: "enter", Esc: "escape", Escape: "escape" };
function chordsOf(mods: string, key: string): string[] {
  const m = new Set(mods.toLowerCase().match(/ctrl|alt|shift/g) ?? []), pre = ["ctrl", "alt", "shift"].filter((x) => m.has(x)).map((x) => `${x}+`).join("");
  if (key === "方向键") return ["arrowup", "arrowdown", "arrowleft", "arrowright"].map((k) => pre + k);
  return [pre + (KEY_NAME[key] ?? key.toLowerCase())];
}
/** 一行代码里的字符串字面量（先去掉行尾注释；「://」不算注释）。 */
const literals = (line: string): string[] => line.replace(/(^|[^:])\/\/.*$/, "$1").match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];

const BOUND = new Set<string>();
for (const L of ALL_LAYERS) for (const b of L.bindings) BOUND.add(b.chord);

describe("界面文字里手写的组合键（工单 4 守卫）", () => {
  it("每一个都在键表的某一层里绑着（改键位只改 keymap.ts 的时候，这里会把没跟上的文案点名）", () => {
    const seen = new Map<string, string[]>(), bad: string[] = [];
    for (const f of walk("")) {
      if (f === "controller/keymap.ts") continue;
      read(f).split("\n").forEach((line: string, i: number) => {
        if (/^\s*(\*|\/\*)/.test(line)) return;   // 块注释行
        for (const lit of literals(line)) for (const m of lit.matchAll(MENTION)) {
          const cands = chordsOf(m[1], m[2]), key = cands[0], where = `${f}:${i + 1}`;
          (seen.get(key) ?? seen.set(key, []).get(key)!).push(where);
          if (!cands.some((c) => BOUND.has(c))) bad.push(`${where}「${m[0]}」→ ${cands.length > 1 ? `${cands[0]} 等` : key}`);
        }
      });
    }
    eq(bad.join("\n"), "", "界面文字写了键表里没有的组合键（改了键位？那就改这几行文案，或者在 keymap.ts 绑上）");
    assert(seen.size >= 10, `只扫到 ${seen.size} 种组合键：抽取的正则坏了？（11-09 审查时是 15 种）`);
  });
  it("抽取本身：修饰键顺序、空格写法、方向键、不把 Shift+拖 当成键", () => {
    const pick = (s: string): string[] => [...s.matchAll(MENTION)].map((m) => chordsOf(m[1], m[2]).join("|"));
    eq(pick("按 Shift+Ctrl+B 倒角").join(), "ctrl+shift+b");
    eq(pick("Alt + S / Alt+W 沿法线").join(), "alt+s,alt+w");
    eq(pick("Ctrl+空格").join(), "ctrl+space");
    eq(pick("Shift+方向键").join(), "shift+arrowup|shift+arrowdown|shift+arrowleft|shift+arrowright");
    eq(pick("Shift+拖 = 自由拖；Ctrl+点 = 减选").length, 0);
    eq(pick("Ctrl+Z1").length, 0, "后面紧跟字母数字的不是一个键");
  });
});
