// 分层键表（controller/keymap.ts）守卫：几个关键上下文里「按 X 是什么意思」（2026-10-28 Claude Fable 5.1；账本 UX17 / UX18）。
import { describe, it, eq } from "./runner.mjs";
import { resolveKey, chordOf, chordLabel, layersOf, modifierChords, keyDocs, ALL_LAYERS, LAYER_DOCS, KNOWN_CONFLICTS, muscleConflicts, meaningOf, type KeyContext, type KeyEvt } from "../src/controller/keymap.ts";
import { KEYS_TABLE, README_SECTIONS } from "../src/app/readme-docs.ts";

const base: KeyContext = { mode: "geometry", tool: "select", gesture: false, hasSelection: false, walk: "off", walking: false, mirrorSession: false, lockStyle: null, vcbWants: () => false };
const ctx = (o: Partial<KeyContext>): KeyContext => ({ ...base, ...o });
const K = (code: string, key = code.replace(/^Key/, "").toLowerCase(), m: Partial<KeyEvt> = {}): KeyEvt => ({ key, code, shift: false, ctrl: false, alt: false, ...m });
const act = (c: KeyContext, e: KeyEvt): string => { const r = resolveKey(c, e); return r === null ? "∅" : r === "swallow" ? "swallow" : r.action; };

