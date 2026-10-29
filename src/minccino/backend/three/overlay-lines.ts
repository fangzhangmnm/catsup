// minccino/backend/three/overlay-lines.ts —— 叠加层线段族的 three 画法：每个样式一份 LineMaterial（按 LINE_STYLES 声明顺序创建）、每个 item 一个
// LineSegments2；key 没变不重建几何；这一帧没给的 item 藏起来。created 2026-10-29 by Claude Fable 5.1（步 6a）
import * as THREE from "three";
import { LineSegments2 } from "../../../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../../../vendor/three/addons/lines/LineSegmentsGeometry.js";
import { LINE_STYLES, type LineStyle, type LineStyleId, type OverlayLines } from "../../overlay/index.ts";

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

export class OverlayLinesDrawer {
  private mats = new Map<LineStyleId, any>();
  private objs = new Map<string, { obj: any; key: string; style: LineStyleId }>();
  constructor(private readonly scene: any, lineMat: LineMatFactory) {
    for (const [id, st] of Object.entries(LINE_STYLES) as [LineStyleId, LineStyle][]) {
      const m = lineMat(st.widthPx, { offset: st.offset, vertexColors: st.vertexColors });
      m.depthTest = st.depthTest; m.depthWrite = st.depthWrite;
      if (st.transparent !== undefined) m.transparent = st.transparent;
      if (st.opacity !== undefined) m.opacity = st.opacity;
      this.mats.set(id, m);
    }
  }
  /** 探针：这个 id 的线这一帧画着没有（探针别摸 three 对象，摸契约 id）。 */
  isVisible(id: string): boolean { return !!this.objs.get(id)?.obj.visible; }
  /** 某个样式的材质（断口小垂线的线宽每帧跟边线宽走）。 */
  material(id: LineStyleId): any { return this.mats.get(id); }
  sync(items: readonly OverlayLines[]): void {
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.id);
      let e = this.objs.get(it.id);
      if (!e || e.style !== it.style) {
        if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); }
        const obj = new LineSegments2(new LineSegmentsGeometry(), this.mats.get(it.style));
        obj.frustumCulled = false; obj.visible = false; obj.renderOrder = LINE_STYLES[it.style].renderOrder;
        this.scene.add(obj);
        e = { obj, key: "\u0000", style: it.style };
        this.objs.set(it.id, e);
      }
      if (e.key !== it.key) { e.key = it.key; setLineGeometry(e.obj, it.positions, it.colors); }
      if (it.color !== undefined) e.obj.material.color.setHex(it.color);
      e.obj.visible = true;
    }
    for (const [id, e] of this.objs) if (!seen.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
  }
}
