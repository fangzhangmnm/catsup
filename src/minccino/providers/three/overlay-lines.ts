// minccino/backend/three/overlay-lines.ts —— 叠加层线段族的 three 画法：材质按 item 自带的画法参数（线宽 / 深度模式 / 透明度 / 是否每顶点色）**按需建、按参数复用**；
// 每个 item 一个 LineSegments2；key 没变不重建几何；这一帧没给的 item 藏起来。created 2026-10-29 by Claude Fable 5.1（步 6a；刀 a 去样式表）
import * as THREE from "three";
import { LineSegments2 } from "../../../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../../../vendor/three/addons/lines/LineSegmentsGeometry.js";
import type { OverlayLines } from "../../overlay/index.ts";

/** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起 / 止顶点色，线性空间）或 null。 */
export function setLineGeometry(obj: any, pos: readonly number[], col: readonly number[] | null): void {
  const old = obj.geometry;
  const geo = new LineSegmentsGeometry();
  geo.setPositions(pos as number[]);
  if (col) geo.setColors(col as number[]);
  obj.geometry = geo;
  old.dispose();
}

export type LineMatFactory = (px: number, opts: { offset?: boolean; vertexColors?: boolean }) => any;
/** `shared: "edge"` 的材质由后端给（每次 sync 都问一遍——X 光开关会换材质）。 */
export type SharedLineMats = { edge?: () => any };

const matKey = (it: OverlayLines): string => `${it.widthPx}|${it.depth}|${it.alpha ?? 1}|${it.colors ? 1 : 0}|${it.depthWrite ?? "-"}`;

export class OverlayLinesDrawer {
  private mats = new Map<string, any>();
  private edgeWidthMats: any[] = [];
  private objs = new Map<string, { obj: any; key: string; mat: string }>();
  constructor(private readonly scene: any, private readonly lineMat: LineMatFactory, private readonly shared: SharedLineMats = {}) {}
  /** 探针：这个 id 的线这一帧画着没有（探针别摸 three 对象，摸契约 id）。 */
  isVisible(id: string): boolean { return !!this.objs.get(id)?.obj.visible; }
  /** `widthPx: "edge"` 的材质每帧跟边线宽走（设备像素；render3 syncLineScale 调）。 */
  edgeWidth(linewidth: number): void { for (const m of this.edgeWidthMats) m.linewidth = linewidth; }
  private materialFor(it: OverlayLines): any {
    const k = matKey(it);
    let m = this.mats.get(k);
    if (m) return m;
    const visible = it.depth === "visible";
    m = this.lineMat(it.widthPx === "edge" ? 1 : it.widthPx, { offset: visible, vertexColors: !!it.colors });
    m.depthTest = it.depth !== "through";
    m.depthWrite = it.depthWrite ?? visible;
    if (it.depth === "hidden") m.depthFunc = THREE.GreaterDepth;
    if (it.alpha !== undefined && it.alpha < 1) { m.transparent = true; m.opacity = it.alpha; }
    if (it.widthPx === "edge") this.edgeWidthMats.push(m);
    this.mats.set(k, m);
    return m;
  }
  sync(items: readonly OverlayLines[]): void {
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.id);
      const sm = it.shared ? this.shared[it.shared] : undefined, mk = sm ? `shared:${it.shared}` : matKey(it), mat = sm ? sm() : this.materialFor(it);
      let e = this.objs.get(it.id);
      if (!e || e.mat !== mk) {
        if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); }
        const obj = new LineSegments2(new LineSegmentsGeometry(), mat);
        obj.frustumCulled = false; obj.visible = false;
        this.scene.add(obj);
        e = { obj, key: "\u0000", mat: mk };
        this.objs.set(it.id, e);
      }
      e.obj.renderOrder = it.layer ?? 0;
      if (sm) e.obj.material = mat;   // 共享材质每帧跟后端走
      if (e.key !== it.key) { e.key = it.key; setLineGeometry(e.obj, it.positions, it.colors); }
      if (it.color !== undefined) e.obj.material.color.setHex(it.color);
      e.obj.visible = true;
    }
    for (const [id, e] of this.objs) if (!seen.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
  }
}
