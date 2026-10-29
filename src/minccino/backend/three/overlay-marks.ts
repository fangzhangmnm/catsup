// minccino/backend/three/overlay-marks.ts —— 叠加层的点 / 标记 / 三角 / 文字的 three 画法（步 6b）：点 = 每种样式一份 Points + shader 材质（shader 字符串
// 和以前 render3 的逐字一样）；标记 = 每个 id 一个 Mesh（几何 / 材质按 MARKER_STYLES）；三角 = 每个 id 一个 Mesh；文字 = Sprite + label-raster 的位图。
// created 2026-10-29 by Claude Fable 5.1
import * as THREE from "three";
import { MARKER_STYLES, POINT_STYLES, TRIS_STYLES, type MarkerStyleId, type OverlayLabel, type OverlayMarker, type OverlayPoints, type OverlayTris, type PointStyleId, type TrisStyleId } from "../../overlay/index.ts";
import { anchorCenter, rasterizeLabel } from "../label-raster.ts";
import type { Vec3 } from "../../contract/geometry.ts";

const rgb = (hex: number): [number, number, number] => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];   // 原样 sRGB 数值（ShaderMaterial 不做色彩空间换算）

function pointMaterial(st: (typeof POINT_STYLES)[PointStyleId]): any {
  if (st.color === null) {
    return new THREE.ShaderMaterial({
      uniforms: { uSize: { value: st.sizePx } }, depthTest: st.depthTest, depthWrite: false, transparent: true,
      vertexShader: "uniform float uSize; attribute vec3 color; varying vec3 vC; void main(){ vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = uSize; }",
      fragmentShader: `varying vec3 vC; void main(){ vec2 d = abs(gl_PointCoord - 0.5); if (max(d.x, d.y) > 0.5) discard; gl_FragColor = vec4(vC, ${st.alpha}); }`,
    });
  }
  const [r, g, b] = rgb(st.color);
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Vector3(r, g, b) }, uSize: { value: st.sizePx } },
    vertexShader: `uniform float uSize; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); if (projectionMatrix[3][3] > 0.5) mv.z *= ${st.pull}; else mv.xyz *= ${st.pull}; gl_Position = projectionMatrix * mv; gl_PointSize = uSize; }`,
    fragmentShader: "uniform vec3 uColor; void main(){ vec2 d = gl_PointCoord - 0.5; if (dot(d, d) > 0.25) discard; gl_FragColor = vec4(uColor, 1.0); }",
  });
}
function markerGeometry(geom: (typeof MARKER_STYLES)[MarkerStyleId]["geom"]): any {
  switch (geom) {
    case "sphere": return new THREE.SphereGeometry(1, 12, 8);
    case "sphereHalf": return new THREE.SphereGeometry(0.5, 16, 10);
    case "box": return new THREE.BoxGeometry(1, 1, 1);
    case "cone": return new THREE.ConeGeometry(1, 1, 16);
    case "ring": return new THREE.RingGeometry(0.22, 0.3, 32);
    case "plane": return new THREE.PlaneGeometry(1, 1);
  }
}

export class OverlayMarksDrawer {
  private points = new Map<PointStyleId, { obj: any; key: string; id: string | null }>();
  private markers = new Map<string, { obj: any; style: MarkerStyleId }>();
  private tris = new Map<string, { obj: any; key: string; style: TrisStyleId }>();
  private labels = new Map<string, { sprite: any; key: string; w: number; h: number }>();
  private readonly up = new THREE.Vector3(0, 1, 0);
  private readonly v1 = new THREE.Vector3(); private readonly v2 = new THREE.Vector3(); private readonly v3 = new THREE.Vector3();
  private readonly m4 = new THREE.Matrix4();
  constructor(private readonly scene: any) {
    for (const [id, st] of Object.entries(POINT_STYLES) as [PointStyleId, (typeof POINT_STYLES)[PointStyleId]][]) {
      const obj = new THREE.Points(new THREE.BufferGeometry(), pointMaterial(st));
      obj.frustumCulled = false; obj.visible = false; obj.renderOrder = st.renderOrder;
      this.scene.add(obj);
      this.points.set(id, { obj, key: "\u0000", id: null });
    }
  }
  /** 探针：这个 id 这一帧画着没有。 */
  isVisible(id: string): boolean {
    for (const p of this.points.values()) if (p.id === id) return !!p.obj.visible;
    return !!(this.markers.get(id)?.obj.visible || this.tris.get(id)?.obj.visible || this.labels.get(id)?.sprite.visible);
  }
  /** 探针：现在挂着哪些字（id → 位图键 = 样式|dpr|文字）。 */
  labelKeys(): { id: string; key: string }[] { return [...this.labels].map(([id, e]) => ({ id, key: e.key })); }

