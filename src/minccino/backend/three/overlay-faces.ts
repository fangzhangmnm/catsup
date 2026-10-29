// minccino/backend/three/overlay-faces.ts —— 面高亮（选中 / 悬停）的 three 画法（6c）。内容归编辑器 editor/highlight.ts（哪个槽的哪些三角 + 颜色 / 贴图组）；
// 这里只管三种落点：挂槽的 = 那个槽节点下的 sel 网格（和槽的面同一个材质 = 同一个深度偏移，画在面之后 = 换颜色，2026-10-27 Opus 的「同节点同三角后画」）；
// 世界坐标的 = 覆盖层材质一份网格（polygonOffset 压在各槽面上）；带贴图的 = 每种贴图材质一份网格（自己的 uv，材质懒建 = 和以前同一时机）。
// key 没变不重建；这一帧没给的藏起来、几何释放。created 2026-10-29 by Claude Fable 5.1
import * as THREE from "three";
import type { OverlayFaces } from "../../overlay/index.ts";
import type { MaterialRef } from "../../contract/stream.ts";

/** 槽节点里和高亮有关的三样（render3 的 SlotNodes 结构上满足）：sel 网格、面网格（借它的材质）、上次的键。 */
export interface SelHost { sel: any; plain: any; selKey: string }

const NO_KEY = "\u0000";

function facesGeometry(it: OverlayFaces): any {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(it.positions as number[], 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(it.normals as number[], 3));
  geo.setAttribute("aColor", new THREE.Float32BufferAttribute(it.colors as number[], 3));
  if (it.uvs) geo.setAttribute("aUv", new THREE.Float32BufferAttribute(it.uvs as number[], 2));
  else geo.setAttribute("aColorB", new THREE.Float32BufferAttribute(it.colors as number[], 3));   // 覆盖层（选中 / 悬停）两侧同色
  return geo;
}

export class OverlayFacesDrawer {
  private readonly world: any;
  private worldKey = NO_KEY;
  private tex: { mesh: any; mat: any; key: string }[] = [];
  private visibleIds = new Set<string>();
  /**
   * @param emptyGeo 后端共享的空几何（藏起来时挂它，不释放）
   * @param faceMatTop 覆盖层材质（世界坐标那份；在 render3 构造器里建，材质创建顺序不动）
   * @param texMat 建一份贴图覆盖层材质（懒建，第一次画带贴图的高亮时）
   * @param textureFor 材质 → three 贴图（render3 的贴图缓存）
   */
  constructor(private readonly scene: any, private readonly emptyGeo: any, faceMatTop: any, private readonly texMat: () => any, private readonly textureFor: (m: MaterialRef) => any) {
    this.world = new THREE.Mesh(emptyGeo, faceMatTop);
    this.world.frustumCulled = false; this.world.visible = false;
    scene.add(this.world);
  }
  /** 探针：这个 id 的高亮这一帧画着没有。 */
  isVisible(id: string): boolean { return this.visibleIds.has(id); }
  sync(items: readonly OverlayFaces[], slots: ReadonlyMap<string, SelHost>): void {
    const seenSlots = new Set<string>();
    let worldSeen = false, ti = 0;
    this.visibleIds.clear();
    for (const it of items) {
      if (it.slot !== null) {
        const n = slots.get(it.slot);
        if (!n) continue;   // 槽这一帧不在（放置没了）：内容方给错了也不画到别处去
        if (n.selKey !== it.key) { if (n.sel.geometry !== this.emptyGeo) n.sel.geometry.dispose(); n.sel.geometry = facesGeometry(it); n.selKey = it.key; }
        n.sel.material = n.plain.material;   // 和这个槽的面同一个材质 = 同一个深度偏移（面的材质随活动 / 淡出 / 单面变，每帧跟）
        n.sel.visible = true;
        seenSlots.add(it.slot);
      } else if (!it.material) {
        if (this.worldKey !== it.key) { const old = this.world.geometry; this.world.geometry = facesGeometry(it); if (old !== this.emptyGeo) old.dispose(); this.worldKey = it.key; }
        this.world.visible = true; worldSeen = true;
      } else {
        let s = this.tex[ti];
        if (!s) { const mat = this.texMat(); const mesh = new THREE.Mesh(this.emptyGeo, mat); mesh.frustumCulled = false; this.scene.add(mesh); s = { mesh, mat, key: NO_KEY }; this.tex.push(s); }
        s.mat.uniforms.uMap.value = this.textureFor(it.material);
        if (s.key !== it.key) { const old = s.mesh.geometry; s.mesh.geometry = facesGeometry(it); if (old !== this.emptyGeo) old.dispose(); s.key = it.key; }
        s.mesh.visible = true; ti++;
      }
      this.visibleIds.add(it.id);
    }
    for (const [slot, n] of slots) if (!seenSlots.has(slot) && (n.sel.visible || n.selKey !== NO_KEY)) { n.sel.visible = false; if (n.sel.geometry !== this.emptyGeo) { n.sel.geometry.dispose(); n.sel.geometry = this.emptyGeo; } n.selKey = NO_KEY; }
    if (!worldSeen) this.world.visible = false;
    for (; ti < this.tex.length; ti++) { this.tex[ti].mesh.visible = false; this.tex[ti].key = NO_KEY; }
  }
}
