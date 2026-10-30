// editor/object-tree.ts —— 层级（场景树）：场景 → 一棵物件树，这一行「藏 / 显」的指令，你现在在哪一层。纯函数（零 DOM，node 直测）。
// created 2026-10-30 by Claude Opus 5.5 · 0.18 物品栏纪元 I1（设计稿 ai-docs/20261030-inventory-design.md §2 / §9.2；
// user 10-30「hierarchy就是有小三角有小眼睛的。右键或者点...就是物品按钮」「没有赋予名字的全用四位hash这种。而不是递增数列。然后可以淡化」）。
// · 一行 = 一个物件（组件实例）；**组不进树**（user 10-24「组永远不进hierarchy，是brep的内部矛盾」「组不是物体层级，只是brep模式下面方便编辑的分组拆组」）：
//   放在组里的物件直接挂在它所在的那个物件下面；组只在路径里当「怎么走进去」（编辑器选它得先进到它挂的那个组）。从最外层往下（设计稿 §8-③）。
// · 物件展开 = 它那个组件定义里的物件：同一个定义摆了几份，每份底下都一样（改一份 = 改全部，SketchUp 同款）。
// · 路径 path = 从最外层一路「进哪个」（含途经的组），最后一个是这一行自己：选中它 = 进到 path 去掉最后一个的那一层、再选它；双击 = 进到 path 那一层。
// · 名字：实例自己的名字，没有就用组件定义的名字；名字正好是四位十六进制码 = 没起名 → 界面淡色等宽。
import type { DefId, EditContext, GroupId, InstId, Scene } from "../scene/scene.ts";
import type { Op } from "./ops.ts";

export type HierPick = { kind: "group"; group: GroupId } | { kind: "instance"; instance: InstId };
export interface HierNode {
  /** 键 = 一路的物件编号（「i3/i7」；最外层 = ""；组不进键，挪进挪出组展开状态不丢）。 */
  readonly key: string;
  readonly kind: "root" | "instance";
  readonly label: string;
  /** 名字是四位十六进制码（没起名）→ 淡色等宽。 */
  readonly unnamed: boolean;
  readonly path: readonly HierPick[];
  /** 这一行住在哪个组件定义里（藏 / 显的指令打在这里）。 */
  readonly def: DefId;
  readonly hidden: boolean;
  readonly locked: boolean;
  readonly children: readonly HierNode[];
}

/** 家族约定的四位码（WeebPaint / MoonSinger / CatsUp 默认名 `yyyymmdd-hex4` 里那四位）：名字正好是它 = 没起名。 */
export const isHex4 = (s: string): boolean => /^[0-9a-f]{4}$/.test(s);
export const pickKey = (p: HierPick): string => (p.kind === "group" ? `g${p.group}` : `i${p.instance}`);
export const pathKey = (path: readonly HierPick[]): string => path.filter((p) => p.kind === "instance").map(pickKey).join("/");

const MAX_DEPTH = 32;   // 防组件互相装（不该发生）时无限展开

/** 定义 def 里的组链（从顶到 g）。 */
function groupsOf(scene: Scene, def: DefId, g: GroupId | null): HierPick[] { const c: HierPick[] = []; let guard = MAX_DEPTH; while (g !== null && guard-- > 0) { c.unshift({ kind: "group", group: g }); g = scene.group({ def, group: g }).parent; } return c; }

/** 定义 def 里所有物件（不管挂在哪个组），各自的路径 = 前缀 + 途经的组 + 它自己。 */
function objectChildren(scene: Scene, def: DefId, path: readonly HierPick[], depth: number): HierNode[] {
  if (depth > MAX_DEPTH) return [];
  return [...scene.def(def).instances.values()].map((inst) => {
    const p = [...path, ...groupsOf(scene, def, inst.parent), { kind: "instance" as const, instance: inst.id }], label = inst.name ?? scene.def(inst.def).name;
    return { key: pathKey(p), kind: "instance" as const, label, unnamed: isHex4(label), path: p, def, hidden: !!inst.hidden, locked: !!inst.locked, children: objectChildren(scene, inst.def, p, depth + 1) };
  });
}

/** 整棵树（最外层是根那一行）。 */
export function hierarchyTree(scene: Scene): HierNode {
  const root = scene.root;
  return { key: "", kind: "root", label: "根", unnamed: false, path: [], def: root, hidden: false, locked: false, children: objectChildren(scene, root, [], 0) };
}

/** 你现在在哪一层 → 路径（实例链上每个实例前面补上它挂的组链，最后补当前组的链）。 */
export function contextPath(scene: Scene, ctx: EditContext): HierPick[] {
  const out: HierPick[] = [];
  let def = scene.root;
  for (const iid of ctx.chain) { const inst = scene.instance(def, iid); out.push(...groupsOf(scene, def, inst.parent), { kind: "instance", instance: iid }); def = inst.def; }
  out.push(...groupsOf(scene, def, ctx.group));
  return out;
}

/** 这一行「藏 / 显」（on = 藏）的指令：实例的藏标记（藏这一份连同里面的一切，DT49）。一条指令 = 一步撤销；已经是这样了 = null。 */
export function setHiddenOp(scene: Scene, node: HierNode, on: boolean): Op | null {
  const last = node.path[node.path.length - 1];
  if (!last || last.kind !== "instance") return null;
  const inst = scene.instance(node.def, last.instance);
  return !!inst.hidden === on ? null : { op: "setHidden", at: { def: node.def, group: inst.parent }, instance: inst.id, on };
}
