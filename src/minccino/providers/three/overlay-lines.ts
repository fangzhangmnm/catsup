// minccino/backend/three/overlay-lines.ts —— 辅助几何线段族的 three 画法：材质按 item 自带的画法参数（线宽 / 深度模式 / 透明度 / 是否每顶点色）**按需建、按参数复用**；
// 每个 item 一个 LineSegments2；key 没变不重建几何；这一帧没给的 item 藏起来。created 2026-10-29 by Claude Fable 5.1（步 6a；刀 a 去样式表）
// 2026-10-29 Opus 5.5（切刀第 2 步）：没有「叠加层那一遍」了——item 按 stage / resolution 挂到三层之一（主分辨率跟内容 / 主分辨率排在后处理之后 / 原分辨率），
// 缺省 = 跟内容；主分辨率被下采样时（像素那条路），细于 2 格的线换成 1 像素的 GL 线（和模型的边同一条规矩：粗线三角带在小图里会断成虚线）。
import * as THREE from "three";
import { LineSegments2 } from "../../../vendor/three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "../../../vendor/three/addons/lines/LineSegmentsGeometry.js";
import type { OverlayLines } from "../../overlay/index.ts";

/** 线性 → sRGB（小图按 sRGB 原值存：three 往渲染目标里画时普通材质输出线性色、不换回 sRGB，画进小图的颜色要自己换好）。 */
export const linToSrgb = (c: number): number => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
/** 整组一色写到材质上：画进小图 = sRGB 原值（按「线性」存 = 原样写进去）；画到画布 = 照常（three 自己换）。 */
export function setMatColor(m: any, hex: number, srgbOut: boolean): void {
  if (srgbOut) m.color.setRGB(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255, THREE.LinearSRGBColorSpace); else m.color.setHex(hex);
}

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
/** 三层：主分辨率跟内容（stage 0）/ 主分辨率排在后处理之后（stage 1）/ 原分辨率（resolution native）。 */
export type AuxPass = "main" | "late" | "native";
export type AuxLayers = Readonly<Record<AuxPass, number>>;
export const auxPassOf = (it: { stage?: 0 | 1; resolution?: "main" | "native" }): AuxPass => (it.resolution === "native" ? "native" : it.stage === 1 ? "late" : "main");

const matKey = (it: OverlayLines): string => `${it.widthPx}|${it.depth}|${it.alpha ?? 1}|${it.colors ? 1 : 0}|${it.depthWrite ?? "-"}`;
/** 下采样时画成 1 像素线的：细于 2 格（"edge" = 跟线稿走，线稿在像素那条路本来就是 1 像素）。 */
const thin = (it: OverlayLines): boolean => it.widthPx === "edge" || it.widthPx < 2;

interface Entry { obj: any; hair: any | null; key: string; hairKey: string; mat: string; pass: AuxPass; useHair: boolean }