describe("键表：什么时候按 X 是什么意思", () => {
  it("和弦：字母按物理键、修饰键固定顺序", () => {
    eq(chordOf(K("KeyX")), "x"); eq(chordOf(K("KeyB", "b", { ctrl: true, shift: true })), "ctrl+shift+b"); eq(chordOf(K("Space", " ")), "space"); eq(chordOf(K("ArrowRight", "ArrowRight", { shift: true })), "shift+arrowright");
  });
  it("自由建模：选择工具 X = 删除（有选区）；操作工具 X / Y / Z = 轴（手势外先锁、手势中锁）——user「move模式相当于blender帮你自动按G」", () => {
    eq(act(ctx({ mode: "freeform", tool: "select", hasSelection: true }), K("KeyX")), "delete.ifAny");
    eq(act(ctx({ mode: "freeform", tool: "select", hasSelection: false }), K("KeyX")), "delete.ifAny");   // 没选区 = 什么都不删（不再先锁 X）
    for (const tool of ["move", "rotate", "scale", "pp", "offset", "shrink"] as const) {
      eq(act(ctx({ mode: "freeform", tool, hasSelection: true }), K("KeyX")), "lock.axis:x", tool);
      eq(act(ctx({ mode: "freeform", tool, gesture: true }), K("KeyX")), "lock.key:x", `${tool} 手势中`);
      eq(act(ctx({ mode: "freeform", tool, gesture: true }), K("KeyZ", "z", { shift: true })), "lock.key:z:plane", `${tool} 手势中 Shift`);
    }
    eq(act(ctx({ mode: "freeform", tool: "select" }), K("KeyY")), "lock.arm:y", "选择工具先锁 Y 下一下生效");
  });
  it("硬表面：X = 橡皮（工具键）；G = 建组件；L = 画线；Shift+L 不再误切工具", () => {
    eq(act(ctx({}), K("KeyX")), "tool.key:x:erase"); eq(act(ctx({}), K("KeyG")), "component.make"); eq(act(ctx({}), K("KeyL")), "tool.key:l:line");
    eq(act(ctx({}), K("KeyL", "L", { shift: true })), "∅");
  });
  it("自由建模：G / R / S / E = 键盘起手；A = 全选；Ctrl+R 环切；Ctrl+B / Ctrl+Shift+B 倒角", () => {
    const c = ctx({ mode: "freeform", tool: "select" });
    eq(act(c, K("KeyG")), "modal:move"); eq(act(c, K("KeyR")), "modal:rotate"); eq(act(c, K("KeyE")), "modal:pp"); eq(act(c, K("KeyA")), "select.all");
    eq(act(c, K("KeyR", "r", { ctrl: true })), "mesh.loopCutArm"); eq(act(c, K("KeyB", "b", { ctrl: true, shift: true })), "modal:offset:bevelVerts");
  });
  it("步行：FPS 里 Tab = 原地编辑、Esc = 离开、别的键吞掉；放置里 Esc = 取消；原地编辑里 Esc 没选区 = 离开", () => {
    eq(act(ctx({ walk: "walk", walking: true }), K("Tab", "Tab")), "walk.editInPlace");
    eq(act(ctx({ walk: "walk", walking: true }), K("KeyL")), "swallow");
    eq(act(ctx({ walk: "place" }), K("Escape", "Escape")), "walk.cancelPlace");
    eq(act(ctx({ walk: "edit", walking: true }), K("Escape", "Escape")), "walk.exit");
    eq(act(ctx({ walk: "edit", walking: true, hasSelection: true }), K("Escape", "Escape")), "escape");
    eq(act(ctx({ walk: "edit", walking: true }), K("Space", " ")), "∅", "走路时空格归跳");
  });
  it("镜像会话回车 = 应用；数值小窗要的键先给它；方向键锁 / Shift+Tab 格点", () => {
    eq(act(ctx({ mirrorSession: true }), K("Enter", "Enter")), "mirror.apply");
    eq(act(ctx({ vcbWants: (e) => e.key === "5" }), K("Digit5", "5")), "vcb.feed");
    eq(act(ctx({}), K("ArrowRight", "ArrowRight")), "lock.key:x"); eq(act(ctx({}), K("Tab", "Tab", { shift: true })), "grid.toggle");
    eq(act(ctx({ mode: "freeform", tool: "select" }), K("ArrowRight", "ArrowRight")), "lock.arm:x", "自由建模拿着选择工具 = 先锁");
    eq(act(ctx({ mode: "freeform", tool: "move", lockStyle: "axis" }), K("ArrowRight", "ArrowRight")), "lock.key:x", "吃锁的工具 = 直接锁");
  });
  it("栈的形状：自由建模 + 操作工具 + 手势中 = 全局 / 工作台 / 工具 / 手势 / 数值小窗", () => {
    eq(layersOf(ctx({ mode: "freeform", tool: "move", gesture: true })).map((l) => l.id).join(" > "), "global > workbench:freeform > tool:ops > gesture > gesture:typing > vcb");
  });
  it("披露：按住修饰键时这一层有什么（modifierChords）——自由建模 Ctrl 有环切 / 倒角；硬表面 Shift+Z = 缩放到全部、操作工具里 = 面锁；披露的每一条 = 真按下去生效的那条", () => {
    const ff = ctx({ mode: "freeform", tool: "move" }), ctrl = modifierChords(ff, "ctrl").map((x) => x.chord), shift = modifierChords(ff, "shift");
    eq(ctrl.includes("ctrl+r") && ctrl.includes("ctrl+b"), true, ctrl.join(","));
    eq(shift.find((x) => x.chord === "shift+z")?.label, "面锁 XY", "操作工具里 Shift+Z = 面锁（操作工具层压过自由建模层）");
    // 不变量：披露的每一条 = 真按下去生效的那条（resolveKey 同一条）
    const evt = (ch: string): KeyEvt => { const p = ch.split("+"), n = p[p.length - 1]; return { key: n === "space" ? " " : n, code: /^[a-z]$/.test(n) ? `Key${n.toUpperCase()}` : /^[0-9]$/.test(n) ? `Digit${n}` : n, shift: p.includes("shift"), ctrl: p.includes("ctrl"), alt: p.includes("alt") }; };
    for (const c of [ff, ctx({}), ctx({ mode: "freeform", tool: "select", hasSelection: true }), ctx({ mode: "freeform", tool: "move", gesture: true })]) for (const m of ["shift", "ctrl", "alt"] as const) for (const x of modifierChords(c, m)) { const r = resolveKey(c, evt(x.chord)); eq(r !== null && r !== "swallow" ? r.label : String(r), x.label, `${c.mode}/${c.tool} ${x.chord}`); }
    eq(modifierChords(ctx({}), "shift").find((x) => x.chord === "shift+z")?.label, "缩放到全部", "硬表面选择工具");
    eq(new Set(shift.map((x) => x.chord)).size, shift.length, "同一和弦只露一次");
    eq(chordLabel("ctrl+shift+b"), "Ctrl+Shift+B"); eq(chordLabel("shift+arrowright"), "Shift+→"); eq(chordLabel("space"), "Space");
  });
  it("快捷键表从键表生成（UX40）：layersOf 能压上来的层都在 ALL_LAYERS、都有名字；表里每层每个和弦都列了；帮助页那一节是生成的、不是手抄的", () => {
    const seen = new Set<string>();
    for (const mode of ["geometry", "freeform", "verify", "surface"] as const) for (const tool of ["select", "move", "pp", "walk"] as const) for (const gesture of [false, true]) for (const walk of ["off", "place", "walk", "edit"] as const) for (const mirrorSession of [false, true])
      for (const L of layersOf(ctx({ mode, tool, gesture, walk, walking: walk === "walk" || walk === "edit", mirrorSession }))) seen.add(L.id);
    const all = new Set(ALL_LAYERS.map((L) => L.id));
    eq([...seen].filter((id) => !all.has(id)).join(","), "", "layersOf 压上来的层不在 ALL_LAYERS");
    eq(ALL_LAYERS.filter((L) => !LAYER_DOCS[L.id]).map((L) => L.id).join(","), "", "层没有名字");
    const docs = keyDocs((t) => `工具：${t}`);
    ALL_LAYERS.forEach((L, i) => { const keys = new Set(docs[i].rows.map((r) => r.keys)); for (const b of L.bindings) eq(keys.has(b.chord === "*" ? "数字 / 运算符" : chordLabel(b.chord)), true, `${L.id} ${b.chord}`); });
    eq(README_SECTIONS.find((x) => x.id === "keys")?.body, KEYS_TABLE, "帮助页「快捷键」= 生成的表");
  });
  it("肌肉记忆冲突（UX15）：同一个键在会来回切的几个地方意思不同 = 只许是登记过、等 user 拍的那几个；登记了但已经不冲突的 = 该删", () => {
    eq(meaningOf("lock.arm:x"), meaningOf("lock.axis:x")); eq(meaningOf("lock.key:z:plane"), meaningOf("lock.arm:z:plane")); eq(meaningOf("tool.key:s:scale"), meaningOf("modal:scale"));
    const now = muscleConflicts(), known = new Set(Object.keys(KNOWN_CONFLICTS));
    const fresh = [...now].filter(([ch]) => !known.has(ch)).map(([ch, m]) => `${ch}: ${[...m].map(([k, v]) => `${k}@${v.join("/")}`).join(" | ")}`);
    eq(fresh.join("; "), "", "新冒出来的肌肉记忆冲突（想清楚、登记进 KNOWN_CONFLICTS、告诉 user）");
    eq([...known].filter((ch) => !now.has(ch)).join(","), "", "登记了但已经不冲突（从 KNOWN_CONFLICTS 删掉）");
  });
});

