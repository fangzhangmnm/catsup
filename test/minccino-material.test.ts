// Minccino 材质模块接口（步 8，只钉接口）+ 预算核对（步 7）的单测。created 2026-10-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { BASE_SLOTS, GRADE_SCHOOL_READS, MaterialRegistry, createMaterialRegistry } from "../src/minccino/material/index.ts";
import { checkBudget } from "../src/minccino/budget.ts";

describe("minccino 材质：开放槽表 + 翻译只写一次 + 管线 reads 守卫", () => {
  it("小学四管线读的槽都登记过；槽不是 PBR 的子集（有色阶带 / 墨线 / 纸层 / 包浆 / 描边 / 边发光）", () => {
    const r = createMaterialRegistry();
    for (const p of GRADE_SCHOOL_READS) for (const s of p.reads) assert(!!r.slot(s), `${p.pipeline} 读了没登记的槽 ${s}`);
    const groups = new Set(BASE_SLOTS.map((s) => s.group));
    for (const g of ["pbr", "toneBand", "ink", "paper", "patina", "outline", "glow"]) assert(groups.has(g), `缺槽组 ${g}`);
  });
  it("读了没登记的槽 = 抛；同一槽 / 同一工艺登记两次 = 抛", () => {
    const r = new MaterialRegistry();
    let threw = false; try { r.declareReads({ pipeline: "x", reads: ["nope"] }); } catch { threw = true; } assert(threw, "没抛");
    threw = false; try { r.registerSlot(BASE_SLOTS[0]); } catch { threw = true; } assert(threw, "重复槽没抛");
    r.registerTranslation("base", () => ({}));
    threw = false; try { r.registerTranslation("base", () => ({})); } catch { threw = true; } assert(threw, "重复翻译没抛");
  });
  it("翻译：按工艺顺序套、没写的槽用默认、不认识的工艺报出来不静默", () => {
    const r = createMaterialRegistry();
    const t = r.translate({ channels: { color: [1, 0, 0] }, crafts: ["base", "shadeless", "bronze"] });
    eq(JSON.stringify(t.slots.baseColor), "[1,0,0]"); eq(t.slots.unlit, true); eq(t.slots.roughness, 0.7);
    eq(t.unknown.join(), "bronze");   // 铸铜的翻译 = Opus 的内容，还没登记
    let threw = false; try { r.registerTranslation("bad", () => ({ nope: 1 })); r.translate({ channels: {}, crafts: ["bad"] }); } catch { threw = true; } assert(threw, "翻译写没登记的槽没抛");
  });
});

describe("minccino 预算核对（步 7）", () => {
  it("在预算内 = 不披露；超了 = 说哪几项、给人话", () => {
    const b = { frameMs: 16.7, vramMb: 256, drawCalls: 200 };
    eq(checkBudget({ frameMs: 5, vramMb: 20, drawCalls: 30 }, b).disclose, null);
    const r = checkBudget({ frameMs: 40, vramMb: 20, drawCalls: 300 }, b);
    eq(r.over.join(), "frameMs,drawCalls");
    assert(!!r.disclose && r.disclose.includes("每帧毫秒 40.0 ms / 16.7 ms") && r.disclose.includes("绘制次数 300 / 200"), r.disclose ?? "");
  });
});
