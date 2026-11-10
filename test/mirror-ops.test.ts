// 镜像不变量的分类表守卫（撤销 / 镜像护栏审计 F-113，2026-10-28 晚 Claude Fable 5.1）：
// ① ops.ts 里每条 mesh* op 都在 mirror-ops.ts 的分类表里、表里没有多余的；② 注册表里每个路由到网格体指令的动作都在「改拓扑」或「直接做」两张表之一；
// ③ editor.ts 不再手写那三张集合（只准从分类表取）。新加 op / 动作忘了登记 = 这里红。
import { describe, it, eq, assert } from "./runner.mjs";
import { MIRROR_OP_CLASS, MIRROR_PASS_ACTIONS, MIRROR_TOPO_ACTIONS } from "../src/mesh/mirror-ops.ts";
import { allActions, routesOf } from "../src/editor/commands/registry.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = (p: string): string => fs.readFileSync(url.fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("镜像分类表（mesh/mirror-ops.ts）", () => {
  it("ops.ts 里碰网格内核的每条 op 都登记了类（mesh* 全部 + applyOp 里碰网格体的那些），表里没有多余的", () => {
    // 2026-11-09（计划书 20261109-audit-fixes-plan §3 第 2 层）：登记范围从「名字以 mesh 开头」扩到「applyOp 里碰到网格内核的每一条」——粘贴 / 合并 / 炸开 / 分离以前漏了。
    // 判「碰网格内核」= applyOp 里那条 case 的正文（截到下一条 case）出现 meshOf( / .mesh( / === "mesh" / appendMesh( / explodeInstance( / explodeAcrossKinds(；插件指令（修复）的正文在各自模块里，显式列。
    const ops = src("../src/editor/ops.ts"), all = new Set([...ops.matchAll(/\{ op: "([A-Za-z]+)"/g)].map((m) => m[1]));
    const mesh = new Set([...all].filter((n) => n.startsWith("mesh")));
    assert(mesh.size >= 15, `ops.ts 里找到的 mesh op 太少（${mesh.size}），正则可能过期`);
    const body = ops.slice(ops.indexOf("export function applyOp")), touching = new Set<string>(["plugin"]);
    for (const m of body.matchAll(/\n    case "([A-Za-z]+)":([\s\S]*?)(?=\n    case "|\n    default:|\n  \}\n)/g)) if (/meshOf\(|\.mesh\(|=== "mesh"|appendMesh\(|explodeInstance\(|explodeAcrossKinds\(/.test(m[2])) touching.add(m[1]);
    for (const n of ["paste", "mergeObject", "explode", "separateObject"]) assert(touching.has(n), `${n} 应该被判成碰网格内核（启发式过期了？）`);
    const keys = new Set(Object.keys(MIRROR_OP_CLASS));
    eq([...mesh, ...touching].filter((n) => !keys.has(n)).join(","), "", "碰网格内核却没登记的 op（它在强行对称 / 镜像编辑下归哪一类？）");
    eq([...keys].filter((k) => !all.has(k)).join(","), "", "表里多出来的（ops.ts 已经没有这条 op）");
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
    assert(/META = new Set<string>\(opsOfClass\("meta"\)\)/.test(src("../src/editor/mirror-force.ts")), "强行对称的「不对称化」集合要从 opsOfClass(\"meta\") 取（2026-11-09 起住 editor/mirror-force.ts）");
    assert(!/NO_SYMMETRIZE = new Set/.test(ed), "editor.ts 不再自己造「不对称化」集合（编排搬去 mirror-force.ts 了）");
    assert(!/MIRROR_TOPO_ACTIONS = new Set\(\[/.test(ed), "MIRROR_TOPO_ACTIONS 不许在 editor.ts 手写");
  });
});