// 手势中打数（Blender「S Z 0」；2026-10-28 晚 Claude Opus 5.5）：打字层压在手势层上面，只要编辑器说要的键；X / Y / Z 编辑器不要 → 照旧锁轴。
import { quantityKey, parseQuantity } from "../src/editor/units.ts";
describe("手势中打数（S Z 0）", () => {
  const typing = (buf: string) => ctx({ mode: "freeform", tool: "scale", gesture: true, lockStyle: "axis", typingWants: (e: KeyEvt) => e.key === "Enter" || e.key === "Backspace" || quantityKey({ q: "factor" }, buf, e.key) });
  const k = (key: string): KeyEvt => ({ key, code: /^[0-9]$/.test(key) ? `Digit${key}` : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : key, shift: false, ctrl: false, alt: false });
  it("S（键盘起手）→ Z = 锁 Z → 0 = 打数 → 回车 = 打数层收（编辑器当「定」）", () => {
    const z = resolveKey(typing(""), k("z")); eq(z && z !== "swallow" ? z.action : null, "lock.key:z");
    const zero = resolveKey(typing(""), k("0")); eq(zero && zero !== "swallow" ? zero.action : null, "gesture.type");
    const en = resolveKey(typing("0"), k("Enter")); eq(en && en !== "swallow" ? en.action : null, "gesture.type");
  });
  it("单位字只在有数之后进（长度：先打 1 再打 m；空的时候 m = 照旧是别的键）；退格不漏到下层的「删除选区」", () => {
    eq(quantityKey({ q: "length" }, "", "m"), false); eq(quantityKey({ q: "length" }, "1.5", "m"), true); eq(quantityKey({ q: "length" }, "1", "z"), false);
    const bs = resolveKey(typing(""), k("Backspace")); eq(bs && bs !== "swallow" ? bs.action : null, "gesture.type");
  });
  it("读法 = 单位文本框同一个 parseQuantity：倍数 0 / 50%、角度 -45°、长度 1.5cm / 3'6\"", () => {
    eq(parseQuantity("0", { q: "factor" }), 0); eq(parseQuantity("50%", { q: "factor" }), 0.5);
    eq(Math.abs((parseQuantity("-45°", { q: "angle" }) as number) + Math.PI / 4) < 1e-12, true);
    eq(Math.abs((parseQuantity("1.5cm", { q: "length" }) as number) - 0.015) < 1e-12, true);
    eq(Math.abs((parseQuantity("3'6\"", { q: "length" }) as number) - 1.0668) < 1e-9, true);
  });
});
