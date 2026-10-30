// minccino/backend/three/overlay-marks.ts —— 辅助几何的点 / 标记 / 三角的 three 画法（步 6b）：点 = 每个 id 一份 Points + shader 材质（shader 字符串
// 和以前 render3 的逐字一样）；标记 = 每个 id 一个 Mesh；三角 = 每个 id 一个 Mesh。文字 2026-10-29 退役（字 = 折线，排版归提交方的画风表；位图字 label-raster 删了）。
// 2026-10-29 Opus 5.5（切刀第 2 步）：item 按 stage / resolution 挂到三层之一（缺省 = 主分辨率跟内容），见 overlay-lines.ts。
// 材质参数全从 item 自带的画法参数来（刀 a：引擎这边没有样式表）；参数变了才重建。created 2026-10-29 by Claude Fable 5.1
import * as THREE from "three";
import type { MarkerGeom, OverlayMarker, OverlayPoints, OverlayTris } from "../../overlay/index.ts";
import { type AuxLayers, type AuxPass, auxPassOf, setMatColor } from "./overlay-lines.ts";

const rgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];   // 原样 sRGB 数值（ShaderMaterial 不做色彩空间换算）

const pointKey = (it: OverlayPoints): string => `${it.sizePx}|${it.shape}|${it.pull}|${it.color}|${it.depth}|${it.alpha ?? 1}`;
function pointMaterial(it: OverlayPoints): any {
  const depthTest = it.depth !== "through";
  if (it.color === null) {
    return new THREE.ShaderMaterial({
      uniforms: { uSize: { value: it.sizePx } }, depthTest, depthWrite: false, transparent: true,
      vertexShader: "uniform float uSize; attribute vec3 color; varying vec3 vC; void main(){ vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; }",
      fragmentShader: `varying vec3 vC; void main(){ vec2 d = ${it.shape === "square" ? "abs(gl_PointCoord - 0.5); if (max(d.x, d.y) > 0.5)" : "gl_PointCoord - 0.5; if (dot(d, d) > 0.25)"} discard; gl_FragColor = vec4(vC, ${(it.alpha ?? 1).toFixed(3)}); }`,
    });
  }
  const [r, g, b] = rgb(it.color), pull = it.pull ?? 1;
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Vector3(r, g, b) }, uSize: { value: it.sizePx } }, depthTest,
    vertexShader: `uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); if (projectionMatrix[3][3] > 0.5) mv.z *= ${pull}; else mv.xyz *= ${pull}; gl_Position = projectionMatrix * mv; gl_PointSize = uSize; }`,
    fragmentShader: `uniform vec3 uColor; void main(){ vec2 d = ${it.shape === "square" ? "abs(gl_PointCoord - 0.5); if (max(d.x, d.y) > 0.5)" : "gl_PointCoord - 0.5; if (dot(d, d) > 0.25)"} discard; gl_FragColor = vec4(uColor, 1.0); }`,
  });
}
function markerGeometry(geom: MarkerGeom): any {
  switch (geom) {
    case "sphere": return new THREE.SphereGeometry(1, 12, 8);
    case "sphereHalf": return new THREE.SphereGeometry(0.5, 16, 10);
    case "box": return new THREE.BoxGeometry(1, 1, 1);
    case "cone": return new THREE.ConeGeometry(1, 1, 16);
    case "ring": return new THREE.RingGeometry(0.22, 0.3, 32);
    case "plane": return new THREE.PlaneGeometry(1, 1);
  }
}
const markerKey = (it: OverlayMarker): string => `${it.geom}|${it.depth}|${it.depthWrite ?? "-"}|${it.alpha ?? 1}|${it.doubleSide ? 1 : 0}`;
const trisKey = (it: OverlayTris): string => `${it.color}|${it.depth}|${it.alpha ?? 1}|${it.doubleSide ? 1 : 0}`;
function basicMaterial(color: number, depth: "visible" | "through", depthWrite: boolean | undefined, alpha: number | undefined, doubleSide: boolean | undefined): any {
  const transparent = alpha !== undefined && alpha < 1;
  return new THREE.MeshBasicMaterial({ color, depthTest: depth !== "through", depthWrite: depthWrite ?? false, transparent,   // 辅助几何缺省不写深度（契约）
    opacity: alpha ?? 1, side: doubleSide ? THREE.DoubleSide : THREE.FrontSide });
}

export class OverlayMarksDrawer {
  private points = new Map<string, { obj: any; key: string; mat: string; pass: AuxPass }>();
  private markers = new Map<string, { obj: any; mat: string; pass: AuxPass }>();
  private tris = new Map<string, { obj: any; key: string; mat: string; pass: AuxPass }>();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly v1 = new THREE.Vector3(); private readonly v2 = new THREE.Vector3(); private readonly v3 = new THREE.Vector3();
  private readonly m4 = new THREE.Matrix4();
  constructor(private readonly scene: any, private readonly layers: AuxLayers) {}
  private *all(): Generator<[string, { obj: any; pass: AuxPass }]> { yield* this.points; yield* this.markers; yield* this.tris; }
  /** 这一帧有没有画在这一层的东西（没有就不画那一遍）。 */
  has(pass: AuxPass): boolean { for (const [, e] of this.all()) if (e.pass === pass && e.obj.visible) return true; return false; }
  /** 探针：这一帧画在这一层的 id。 */
  idsIn(pass: AuxPass): string[] { const out: string[] = []; for (const [id, e] of this.all()) if (e.pass === pass && e.obj.visible) out.push(id); return out; }
  /** 探针：这个 id 这一帧画着没有。 */
  isVisible(id: string): boolean { return !!(this.points.get(id)?.obj.visible || this.markers.get(id)?.obj.visible || this.tris.get(id)?.obj.visible); }
  /** 探针：画着的点 / 三角的 id 和键。 */
  keys(): { id: string; key: string }[] { const out: { id: string; key: string }[] = []; for (const [id, e] of [...this.points, ...this.tris]) if (e.obj.visible) out.push({ id, key: e.key }); return out; }

