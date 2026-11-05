// 输入闸（controller/input-gate.ts）的规则表：谁拥有输入、这一下放不放、门口吞不吞、Esc 给谁、模型此刻能不能改。created 2026-11-05 by Claude Opus 5.5
// 设计 = ai-docs/20261105-input-gate-design.md。DOM 一道门和各消费者的自检在探针 test/probes/probe-input-gate.mjs。
import { describe, it, eq, assert } from "./runner.mjs";
import { createInputGate, type FaceEntry, type InputGate, type Source } from "../src/controller/input-gate.ts";

const SOURCES: readonly Source[] = ["key", "pointer", "wheel", "touch", "xr"];
const admitted = (g: InputGate): string => SOURCES.filter((s) => g.admits(s)).join(",");
/** 一个可以拨的面：up 是声明式的，拨 on 就是开关，闸手里没有任何「开了 / 关了」的账。 */
const mk = (g: InputGate, o: Partial<FaceEntry> & Pick<FaceEntry, "kind" | "rank">): { on: boolean; closes: number; off(): void } => {
  const st = { on: true, closes: 0, off: (): void => {} };
  st.off = g.face({ label: o.kind, up: () => st.on, ...o });
  return st;
};
const nowhere = (): boolean => false;

describe("输入闸：谁拥有输入", () => {
  it("名册空 / 都关着：主人 = 场景，什么都放行", () => {
    const g = createInputGate();
    eq(g.owner(), "scene");
    eq(admitted(g), SOURCES.join(","));
    const f = mk(g, { kind: "face", rank: 500 }); f.on = false;
    eq(g.owner(), "scene");
    eq(admitted(g), SOURCES.join(","));
  });
  it("模态面开着：键盘 / 指针 / 滚轮 / 触屏 / 头显全不放", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 500 });
    eq(g.owner(), "face");
    eq(admitted(g), "");
  });
  it("菜单、文本框、参考窗：只拿走键盘，指针照走（外点关菜单、点画布移开焦点都要过得去）", () => {
    for (const kind of ["menu", "text", "refwin"] as const) {
      const g = createInputGate();
      mk(g, { kind, rank: 300 });
      eq(g.owner(), kind);
      assert(!g.admits("key"), `${kind}：键盘不放`);
      eq(SOURCES.filter((s) => s !== "key" && g.admits(s)).length, 4, `${kind}：其余放行`);
    }
  });
  it("模态面压在下面、上面开着菜单：还是全不放（模态在名册里任何位置都算）", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 250 });
    mk(g, { kind: "menu", rank: 300 });
    eq(g.owner(), "menu", "最上面是菜单");
    eq(admitted(g), "", "但下面有模态");
  });
  it("主人 = 开着的面里 rank 最高的，和登记先后无关", () => {
    const g = createInputGate();
    const a = mk(g, { kind: "text", rank: 10 }), b = mk(g, { kind: "face", rank: 700 }), c = mk(g, { kind: "menu", rank: 300 });
    eq(g.owner(), "face");
    b.on = false; eq(g.owner(), "menu");
    c.on = false; eq(g.owner(), "text");
    a.on = false; eq(g.owner(), "scene");
  });
  it("不会漏注销卡死键盘：面自己关了（比如直接 hidden = true），闸当场知道", () => {
    const g = createInputGate();
    const f = mk(g, { kind: "face", rank: 500 });
    assert(!g.admits("key"));
    f.on = false;
    assert(g.admits("key"), "没人调过任何释放");
  });
  it("退名册后不再算", () => {
    const g = createInputGate();
    const f = mk(g, { kind: "face", rank: 500 });
    f.off();
    eq(g.owner(), "scene");
    f.off();   // 退两次不炸
  });
});

