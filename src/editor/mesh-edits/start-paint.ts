// mesh-edits/start-paint.ts —— 「开始画」（贴图主线 1-7，施工单 ai-docs/20261111-paint-workorders-14.md 第 4 条；2026-11-11 Claude Opus 5.5）。
// 画画工作台里，当前物件还没有画 → 工作台里一颗明着的钮「开始画」：选中了面 = 这些面，没选 = 这个物件全部的面（已经走画的面跳过）。
// 新材质的底色：这些面现在是同一个材质 = 它的颜色，不是 = 白模灰（PALETTE.face）。名字自动起（「画」「画 2」…），不问。
// 走现有的 startPaint 指令（1-3b：开一套贴图坐标 + 一张分层的画 + 一个走画的材质，一步撤销）；新条目的 GUID 写在指令里（家规）。
import type { Command, MeshUnit } from "../commands/command.ts";
import { mintGuid } from "../../format/guid.ts";
import { PALETTE } from "../../minccino/palette.ts";
import type { Scene } from "../../scene/scene.ts";
import { paintPlaceOf } from "../../scene/paint.ts";

const FACE_GREY: [number, number, number] = [((PALETTE.face >> 16) & 255) / 255, ((PALETTE.face >> 8) & 255) / 255, (PALETTE.face & 255) / 255];

/** 开始画时能选的画布边长（2026-11-11 user「我会一直很抠用128 256，但是normie可能是1k起步，或者无脑2k」）。 */
export const CANVAS_SIZES = [128, 256, 512, 1024, 2048] as const;

/** 这一次要开始画的面：选中的面（没选 = 物件全部的面，但物件已经有画了就不算——那时候直接能画），已经走画的面跳过。 */
export function facesToStart(s: Scene, u: Pick<MeshUnit, "def" | "sel">): number[] {
  const body = s.def(u.def).body;
  if (body.kind !== "mesh") return [];
  const k = body.kernel, slots = k.faceMat, painted = (f: number): boolean => s.facePaint(u.def, slots[f]) !== null;
  const picked = u.sel && u.sel.faces.size ? [...u.sel.faces] : body.uvSets.size || k.faces().some(painted) ? [] : k.faces();
  return picked.filter((f) => k.hasF(f) && !painted(f));
}

/** 参数里的画布边长：五档之一，别的 = 1024。 */
const canvasOf = (v: unknown): number => ((CANVAS_SIZES as readonly number[]).includes(Number(v)) ? Number(v) : 1024);

export const startPaint: Command<MeshUnit> = {
  id: "mesh.startPaint", unit: "mesh", title: "开始画",
  defaults: () => ({ canvas: 1024, arrange: "patches" }),   // 界面发出去的永远带这两个（施工单十五）；没给的老入口 = 1024 见方、连成片
  params: () => [],   // 画布边长由「开始画」那张面板选（没有马后炮）
  quickCount: (env, u) => facesToStart(env.scene, u).length,
  plan(env, u, v) {
    const s = env.scene, faces = facesToStart(s, u);
    if (!faces.length) return { ops: [], count: 0 };
    const k = s.mesh(u.def).kernel, mats = new Set(faces.map((f) => s.materialOfSlot(u.def, k.faceMat[f]) ?? null));
    const only = mats.size === 1 ? [...mats][0] : null;
    const color: [number, number, number] = only ? [only.color[0], only.color[1], only.color[2]] : FACE_GREY;
    const taken = new Set([...s.textures.values()].map((t) => t.name)), name = ((): string => { if (!taken.has("画")) return "画"; let i = 2; while (taken.has(`画 ${i}`)) i++; return `画 ${i}`; })();
    return { ops: [{ op: "startPaint", def: u.def, faces, uvSet: mintGuid(), textureGuid: mintGuid(), materialGuid: mintGuid(), names: { uvSet: name, paint: name, material: name }, color, canvas: canvasOf(v.canvas), arrange: v.arrange === "faces" ? "faces" : "patches" }], count: faces.length };
  },
  done: (n) => `开始画了：${n} 张面铺上了一张画，现在用笔在上面画`,
  none: "开始画：这个物件已经有画了，直接用笔画（要给别的面另开一张：先选中那几张面）",
};

/** 这个物件上的画（贴图表里的先后）：每张 = 贴图身份、名字、它的材质在文档材质表里的下标、它那一套坐标（宽高、密度、GUID）。 */
export function paintsOf(s: Scene, def: number): { texture: string; name: string; material: number; uvSet: { guid: string; width: number; height: number; pxPerM: number } }[] {
  const out: ReturnType<typeof paintsOf> = [];
  for (const t of s.textures.values()) {
    if (t.content.kind !== "layered") continue;
    const p = paintPlaceOf(s, t.guid);
    if (!p || p.def !== def) continue;
    const i = s.materials.indexOf(p.material);
    if (i >= 0) out.push({ texture: t.guid, name: t.name, material: i, uvSet: { guid: p.uvSet.guid, width: p.uvSet.width, height: p.uvSet.height, pxPerM: p.uvSet.pxPerM } });
  }
  return out;
}
/** 这个物件上最近建的那张画（贴图表里最后一张走它的）；没有 = null。 */
export function latestPaintOf(s: Scene, def: number): { texture: string; material: number } | null {
  const all = paintsOf(s, def), p = all[all.length - 1];
  return p ? { texture: p.texture, material: p.material } : null;
}
/** 选中的面里还没进画的那几张（物件已经有画时「把这几张面加进来」用；没选 = 没有）。 */
export function unpaintedSelected(s: Scene, u: Pick<MeshUnit, "def" | "sel">): number[] {
  const body = s.def(u.def).body;
  if (body.kind !== "mesh" || !u.sel || !u.sel.faces.size) return [];
  const k = body.kernel;
  return [...u.sel.faces].filter((f) => k.hasF(f) && s.facePaint(u.def, k.faceMat[f]) === null).sort((a, b) => a - b);
}

/**
 * 「加进已有的画」（施工单十五第三节）：物件已经有画、选中的面里有还没进画的 → 给它们换上那张画（参数 texture；缺 = 最近那张）的材质（meshPaintFaces）；
 * 画的维护那一步（paint-upkeep）按那张画布的宽、用那张画自己的密度把它们补铺上（layoutAppend，留的格数跟着画布走）。不问大小。
 */
export const paintAddFaces: Command<MeshUnit> = {
  id: "mesh.paintAddFaces", unit: "mesh", title: "把这几张面加进来",
  defaults: () => ({}),
  params: () => [],
  quickCount: (env, u) => (latestPaintOf(env.scene, u.def) ? unpaintedSelected(env.scene, u).length : 0),
  plan(env, u, v) {
    const all = paintsOf(env.scene, u.def), p = all.find((x) => x.texture === v.texture) ?? all[all.length - 1] ?? null, faces = unpaintedSelected(env.scene, u);
    if (!p || !faces.length) return { ops: [], count: 0 };
    return { ops: [{ op: "meshPaintFaces", def: u.def, faces, material: p.material }], count: faces.length };
  },
  done: (n) => `加进来了：${n} 张面铺进了这张画，现在用笔在上面画`,
  none: "选中的面都已经在画里了",
};
