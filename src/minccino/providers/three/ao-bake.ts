// minccino/backend/three/ao-bake.ts —— 世界空间遮蔽的烘焙（Tron 第 1 步：剪纸 · 色纸的「多重阴影」；实验室 lab/app.js 的 shadows 服务 + core.js GLSL.SHADOW 的 aoAt 移植）。
// 做法照实验室：斐波那契球面上 20 个方向，每个方向一张正交深度图（盖住场景包围球 ×1.05），着色时每个方向看「从这一点朝那边出去，半径以内有没有东西挡」。
// 和实验室不一样的三处：① 实验室的模型先归一化到半径 1，这里按场景包围球（提供者 bounds()）换算，半径类参数仍按「场景半径 = 1」给，数学逐字一样；
// ② 20 张深度图拼成一张图集（5 × 4 格），不用纹理数组（three 往数组层里写深度不顺手）；③ 什么时候重烘归后端调度（内容变了、停手 0.25 秒后，见 render3）。
// created 2026-10-29 by Claude Opus 5.5
import * as THREE from "three";
import type { Vec3 } from "../../contract/geometry.ts";

export const AO_DIRS = 20, AO_RES = 512, AO_TILES_X = 5, AO_TILES_Y = 5;   // 20 格遮蔽 + 第 21 格太阳（铸铜的投影；实验室 shadows 服务的第 21 层）

/** 着色器那半（GLSL3）：aoAt(p, n) = 0（全挡）…1（不挡）。依赖 uniform：uAoDepth / uAoVP / uAoDir / uAoR / uAoTiles / uAoRadius / uAoSoft。 */
export const AO_GLSL = /* glsl */`
  uniform highp sampler2D uAoDepth;
  uniform mat4 uAoVP[21]; uniform vec3 uAoDir[20];
  uniform float uAoRadius, uAoSoft, uAoR; uniform vec2 uAoTiles;
  vec2 aoTile(int k, vec2 uv) { float kf = float(k); return (vec2(mod(kf, uAoTiles.x), floor(kf / uAoTiles.x)) + clamp(uv, vec2(0.0), vec2(1.0))) / uAoTiles; }
  float aoOcc(float D, float c0) { return step(0.01 + 0.03 * (1.0 - clamp(c0, 0.0, 1.0)), D) * (1.0 - smoothstep(0.25 * uAoRadius, uAoRadius, D)); }
  float aoAt(vec3 p, vec3 n) {
    const vec2 K[4] = vec2[4](vec2(0.75, 0.2), vec2(-0.2, 0.75), vec2(-0.75, -0.2), vec2(0.2, -0.75));
    float s = 0.0, w = 0.0;
    for (int k = 0; k < 20; k++) {
      float c0 = dot(n, uAoDir[k]), c = max(c0, 0.0); c *= c;
      if (c <= 0.0) continue;
      vec3 q = (uAoVP[k] * vec4(p + n * 0.008 * uAoR, 1.0)).xyz * 0.5 + 0.5;
      if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) { s += c; w += c; continue; }
      float z = textureLod(uAoDepth, aoTile(k, q.xy), 0.0).r;
      float D = z < 0.9999 ? (q.z - z) * 2.2 : -1.0;   // 正交深度范围 2.2（场景半径 = 1）
      float occ = aoOcc(D, c0);
      float rad = clamp(D, 0.0, uAoRadius) * 0.4 * uAoSoft / 2.1;
      if (rad > 1.5 / 512.0) {
        float a = float(k) * 2.39996, ca = cos(a), sa = sin(a);
        for (int i = 0; i < 4; i++) {
          vec2 o = mat2(ca, sa, -sa, ca) * K[i] * rad;
          float zi = textureLod(uAoDepth, aoTile(k, q.xy + o), 0.0).r;
          occ += aoOcc(zi < 0.9999 ? (q.z - zi) * 2.2 : -1.0, c0);
        }
        occ /= 5.0;
      }
      s += c * (1.0 - occ); w += c;
    }
    return w > 0.0 ? s / w : 1.0;
  }
  // 太阳投影（实验室 core.js sunShadow：2×2 小 PCF；跑出深度图的点当没挡）。图集第 21 格；深度不比较，手动比
  float sunShadow(vec3 p, vec3 n) {
    vec3 q = (uAoVP[20] * vec4(p + n * 0.004 * uAoR, 1.0)).xyz * 0.5 + 0.5;
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 1.0;
    float s = 0.0;
    for (int i = 0; i < 4; i++) {
      vec2 o = (vec2(float(i & 1), float(i >> 1)) - 0.5) * (1.5 / 512.0);
      float z = textureLod(uAoDepth, aoTile(20, q.xy + o), 0.0).r;
      s += z >= 0.9999 || q.z - 0.0015 <= z ? 1.0 : 0.0;
    }
    return s * 0.25;
  }`;

