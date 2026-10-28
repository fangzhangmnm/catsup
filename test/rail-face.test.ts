// 左柱按上下文换脸（controller/rail-face.ts；created 2026-10-28 by Claude Opus 5.5；家族周账 F-121）。
// user 10-28 晚「有选区的时候删除的tool能变成小垃圾桶然后点了直接删吗。然后这个context sensitive left bar/tool icon做一下深模块窄接口」。
import { describe, it, eq, assert } from "./runner.mjs";
import { RAIL_FACES, railFace } from "../src/controller/rail-face.ts";
import { ALL_LAYERS } from "../src/controller/keymap.ts";
import { FreeformMode } from "../src/editor/modes/freeform.ts";
import { GeometryMode } from "../src/editor/modes/geometry.ts";

const MODES = { freeform: new FreeformMode(), geometry: new GeometryMode() } as const;
const UNDOABLE = new Set(["delete"]);   // 换脸只许放一步能撤销的动作（新加一张脸 = 先确认它能撤销，再进这张名单）

describe("左柱换脸（rail-face.ts）", () => {
  it("自由建模的删除：有选区 = 垃圾桶、点 = delete；没选区 = 平常的删除工具；手势中不变脸", () => {
    const f = railFace("erase", { mode: "freeform", hasSelection: true, gesture: false });
    eq(f?.icon, "trash-can"); eq(f?.action, "delete"); assert(!!f && /删/.test(f.label) && /撤销/.test(f.tip));
    eq(railFace("erase", { mode: "freeform", hasSelection: false, gesture: false }), null);
    eq(railFace("erase", { mode: "freeform", hasSelection: true, gesture: true })?.action, "delete", "按下 / 拖的半路不许变脸");
    eq(railFace("erase", { mode: "geometry", hasSelection: true, gesture: false }), null, "硬表面的橡皮没登记，不换");
  });
  it("每张脸：工具在那个工作台里、动作 id 是键表里有的动作（和真按键同一条）、动作能撤销、图标 / 字 / 提示都写了", () => {
    const actions = new Set(ALL_LAYERS.flatMap((L) => L.bindings.map((b) => b.action)));
    for (const r of RAIL_FACES) {
      for (const m of r.modes) assert((MODES as Record<string, { tools: readonly string[] }>)[m]?.tools.includes(r.tool), `${m} 里没有 ${r.tool}`);
      assert(actions.has(r.face.action), `动作 ${r.face.action} 键表里没有`);
      assert(UNDOABLE.has(r.face.action), `动作 ${r.face.action} 没确认能撤销`);
      assert(!!(r.face.icon && r.face.label && r.face.tip), "脸要写全");
    }
  });
  it("左柱只在一处读它：main.ts 的按钮构造先问 railFace", async () => {
    const fs = (await import("node:fs" as string)) as { readFileSync(p: URL, enc: string): string };
    const main = fs.readFileSync(new URL("../src/app/main.ts", import.meta.url), "utf8");
    assert(/const mkToolBtn[\s\S]{0,400}railFace\(/.test(main), "mkToolBtn 不再先问 railFace");
    eq((main.match(/railFace\(/g) ?? []).length, 1, "railFace 只该在按钮构造那一处调");
  });
});
