// minccino/backend/three/env-sky.ts —— 环境图：按涂装车间的环境配方（现在一种：程序海天，minccino/paintshop/sky-sea.ts）画。
// 烘成一张 1024 × 512 的等距柱状图（半精度、带 mip：镜面按粗糙度挑 mip 级，实验室同款近似），漫反射环境光 = 9 个球谐系数（实验室 projectSH：
// 从 64 × 32 那份读回 CPU 投影一遍，系数里乘好余弦卷积和 1/π）。坐标：实验室是 y 朝上，CatsUp 世界 z 朝上——这里一律按实验室的坐标存，
// 读的着色器先 toLab(w) = (w.x, w.z, −w.y) 再查（一个真旋转，右手系不变）。太阳 / 天空变了才重烘（键 = 太阳方向）。
// created 2026-10-29 by Claude Opus 5.5（Tron 第 1 步第四个风格：铸铜）
import * as THREE from "three";
import { ENV_RECIPES, projectSH, type EnvRecipe, type EnvRecipeId } from "../../paintshop/index.ts";

export const ENV_W = 1024, ENV_H = 512, ENV_MAX_LOD = Math.log2(ENV_W) - 2;

const VS = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
/** 环境图着色器：配方（涂装车间）的 GLSL + 按等距柱状图的像素反推方向。 */
const skyFs = (r: EnvRecipe): string => /* glsl */`
  precision highp float;
  uniform vec3 uSunDir; uniform vec2 uSize;
  layout(location = 0) out vec4 oColor;
  ${r.glsl}
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;   // 第 0 行 = v 0 = 正上方（和 dirToEquirect 互逆）
    float ph = (uv.x - 0.5) * 6.2831853, th = uv.y * 3.14159265, st = sin(th);
    oColor = vec4(${r.fn}(vec3(st * sin(ph), cos(th), -st * cos(ph)), uSunDir), 1.0);
  }`;

export class EnvSky {
  /** 共享 uniform：环境图、最大 mip 级、球谐（有没有算出来）。 */
  readonly uniforms = { uEnv: { value: null as any }, uEnvMaxLod: { value: ENV_MAX_LOD }, uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) }, uHasSH: { value: false } };
  private rt: any = null;
  private key = "";
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly mat: any;
  private recipe: EnvRecipeId | null = null;
  /** 上次烘用了多少毫秒。 */
  lastMs = 0;
  constructor() {
    this.mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: skyFs(ENV_RECIPES["sky-sea"]), depthTest: false, depthWrite: false, uniforms: { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSize: { value: new THREE.Vector2(ENV_W, ENV_H) } } });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); q.frustumCulled = false; this.scene.add(q);
  }
  /** 配方或太阳（实验室坐标，单位向量）变了才重烘；真烘了返回 true（血槽位按它记次数 / 毫秒）。 */
  ensure(renderer: any, recipe: EnvRecipeId, sunLab: readonly [number, number, number]): boolean {
    const key = `${recipe}|${sunLab.map((x) => x.toFixed(4)).join(",")}`;
    if (key === this.key && this.rt) return false;
    if (recipe !== this.recipe) { this.mat.fragmentShader = skyFs(ENV_RECIPES[recipe]); this.mat.needsUpdate = true; this.recipe = recipe; }
    const t0 = performance.now(), prev = renderer.getRenderTarget();
    if (!this.rt) {
      this.rt = new THREE.WebGLRenderTarget(ENV_W, ENV_H, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping, wrapT: THREE.ClampToEdgeWrapping, depthBuffer: false });
      this.uniforms.uEnv.value = this.rt.texture;
    }
    this.mat.uniforms.uSunDir.value.set(sunLab[0], sunLab[1], sunLab[2]);
    try {
      this.mat.uniforms.uSize.value.set(ENV_W, ENV_H);
      renderer.setRenderTarget(this.rt); renderer.render(this.scene, this.cam);   // 画完 three 自己生成 mip
      // 球谐：同一个天空画一份 64 × 32 浮点小图读回（实验室读 mip 4 那级；这里直接画那么大，结果同形）
      const sw = ENV_W >> 4, shh = ENV_H >> 4;
      const small = new THREE.WebGLRenderTarget(sw, shh, { type: THREE.FloatType, depthBuffer: false, generateMipmaps: false });
      try {
        this.mat.uniforms.uSize.value.set(sw, shh);
        renderer.setRenderTarget(small); renderer.render(this.scene, this.cam);
        const px = new Float32Array(sw * shh * 4);
        renderer.readRenderTargetPixels(small, 0, 0, sw, shh, px);
        const c = projectSH(px, sw, shh), ok = c.some((v) => v !== 0) && c.every((v) => Number.isFinite(v));
        if (ok) this.uniforms.uSH.value.forEach((v, b) => v.set(c[b * 3], c[b * 3 + 1], c[b * 3 + 2]));
        this.uniforms.uHasSH.value = ok;   // 读不回浮点（老设备）= 漫反射退回简单的天光 / 地光（实验室没开环境时那条），不静默：血槽位里看得到
      } catch { this.uniforms.uHasSH.value = false; } finally { small.dispose(); }
    } finally { renderer.setRenderTarget(prev); }
    this.key = key; this.lastMs = performance.now() - t0;
    return true;
  }
  bytes(): number { return this.rt ? Math.round(ENV_W * ENV_H * 8 * 4 / 3) : 0; }
  dispose(): void { this.rt?.dispose(); this.mat.dispose(); }
}
