// test/uv-kit.ts —— 测试搭贴图坐标用的小工具（施工单十八第 1½ 刀：贴图坐标 = 网格体的速查表 + 面上的代号 + 角上的坐标，写口只有 scene/uv.ts placeFace）。
// 不叫 .test.ts：测试文件之间不互相 import（test/test-tiers-guard.test.ts）。created 2026-11-13 by Claude Opus 5.5
// 单独的内核（不在场景里）没有身体，这里按内核记一张速查表（只给测试用）；在场景里的网格体用 scene.mesh(def).uvSetSlots。
import type { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { placeFace, uvAt, uvMesh, type UvMesh } from "../src/scene/uv.ts";

const tables = new WeakMap<MeshKernel, string[]>();
/** 这个（测试自己建的）内核的速查表。 */
export function slotsOf(k: MeshKernel): string[] { let s = tables.get(k); if (!s) { s = []; tables.set(k, s); } return s; }
/** 把面 f 放到排法 g 上（坐标 = 角数 × 2，格）。 */
export function placeOn(k: MeshKernel, f: number, g: string, at: ArrayLike<number>): void { placeFace(k, slotsOf(k), f, g, at); }
/** 读坐标的那几块看到的样子。 */
export function uvOf(k: MeshKernel): UvMesh { return uvMesh(k, slotsOf(k)); }
/** 面 f 在排法 g 上的坐标（不在 = null）。 */
export function uvAtOf(k: MeshKernel, f: number, g: string): Float32Array | null { return uvAt(k, slotsOf(k), f, g); }
/** 拷一份内核，连同它的速查表（拷贝上另铺一套不碰原件：一张面只能在一套排法上）。 */
export function cloneUv(k: MeshKernel): MeshKernel { const c = k.clone(); tables.set(c, [...slotsOf(k)]); return c; }