  /** @param mainScale 主分辨率的点画进小图时的缩小倍数（小图一格 = 几个设备像素；不下采样 = 1）
   *  @param srgbOut 主分辨率画进小图（风格那条路）：标记 / 三角的颜色按 sRGB 原值写（点的 shader 本来就直接出 sRGB） */
  sync(items: readonly (OverlayPoints | OverlayMarker | OverlayTris)[], dpr: number, mainScale = 1, srgbOut = false): void {
    const seenPts = new Set<string>(), seenM = new Set<string>(), seenT = new Set<string>();
    for (const it of items) {
      if (it.kind === "points") {
        seenPts.add(it.id);
        const mk = pointKey(it);
        let e = this.points.get(it.id);
        if (!e || e.mat !== mk) {
          if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
          const obj = new THREE.Points(new THREE.BufferGeometry(), pointMaterial(it));
          obj.frustumCulled = false; obj.visible = false;
          this.scene.add(obj);
          e = { obj, key: "\u0000", mat: mk, pass: "main" }; this.points.set(it.id, e);
        }
        if (e.key !== it.key) {
          e.key = it.key;
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
          if (it.colors) g.setAttribute("color", new THREE.Float32BufferAttribute(it.colors as number[], 3));
          e.obj.geometry.dispose(); e.obj.geometry = g;
        }
        e.obj.renderOrder = it.layer ?? 0;
        e.pass = auxPassOf(it); e.obj.layers.set(this.layers[e.pass]);
        e.obj.material.uniforms.uSize.value = Math.max(1, it.sizePx * dpr / (e.pass === "native" ? 1 : mainScale));   // 主分辨率的点在小图里按小图像素
        e.obj.visible = true;
      } else if (it.kind === "marker") {
        seenM.add(it.id);
        const mk = markerKey(it);
        let e = this.markers.get(it.id);
        if (!e || e.mat !== mk) {
          if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
          const obj = new THREE.Mesh(markerGeometry(it.geom), basicMaterial(0xffffff, it.depth, it.depthWrite, it.alpha, it.doubleSide));
          obj.frustumCulled = false; obj.visible = false;
          this.scene.add(obj);
          e = { obj, mat: mk, pass: "main" }; this.markers.set(it.id, e);
        }
        const m = e.obj;
        m.visible = true; m.renderOrder = it.layer ?? 0;
        e.pass = auxPassOf(it); m.layers.set(this.layers[e.pass]);
        m.position.set(it.at.x, it.at.y, it.at.z);
        if (typeof it.scale === "number") m.scale.setScalar(it.scale); else m.scale.set(it.scale.x, it.scale.y, it.scale.z);
        setMatColor(m.material, it.color, srgbOut && e.pass !== "native");
        const o = it.orient;
        if (!o) m.quaternion.identity();
        else if (o.kind === "upTo") m.quaternion.setFromUnitVectors(this.up, this.v1.set(o.dir.x, o.dir.y, o.dir.z).normalize());
        else m.quaternion.setFromRotationMatrix(this.m4.makeBasis(this.v1.set(o.x.x, o.x.y, o.x.z), this.v2.set(o.y.x, o.y.y, o.y.z), this.v3.set(o.z.x, o.z.y, o.z.z)));
      } else if (it.kind === "tris") {
        seenT.add(it.id);
        const mk = trisKey(it);
        let e = this.tris.get(it.id);
        if (!e || e.mat !== mk) {
          if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
          const obj = new THREE.Mesh(new THREE.BufferGeometry(), basicMaterial(it.color, it.depth, undefined, it.alpha, it.doubleSide));
          obj.frustumCulled = false; obj.visible = false;
          this.scene.add(obj);
          e = { obj, key: "\u0000", mat: mk, pass: "main" }; this.tris.set(it.id, e);
        }
        if (e.key !== it.key) {
          e.key = it.key;
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
          const old = e.obj.geometry; e.obj.geometry = g; old.dispose();
        }
        e.obj.renderOrder = it.layer ?? 0;
        e.pass = auxPassOf(it); e.obj.layers.set(this.layers[e.pass]);
        setMatColor(e.obj.material, it.color, srgbOut && e.pass !== "native");
        e.obj.visible = true;
      }
    }
    for (const [id, e] of this.points) if (!seenPts.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
    for (const [id, e] of this.markers) if (!seenM.has(id)) e.obj.visible = false;
    for (const [id, e] of this.tris) if (!seenT.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
  }
}