export class OverlayLinesDrawer {
  private mats = new Map<string, any>();
  private hairMats = new Map<string, any>();
  private edgeWidthMats: any[] = [];
  private objs = new Map<string, Entry>();
  /** 每份材质建的时候的线宽（CSS px）：主分辨率被下采样时那一遍按小图像素放大（scaleMain）。 */
  private baseWidth = new Map<any, number>();
  constructor(private readonly scene: any, private readonly lineMat: LineMatFactory, private readonly shared: SharedLineMats, private readonly layers: AuxLayers) {}
  /** 小图那遍：主分辨率的粗线（自己建的材质）线宽 × f（LineSegments2 按画布视口算像素）；f = 1 还原。 */
  scaleMain(f: number): void { for (const e of this.objs.values()) if (e.pass !== "native" && e.obj.visible) { const b = this.baseWidth.get(e.obj.material); if (b !== undefined) e.obj.material.linewidth = b * f; } }
  /** 这一帧有没有画在这一层的线（没有就不画那一遍）。 */
  has(pass: AuxPass): boolean { for (const e of this.objs.values()) if (e.pass === pass && (e.obj.visible || e.hair?.visible)) return true; return false; }
  /** 探针：这一帧画在这一层的 id。 */
  idsIn(pass: AuxPass): string[] { return [...this.objs].filter(([, e]) => e.pass === pass && (e.obj.visible || e.hair?.visible)).map(([id]) => id); }
  /** 探针：这个 id 的线这一帧画着没有 / 画着的那些的键。 */
  isVisible(id: string): boolean { const e = this.objs.get(id); return !!(e?.obj.visible || e?.hair?.visible); }
  keys(): { id: string; key: string }[] { return [...this.objs].filter(([, e]) => e.obj.visible || e.hair?.visible).map(([id, e]) => ({ id, key: e.key })); }
  /** `widthPx: "edge"` 的材质每帧跟边线宽走（设备像素；render3 syncLineScale 调）。 */
  edgeWidth(linewidth: number): void { for (const m of this.edgeWidthMats) m.linewidth = linewidth; }
  private materialFor(it: OverlayLines): any {
    const k = matKey(it);
    let m = this.mats.get(k);
    if (m) return m;
    const visible = it.depth === "visible";
    m = this.lineMat(it.widthPx === "edge" ? 1 : it.widthPx, { offset: visible, vertexColors: !!it.colors });
    this.depthOf(m, it);
    if (it.widthPx === "edge") this.edgeWidthMats.push(m); else this.baseWidth.set(m, it.widthPx);
    this.mats.set(k, m);
    return m;
  }
  /** 1 像素线的材质（同一组深度 / 透明度参数）。 */
  private hairMaterialFor(it: OverlayLines): any {
    const k = `${it.depth}|${it.alpha ?? 1}|${it.colors ? "v" : it.color ?? "-"}|${it.depthWrite ?? "-"}`;   // 整组一色的按颜色分开（材质共用，颜色写在材质上）
    let m = this.hairMats.get(k);
    if (m) return m;
    m = new THREE.LineBasicMaterial({ vertexColors: !!it.colors });
    this.depthOf(m, it);
    this.hairMats.set(k, m);
    return m;
  }
  private depthOf(m: any, it: OverlayLines): void {
    m.depthTest = it.depth !== "through";
    m.depthWrite = it.depthWrite ?? false;   // 辅助几何缺省不写深度（契约）
    if (it.depth === "hidden") m.depthFunc = THREE.GreaterDepth;
    if (it.alpha !== undefined && it.alpha < 1) { m.transparent = true; m.opacity = it.alpha; }
  }
  /** @param pixelated 主分辨率被下采样（像素那条路）：主分辨率的细线换成 1 像素的 GL 线
   *  @param srgbOut 主分辨率画进小图（风格那条路）：颜色按 sRGB 原值写 */
  sync(items: readonly OverlayLines[], pixelated: boolean, srgbOut: boolean): void {
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.id);
      const sm = it.shared ? this.shared[it.shared] : undefined, mk = sm ? `shared:${it.shared}` : matKey(it), mat = sm ? sm() : this.materialFor(it);
      let e = this.objs.get(it.id);
      if (!e || e.mat !== mk) {
        if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); if (e.hair) { this.scene.remove(e.hair); e.hair.geometry.dispose(); } }
        const obj = new LineSegments2(new LineSegmentsGeometry(), mat);
        obj.frustumCulled = false; obj.visible = false;
        this.scene.add(obj);
        e = { obj, hair: null, key: "\u0000", hairKey: "\u0000", mat: mk, pass: "main", useHair: false };
        this.objs.set(it.id, e);
      }
      e.pass = auxPassOf(it);
      e.obj.renderOrder = it.layer ?? 0;
      e.obj.layers.set(this.layers[e.pass]);
      if (sm) e.obj.material = mat;   // 共享材质每帧跟后端走
      const out = srgbOut && e.pass !== "native", gk = `${it.key}|${out ? "s" : "l"}`;
      const cols = it.colors && out ? it.colors.map(linToSrgb) : it.colors;
      if (e.key !== gk) { e.key = gk; setLineGeometry(e.obj, it.positions, cols); }
      e.useHair = pixelated && e.pass !== "native" && thin(it);
      if (e.useHair) {
        if (!e.hair) { e.hair = new THREE.LineSegments(new THREE.BufferGeometry(), this.hairMaterialFor(it)); e.hair.frustumCulled = false; this.scene.add(e.hair); }
        e.hair.material = this.hairMaterialFor(it);
        if (e.hairKey !== gk) {
          e.hairKey = gk;
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
          if (cols) g.setAttribute("color", new THREE.Float32BufferAttribute(cols as number[], 3));
          e.hair.geometry.dispose(); e.hair.geometry = g;
        }
        if (it.color !== undefined) setMatColor(e.hair.material, it.color, out); else if (!it.colors) e.hair.material.color.setHex(0xffffff);
        e.hair.renderOrder = it.layer ?? 0; e.hair.layers.set(this.layers[e.pass]);
        e.hair.visible = true; e.obj.visible = false;
      } else {
        if (it.color !== undefined) setMatColor(e.obj.material, it.color, out);
        e.obj.visible = true; if (e.hair) e.hair.visible = false;
      }
    }
    for (const [id, e] of this.objs) if (!seen.has(id)) { e.obj.visible = false; if (e.hair) e.hair.visible = false; e.key = "\u0000"; e.hairKey = "\u0000"; }
  }
}
