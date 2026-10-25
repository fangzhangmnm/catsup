// body-kind.ts —— 定义的「身体」种类（0.13 编辑模式纪元 刀 ①，门 1；user 2026-10-24「多表示并存、不自动互转……这个建议现在就接好」
// 「组件不是一个sketchup的内部结构，而是catsup的管理方法，一个组件里面可以有brep，也可以有别的」）。
// 对象层 = definition（名字 / 实例 / 以后的锁与元数据），内容层 = body：brep = 肥皂膜内核的平面 B-rep（根上的散几何汤 + group 分区 + 参考几何 + 材质槽；
// 现在唯一有实现的种类）。card（参考人卡片）2026-10-24 深夜 sunset（user「猫娘的本质那篇稿子你看过了应该知道cardbody需要sunset」「拆」）：猫娘 = 验证实体（以后的 Entity 子类），参考图 = 另一个独立 SSoT（不朝相机、不 billboard），都是一张图但逻辑上是两种东西；ImageAsset 留给贴图。
// 规矩：各种身体并存、显式互转（用户动作）、不自动 fallback；op / 渲染 / 格式按 kind 派发，加新种类 = 加一个实现，不改既有的。
// created 2026-10-24 by Claude Fable 5.1
// mesh = Blender 式有向多边形网（user 2026-10-24 拍板命名 `mesh` / 「网格」；默认剔背面；显式与 brep 互转；以后做）。
export type BodyKind = "brep" | "mesh";
export const BODY_KINDS: readonly BodyKind[] = ["brep", "mesh"];
export const isBodyKind = (x: unknown): x is BodyKind => typeof x === "string" && (BODY_KINDS as readonly string[]).includes(x);
