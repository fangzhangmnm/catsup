// migrate/definitions.ts —— CATSUP_definitions 6.x → 7.0（2026-11-04 身份地基；user「大版本同意」）：条目之间的引用从序号换成 GUID。
// 序号只活到这一步：root / instances[j].definition（定义下标）、groups[j].id + parent、instances[j].id + parent、materialSlots（材质下标）。
// **先去重再铸**：6.x 文件可能有同 id 重复的实例（10-25 以前的 bug）和重复的组（v0.18.27 以前的 bug）。旧读法靠「同 id 后写覆盖先写」自愈；铸完 GUID 它们就成了
//   两条不同的东西，永远合不回去。这里照旧读法的语义：位置留先写的、内容留后写的（编辑永远落在后写的那份上）。
// 坏数据不在这里判：定义下标越界 / 不是对象的条目原样留着，`read.ts` 照旧拒开（报的话和以前一样）。材质下标越界 = null（以前读成 −1 = 默认）。
// 老文件的 GUID 每读一次现铸，存一次才定下来（和根的四位码同一规矩；计划书 §2.10）。同一老文件两台设备各开各铸，只有真存了才算改动，走库的正常冲突面。
// created 2026-11-04 by Claude Opus 5.5
import { mintGuid, type Guid } from "../guid.ts";

export interface MigrationCtx {
  /** 这份文件的材质表：下标 → GUID（材质先于定义读，见 read.ts）。 */
  readonly materialGuids: readonly Guid[];
  /** 指着的东西不在（材质槽的序号越界 / 父组的序号找不到）：按以前的修法照旧当没有，但要记一笔（read.ts 记进 readNotes，打开时说；统筹 11-12 存盘忠实度清点 R1、R2）。 */
  readonly dangling?: (what: "materialSlot" | "parent") => void;
}

const isRec = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** 按旧 id 去重 + 铸 GUID：Map.set 对已有键保留位置、换内容 = 先写的位置、后写的内容。有不是对象的条目 = 不动（read.ts 拒开）。 */
function dedupeById(arr: unknown): { rows: Record<string, unknown>[]; guidOf: Map<number, Guid>; idOf: (r: Record<string, unknown>) => number } | null {
  const raw = Array.isArray(arr) ? arr : [];
  if (!raw.every(isRec)) return null;
  const pos = new Map<Record<string, unknown>, number>();
  raw.forEach((r, i) => pos.set(r as Record<string, unknown>, i));
  const idOf = (r: Record<string, unknown>): number => (typeof r.id === "number" ? r.id : pos.get(r)! + 1);
  const byId = new Map<number, Record<string, unknown>>();
  for (const r of raw as Record<string, unknown>[]) byId.set(idOf(r), r);
  return { rows: [...byId.values()], guidOf: new Map([...byId.keys()].map((id) => [id, mintGuid()])), idOf };
}

export function definitionsV6toV7(j: Record<string, unknown>, ctx?: MigrationCtx): Record<string, unknown> {
  if (!ctx) throw new Error("migrate: CATSUP_definitions v6→v7 needs MigrationCtx.materialGuids (read the material table first; defaulting to an empty table would silently null every material slot)");
  if (!Array.isArray(j.list)) return { ...j, version: 7 };   // read.ts 拒开
  const list = j.list as unknown[];
  const defGuids = list.map(() => mintGuid());
  const defRef = (x: unknown): unknown => (typeof x === "number" && defGuids[x] !== undefined ? defGuids[x] : x);
  const out = list.map((rawDef, di) => {
    if (!isRec(rawDef)) return rawDef;
    const groupsIn = dedupeById(rawDef.groups), instsIn = dedupeById(rawDef.instances);
    const groupRef = (x: unknown): Guid | null => { const g = (typeof x === "number" && groupsIn?.guidOf.get(x)) || null; if (g === null && x !== null && x !== undefined) ctx.dangling?.("parent"); return g; };   // 老文件「没有上一层」= null（样本里全是）
    const groups = groupsIn
      ? groupsIn.rows.map((g) => { const { id: _id, ...rest } = g; void _id; return { ...rest, guid: groupsIn.guidOf.get(groupsIn.idOf(g))!, parent: groupRef(g.parent) }; })
      : rawDef.groups;
    const instances = instsIn
      ? instsIn.rows.map((i) => { const { id: _id, ...rest } = i; void _id; return { ...rest, guid: instsIn.guidOf.get(instsIn.idOf(i))!, definition: defRef(i.definition), parent: groupRef(i.parent) }; })
      : rawDef.instances;
    const materialSlots = (Array.isArray(rawDef.materialSlots) ? rawDef.materialSlots : []).map((m: unknown) => { const g = typeof m === "number" ? (ctx.materialGuids[m] ?? null) : null; if (g === null && m !== null && m !== undefined && !(typeof m === "number" && m < 0)) ctx.dangling?.("materialSlot"); return g; });   // 当年运行时「没有材质」= −1、写盘原样写出去（7e67d318~1 scene-doc.ts）：负数是正常写法、不报；≥ 0 却找不到才是悬空（和写的那头同一个口径）
    return { ...rawDef, guid: defGuids[di], groups, instances, materialSlots };
  });
  return { ...j, version: 7, root: defRef(j.root), list: out };
}
