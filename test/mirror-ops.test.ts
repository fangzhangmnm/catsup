// 镜像不变量的分类表守卫（撤销 / 镜像护栏审计 F-113，2026-10-28 晚 Claude Fable 5.1）：
// ① ops.ts 里每条 mesh* op 都在 mirror-ops.ts 的分类表里、表里没有多余的；② 注册表里每个路由到网格体指令的动作都在「改拓扑」或「直接做」两张表之一；
// ③ editor.ts 不再手写那三张集合（只准从分类表取）。新加 op / 动作忘了登记 = 这里红。
import { describe, it, eq, assert } from "./runner.mjs";
import { MIRROR_OP_CLASS, MIRROR_PASS_ACTIONS, MIRROR_TOPO_ACTIONS } from "../src/mesh/mirror-ops.ts";
import { allActions, routesOf } from "../src/editor/commands/registry.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = (p: string): string => fs.readFileSync(url.fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("镜像分类表（mesh/mirror-ops.ts）", () => {
  it("ops.ts 的每条 mesh* op 都登记了类、表里没有多余的", () => {
    const names = new Set([...src("../src/editor/ops.ts").matchAll(/\{ op: "(mesh[A-Za-z]+)"/g)].map((m) => m[1]));
    assert(names.size >= 15, `ops.ts 里找到的 mesh op 太少（${names.size}），正则可能过期`);
    const keys = new Set(Object.keys(MIRROR_OP_CLASS));
    eq([...names].filter((n) => !keys.has(n)).join(","), "", "没登记的 op");
    eq([...keys].filter((k) => !names.has(k)).join(","), "", "表里多出来的（ops.ts 已经没有这条 op）");
  });
  it("注册表里每个路由到网格体指令的动作，都在「改拓扑」或「直接做」之一（且不重复）", () => {
    const meshActs = allActions().filter((a) => routesOf(a).some((r) => r.kind === "mesh")).map((a) => a.id);
    assert(meshActs.length >= 10, `注册表里网格体动作太少（${meshActs.length}）`);
    eq(meshActs.filter((id) => !MIRROR_TOPO_ACTIONS.has(id) && !MIRROR_PASS_ACTIONS.has(id)).join(","), "", "没登记的动作");
    eq([...MIRROR_TOPO_ACTIONS].filter((id) => MIRROR_PASS_ACTIONS.has(id)).join(","), "", "两张表都在");
    const known = new Set(allActions().map((a) => a.id));
    eq([...MIRROR_TOPO_ACTIONS, ...MIRROR_PASS_ACTIONS].filter((id) => !known.has(id)).join(","), "", "表里有注册表没有的动作");
  });
  it("editor.ts 只从分类表取集合，不再手写", () => {
    const ed = src("../src/editor/editor.ts");
    assert(/MIRROR_TOPO = new Set<Op\["op"\]>\(opsOfClass\("topo"\)\)/.test(ed), "MIRROR_TOPO 要从 opsOfClass(\"topo\") 取");
    assert(/NO_SYMMETRIZE = new Set<Op\["op"\]>\(opsOfClass\("meta"\)\)/.test(ed), "NO_SYMMETRIZE 要从 opsOfClass(\"meta\") 取");
    assert(!/MIRROR_TOPO_ACTIONS = new Set\(\[/.test(ed), "MIRROR_TOPO_ACTIONS 不许在 editor.ts 手写");
  });
});