/** 斐波那契球面 20 个方向（和实验室同一组；朝向无所谓，均匀就行）。 */
function fibDirs(): any[] {
  const out: any[] = [], g = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < AO_DIRS; i++) { const y = 1 - (i + 0.5) / AO_DIRS * 2, r = Math.sqrt(1 - y * y); out.push(new THREE.Vector3(Math.cos(g * i) * r, Math.sin(g * i) * r, y)); }
  return out;
}

/** 共享 uniform（所有读遮蔽的材质引用同一份对象：烘一次，大家都看见）。 */
export interface AoUniforms {
  uAoDepth: { value: any }; uAoVP: { value: any[] }; uAoDir: { value: any[] }; uAoR: { value: number }; uAoTiles: { value: any };
}

export class AoBaker {
  readonly uniforms: AoUniforms;
  private rt: any = null;
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  private readonly depthOnly: any;
  private readonly dirs = fibDirs();
  /** 上次烘用了多少毫秒（血槽位 / 黑匣子）。 */
  lastMs = 0;
  constructor() {
    this.uniforms = {
      uAoDepth: { value: null }, uAoVP: { value: [...this.dirs, null].map(() => new THREE.Matrix4()) }, uAoDir: { value: this.dirs },
      uAoR: { value: 1 }, uAoTiles: { value: new THREE.Vector2(AO_TILES_X, AO_TILES_Y) },
    };
    // 只写深度；斜坡偏移免得表面自己挡自己（遮蔽版的阴影痤疮；实验室 polygonOffset(2, 4)）
    this.depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });
    this.cam.layers.set(0);   // 只烘模型那一层（叠加层、地面不进）
  }
  /** 把 scene 里第 0 层的东西从 20 个方向（+ 给了太阳方向就再烘一格太阳）烘进图集。sphere = 场景包围球（世界坐标）。 */
  bake(renderer: any, scene: any, sphere: { c: Vec3; r: number }, sun: Vec3 | null = null): void {
    const t0 = performance.now();
    if (!this.rt) {
      const W = AO_RES * AO_TILES_X, H = AO_RES * AO_TILES_Y;
      const depthTexture = new THREE.DepthTexture(W, H, THREE.UnsignedShortType);
      depthTexture.minFilter = THREE.NearestFilter; depthTexture.magFilter = THREE.NearestFilter;
      this.rt = new THREE.WebGLRenderTarget(W, H, { format: THREE.RedFormat, depthBuffer: true, depthTexture, generateMipmaps: false });
      this.uniforms.uAoDepth.value = depthTexture;
    }
    const { c, r } = sphere, R = Math.max(r, 1e-6);
    const cam = this.cam, prevTarget = renderer.getRenderTarget(), auto = renderer.autoClear, bg = scene.background, over = scene.overrideMaterial;
    cam.left = -1.05 * R; cam.right = 1.05 * R; cam.top = 1.05 * R; cam.bottom = -1.05 * R; cam.near = 1.9 * R; cam.far = 4.1 * R;
    try {
      scene.background = null; scene.overrideMaterial = this.depthOnly;
      renderer.setRenderTarget(this.rt); renderer.clear(true, true, false);
      renderer.autoClear = false;
      for (let k = 0; k < (sun ? AO_DIRS + 1 : AO_DIRS); k++) {
        const d = k < AO_DIRS ? this.dirs[k] : sun!;
        cam.position.set(c.x + d.x * 3 * R, c.y + d.y * 3 * R, c.z + d.z * 3 * R);
        cam.up.set(0, 0, 1); if (Math.abs(d.z) > 0.99) cam.up.set(1, 0, 0);
        cam.lookAt(c.x, c.y, c.z); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
        this.uniforms.uAoVP.value[k].multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        this.rt.viewport.set((k % AO_TILES_X) * AO_RES, Math.floor(k / AO_TILES_X) * AO_RES, AO_RES, AO_RES);
        renderer.setRenderTarget(this.rt);
        renderer.render(scene, cam);
      }
      this.uniforms.uAoR.value = R;
    } finally {
      scene.background = bg; scene.overrideMaterial = over; renderer.autoClear = auto; renderer.setRenderTarget(prevTarget);
    }
    this.lastMs = performance.now() - t0;
  }
  /** 显存（血槽位）：图集颜色 1 字节 + 深度 2 字节。 */
  bytes(): number { return this.rt ? AO_RES * AO_TILES_X * AO_RES * AO_TILES_Y * 3 : 0; }
  dispose(): void { this.rt?.dispose(); this.rt = null; this.depthOnly.dispose(); }
}
