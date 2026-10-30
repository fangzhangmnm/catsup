// 再点一下拿着的工具 = 换到另一种做法（controller/second-mode.ts；created 2026-10-30 by Claude Opus 5.5）。
// user 10-30「brep多次点击推拉按钮能不能切换模式就是两种ctrl模式？……也许icon上面要有区分披露」「2同意 然后shift ctrl是模式切换覆盖，就是可以换回来？」。
import { describe, it, eq, assert } from "./runner.mjs";
import { SECOND_MODES, flippedValue, onSecond, secondModeOf } from "../src/controller/second-mode.ts";
import { TOOL_OPTIONS, ToolConfig } from "../src/editor/tool-config.ts";
import { FreeformMode } from "../src/editor/modes/freeform.ts";
import { GeometryMode } from "../src/editor/modes/geometry.ts";
import { VerifyMode } from "../src/editor/modes/verify.ts";
import type { Tool } from "../src/editor/tool-ids.ts";

const MODES: Record<string, { tools: readonly Tool[] }> = { freeform: new FreeformMode(), geometry: new GeometryMode(), verify: new VerifyMode() };

describe("再点切做法（second-mode.ts）", () => {
  it("表里每一行：工作台真有这把工具；切的选项在选项表里、只有两档（或是开关）、另一种做法是它真有的一档；换工具的目标在那个工作台里", () => {
    for (const [tool, rows] of Object.entries(SECOND_MODES) as [Tool, NonNullable<(typeof SECOND_MODES)[Tool]>][]) {
      for (const sm of rows) for (const m of sm.modes) {
        assert(MODES[m]?.tools.includes(tool), `${m} 没有工具 ${tool}`);
        if (sm.kind === "swap") { assert(MODES[m].tools.includes(sm.to), `${m} 没有 ${sm.to}`); continue; }
        const def = (TOOL_OPTIONS as unknown as Record<string, Record<string, { kind: string; values?: { id: string }[]; modes?: string[] }>>)[tool]?.[sm.key];
        assert(!!def, `${tool}.${sm.key} 不在选项表里`);
        assert(!def.modes || def.modes.includes(m), `${tool}.${sm.key} 在 ${m} 不露`);
        if (sm.alt === true) eq(def.kind, "bool", `${tool}.${sm.key} 是开关`);
        else { eq(def.kind, "enum"); eq(def.values!.length, 2, `${tool}.${sm.key} 只有两档`); assert(def.values!.some((v) => v.id === sm.alt), `${tool}.${sm.key} 没有 ${sm.alt}`); }
        assert([...sm.badge].length === 1, `${tool} 角标一个字`);
      }
    }
  });
  it("切一下 = 到另一种做法，再切 = 回来；开关取反", () => {
    const pp = secondModeOf("pp", "geometry")!;
    assert(pp.kind === "option");
    if (pp.kind !== "option") return;
    const vals = TOOL_OPTIONS.pp.mode.values;
    eq(flippedValue(pp, "heal", vals), "ring"); eq(flippedValue(pp, "ring", vals), "heal");
    assert(onSecond(pp, "ring") && !onSecond(pp, "heal"));
    const mv = secondModeOf("move", "geometry")!;
    if (mv.kind === "option") { eq(flippedValue(mv, false), true); eq(flippedValue(mv, true), false); }
    eq(secondModeOf("pp", "freeform"), null, "自由建模的挤出没有加边");
    eq(secondModeOf("paint", "surface"), null, "三档以上的不轮换");
  });
  it("两档选项：按住修饰键 = 换到另一档（选项在另一档时按住就换回来）；三档以上 = 按住哪个就是哪一档", () => {
    const cfg = new ToolConfig(TOOL_OPTIONS);
    eq(cfg.effective("pp", "mode", { ctrl: true, shift: false }), "ring");
    cfg.set("pp", "mode", "ring");
    eq(cfg.effective("pp", "mode", { ctrl: false, shift: false }), "ring");
    eq(cfg.effective("pp", "mode", { ctrl: true, shift: false }), "heal", "加边时按住 Ctrl = 临时换回接着长");
  });
});