describe("输入闸：门口吞不吞（第一层）", () => {
  const inside = (want: string) => (root: unknown): boolean => root === want;
  it("有 root 的模态面开着：目标不在任何开着的面里 = 吞；在里面 = 放", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 500, root: "#sheet" });
    for (const s of SOURCES) assert(g.blocks(s, nowhere), `外面的 ${s} 吞`);
    assert(!g.blocks("key", inside("#sheet")), "面里面的键放");
    assert(!g.blocks("pointer", inside("#sheet")), "面里面的按下放");
  });
  it("从面上开出来的菜单：目标在菜单里也算里面", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 500, root: "#sheet" });
    mk(g, { kind: "menu", rank: 510, root: ".popup-menu" });
    assert(!g.blocks("pointer", inside(".popup-menu")));
  });
  it("叠着的两张面：目标在哪一张都放（闸门上面叠冲突面）", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 450, root: "#syncGate" });
    mk(g, { kind: "face", rank: 500, root: "#sheet" });
    assert(!g.blocks("pointer", inside("#syncGate")));
    assert(!g.blocks("pointer", inside("#sheet")));
    assert(g.blocks("pointer", nowhere));
  });
  it("没写 root 的模态面（图库：自己有菜单带、通知在它上面）：门口不吞，但也不放进场景", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 250 });
    for (const s of SOURCES) { assert(!g.blocks(s, nowhere), `${s} 不吞`); assert(!g.admits(s), `${s} 不放`); }
  });
  it("菜单开着：外面的键盘吞（user 11-05「吞掉」），外面的指针不吞（给外点关菜单）", () => {
    const g = createInputGate();
    mk(g, { kind: "menu", rank: 300, root: ".popup-menu" });
    assert(g.blocks("key", nowhere), "键吞");
    assert(!g.blocks("pointer", nowhere), "指针不吞");
    assert(!g.blocks("wheel", nowhere), "滚轮不吞");
    assert(!g.blocks("key", inside(".popup-menu")), "菜单里面的键放");
  });
  it("文本框 / 参考窗：门口不吞（键要到它们手里），只是不进场景", () => {
    for (const kind of ["text", "refwin"] as const) {
      const g = createInputGate();
      mk(g, { kind, rank: 10 });
      assert(!g.blocks("key", nowhere), `${kind}`);
      assert(!g.admits("key"), `${kind}`);
    }
  });
  it("什么都没开：不吞", () => {
    const g = createInputGate();
    for (const s of SOURCES) assert(!g.blocks(s, nowhere));
  });
});

describe("输入闸：Esc 给谁", () => {
  it("给最上面肯接的那个，下面的不动（菜单盖在图库上：只关菜单）", () => {
    const g = createInputGate();
    let menu = 0, lower = 0;
    const m = mk(g, { kind: "menu", rank: 300, root: ".popup-menu", esc: () => { menu++; m.on = false; return true; } });
    mk(g, { kind: "face", rank: 100, root: "#low", esc: () => { lower++; return true; } });
    eq(g.escape(), "handled");
    eq(`${menu}/${lower}`, "1/0");
    eq(g.escape(), "handled");
    eq(`${menu}/${lower}`, "1/1", "菜单关了才轮到下面");
  });
  it("模态面不接 Esc（忙碌 / 没声明 Esc 值的闸门）：吞掉，不许穿到下面", () => {
    const g = createInputGate();
    let lower = 0;
    mk(g, { kind: "face", rank: 700, root: "#busy" });
    mk(g, { kind: "face", rank: 500, root: "#sheet", esc: () => { lower++; return true; } });
    eq(g.escape(), "blocked");
    eq(lower, 0);
  });
  it("esc 返回 false = 这次不接（闸门这一张没声明 Esc 值）：同样吞", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 450, root: "#syncGate", esc: () => false });
    eq(g.escape(), "blocked");
  });
  it("没写 root 的模态面（图库）不拦 Esc：交给它自己的控件", () => {
    const g = createInputGate();
    mk(g, { kind: "face", rank: 250 });
    eq(g.escape(), "none");
  });
  it("文本框 / 参考窗不拦 Esc：控件自己处理（数值框取消、参考窗放焦点）", () => {
    const g = createInputGate();
    mk(g, { kind: "text", rank: 10 });
    mk(g, { kind: "refwin", rank: 20 });
    eq(g.escape(), "none");
  });
  it("什么都没开：none（走编辑器的 Esc）", () => eq(createInputGate().escape(), "none"));
});

describe("输入闸：模型此刻能不能改", () => {
  it("没有理由 = 能改；理由是声明式的，拨回去就没了", () => {
    const g = createInputGate();
    let on = true;
    const off = g.hold({ kind: "asking", why: "先回答弹窗", on: () => on });
    eq(g.held()?.why, "先回答弹窗");
    on = false;
    eq(g.held(), null);
    on = true; off();
    eq(g.held(), null, "退掉了");
  });
  it("演示锁压过正在问，和登记先后无关（锁是文件的状态，程序路径也要拦）", () => {
    for (const order of [["asking", "lock"], ["lock", "asking"]] as const) {
      const g = createInputGate();
      for (const k of order) g.hold({ kind: k, why: k, on: () => true });
      eq(g.held()?.kind, "lock", order.join(">"));
    }
  });
});