  sync(items: readonly (OverlayPoints | OverlayMarker | OverlayTris | OverlayLabel)[], dpr: number, worldPerPx: (p: Vec3) => number): void {
    const seenPts = new Set<PointStyleId>(), seenM = new Set<string>(), seenT = new Set<string>(), seenL = new Set<string>();
    for (const it of items) {
      if (it.kind === "points") {
        const e = this.points.get(it.style)!; seenPts.add(it.style);
        if (e.key !== it.key || e.id !== it.id) {
          e.key = it.key; e.id = it.id;
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
          if (it.colors) g.setAttribute("color", new THREE.Float32BufferAttribute(it.colors as number[], 3));
          e.obj.geometry.dispose(); e.obj.geometry = g;
        }
        e.obj.material.uniforms.uSize.value = POINT_STYLES[it.style].sizePx * dpr;
        e.obj.visible = true;
      } else if (it.kind === "marker") {
        seenM.add(it.id);
        let e = this.markers.get(it.id);
        if (!e || e.style !== it.style) {
          if (e) { this.scene.remove(e.obj); e.obj.geometry.dispose(); e.obj.material.dispose(); }
          const st = MARKER_STYLES[it.style];
          const obj = new THREE.Mesh(markerGeometry(st.geom), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: st.depthTest, depthWrite: st.depthWrite, transparent: st.transparent, opacity: st.opacity, side: st.doubleSide ? THREE.DoubleSide : THREE.FrontSide }));
          obj.renderOrder = st.renderOrder; obj.frustumCulled = st.frustumCulled; obj.visible = false;
          this.scene.add(obj);
          e = { obj, style: it.style }; this.markers.set(it.id, e);
        }
        const m = e.obj;
        m.visible = true;
        m.position.set(it.at.x, it.at.y, it.at.z);
        if (typeof it.scale === "number") m.scale.setScalar(it.scale); else m.scale.set(it.scale.x, it.scale.y, it.scale.z);
        m.material.color.setHex(it.color);
        const o = it.orient;
        if (!o) m.quaternion.identity();
        else if (o.kind === "upTo") m.quaternion.setFromUnitVectors(this.up, this.v1.set(o.dir.x, o.dir.y, o.dir.z).normalize());
        else m.quaternion.setFromRotationMatrix(this.m4.makeBasis(this.v1.set(o.x.x, o.x.y, o.x.z), this.v2.set(o.y.x, o.y.y, o.y.z), this.v3.set(o.z.x, o.z.y, o.z.z)));
      } else if (it.kind === "tris") {
        seenT.add(it.id);
        let e = this.tris.get(it.id);
        if (!e) {
          const st = TRIS_STYLES[it.style];
          const obj = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: st.color, transparent: st.transparent, opacity: st.opacity, side: st.doubleSide ? THREE.DoubleSide : THREE.FrontSide, depthTest: st.depthTest, depthWrite: st.depthWrite }));
          obj.renderOrder = st.renderOrder; obj.frustumCulled = false; obj.visible = false;
          this.scene.add(obj);
          e = { obj, key: "\u0000", style: it.style }; this.tris.set(it.id, e);
        }
        if (e.key !== it.key) {
          e.key = it.key;
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
          const old = e.obj.geometry; e.obj.geometry = g; old.dispose();
        }
        e.obj.visible = true;
      } else {
        seenL.add(it.id);
        const bm = rasterizeLabel(it.text, it.style, dpr);
        let e = this.labels.get(it.id);
        if (!e) {
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
          sprite.renderOrder = 3; sprite.frustumCulled = false;
          this.scene.add(sprite);
          e = { sprite, key: "", w: 0, h: 0 };
          this.labels.set(it.id, e);
        }
        if (e.key !== bm.key) {
          const tex = new THREE.CanvasTexture(bm.canvas);
          tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
          e.sprite.material.map?.dispose(); e.sprite.material.map = tex; e.sprite.material.needsUpdate = true;
          e.key = bm.key; e.w = bm.w; e.h = bm.h;
        }
        e.sprite.material.depthTest = it.occlude !== false;
        const [cx, cy] = anchorCenter(it.anchor ?? "center", e.w, e.h, it.gapPx ?? 3);
        e.sprite.center.set(cx, cy);
        e.sprite.position.set(it.at.x, it.at.y, it.at.z);
        const wpp = worldPerPx(it.at);
        e.sprite.scale.set(e.w * wpp, e.h * wpp, 1);
        e.sprite.visible = true;
      }
    }
    for (const [id, e] of this.points) if (!seenPts.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
    for (const [id, e] of this.markers) if (!seenM.has(id)) e.obj.visible = false;
    for (const [id, e] of this.tris) if (!seenT.has(id)) { e.obj.visible = false; e.key = "\u0000"; }
    for (const [id, e] of this.labels) if (!seenL.has(id)) { e.sprite.material.map?.dispose(); e.sprite.material.dispose(); this.scene.remove(e.sprite); this.labels.delete(id); }
  }
}
