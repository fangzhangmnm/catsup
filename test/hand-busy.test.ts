// 「手上还有没有一下没收」名册（controller/hand-busy.ts）+ 守卫。created 2026-11-11 by Claude Opus 5.5
// 统筹 11-11：会话的自动保存 / 崩溃快照 / 重推只问这张名册，不再直接问 editor.isGestureActive()（画画的一笔以前不在里面 = 自动保存可能落在一笔中间）。
// 行为（一笔当中不存、抬笔后下一拍存、存下来带着这一笔）在真 app 的探针 test/probes/probe-hand-busy.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { createHandRoster, HAND_SOURCES } from "../src/controller/hand-busy.ts";
const { readFileSync, readdirSync, statSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: "utf8"): string; readdirSync(p: string): string[]; statSync(p: string): { isDirectory(): boolean } };
const { join } = (await import("node:path" as string)) as { join(...p: string[]): string };

describe("手上一下没收的名册", () => {
  it("名册空 / 都收了 = 不忙；任何一个来源说有 = 忙，which 报是谁", () => {
    const h = createHandRoster();
    eq(h.busy(), false); eq(h.which(), null);
    let g = false, p = false;
    h.add({ source: "editor.gesture", busy: () => g });
    h.add({ source: "paint.stroke", busy: () => p });
    eq(h.busy(), false);
    p = true; eq(h.busy(), true); eq(h.which(), "paint.stroke");
    g = true; eq(h.which(), "editor.gesture");   // 排在前面的那个
    g = false; p = false; eq(h.busy(), false); eq(h.which(), null);
  });
  it("声明式：每次现问，退名册之后它说什么都不算", () => {
    const h = createHandRoster();
    const off = h.add({ source: "paint.stroke", busy: () => true });
    eq(h.busy(), true);
    off(); eq(h.busy(), false); eq(h.sources().length, 0);
    off();   // 退两次不出事
    eq(h.sources().length, 0);
  });
  it("同一个来源登记两次 = 抛（宿主接线写重了）", () => {
    const h = createHandRoster();
    h.add({ source: "editor.gesture", busy: () => false });
    let threw = false;
    try { h.add({ source: "editor.gesture", busy: () => false }); } catch { threw = true; }
    assert(threw, "第二次登记没抛");
  });
});

describe("守卫：名册的来源点名 + 会话只问名册", () => {
  it("名册上的来源就是这两个（加一个 = 改这里 + 宿主登记一行；少一个 = 红）", () => {
    eq([...HAND_SOURCES].join(","), "editor.gesture,paint.stroke");
  });
  it("宿主每个来源登记正好一行（src 里 add({ source: \"…\" } 各出现一次，都在 app/main.ts）", () => {
    function* walk(dir: string): Generator<string> { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) yield* walk(p); else if (/\.ts$/.test(f)) yield p; } }
    const hits: Record<string, string[]> = {};
    for (const f of walk("src")) {
      const s = readFileSync(f, "utf8");
      for (const m of s.matchAll(/\.add\(\{\s*source:\s*"([^"]+)"/g)) (hits[m[1]] ??= []).push(f);
    }
    for (const src of HAND_SOURCES) eq((hits[src] ?? []).join(","), "src/app/main.ts", `来源 ${src} 的登记`);
    for (const k of Object.keys(hits)) assert((HAND_SOURCES as readonly string[]).includes(k), `登记了名册上没有的来源 ${k}`);
  });
  it("会话（session.ts）不点具体来源：没有 isGestureActive / gestureActive / stroking，忙不忙只问 hand.busy()", () => {
    const s = readFileSync("src/app/session.ts", "utf8").split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join("\n");   // 注释里提到名字不算
    for (const bad of ["isGestureActive", "gestureActive", "stroking", "gestureInProgress"]) assert(!s.includes(bad), `session.ts 里出现了具体来源 ${bad}`);
    assert(/this\.d\.hand\.busy\(\)/.test(s), "session.ts 没问名册");
  });
});
