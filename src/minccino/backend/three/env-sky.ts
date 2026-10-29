// minccino/backend/three/env-sky.ts —— 环境图：程序海天（实验室 lab/app.js 的 sky() / procedural()，向 2014 年那张海天球面图致敬：远山、云、海面反射）。
// 烘成一张 1024 × 512 的等距柱状图（半精度、带 mip：镜面按粗糙度挑 mip 级，实验室同款近似），漫反射环境光 = 9 个球谐系数（实验室 projectSH：
// 从 64 × 32 那份读回 CPU 投影一遍，系数里乘好余弦卷积和 1/π）。坐标：实验室是 y 朝上，CatsUp 世界 z 朝上——这里一律按实验室的坐标存，
// 读的着色器先 toLab(w) = (w.x, w.z, −w.y) 再查（一个真旋转，右手系不变）。太阳 / 天空变了才重烘（键 = 太阳方向）。
// created 2026-10-29 by Claude Opus 5.5（Tron 第 1 步第四个风格：铸铜）
import * as THREE from "three";

export const ENV_W = 1024, ENV_H = 512, ENV_MAX_LOD = Math.log2(ENV_W) - 2;

const VS = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const SKY_FS = /* glsl */`
  precision highp float;
  uniform vec3 uSunDir; uniform vec2 uSize;
  layout(location = 0) out vec4 oColor;
  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(17.1, 9.2); a *= 0.5; } return s; }
  vec3 sky(vec3 d) {
    float h = max(d.y, 0.0);
    vec3 c = mix(vec3(0.58, 0.68, 0.83), vec3(0.08, 0.22, 0.58), pow(h, 0.35));
    vec2 p = d.xz / (d.y + 0.12);
    float n = fbm(p * 0.9 + vec2(3.1, 1.7));
    float sunF = max(dot(d, uSunDir), 0.0);
    float cl = smoothstep(0.56, 0.84, n) * smoothstep(0.02, 0.14, d.y) * (1.0 - 0.5 * h);
    c = mix(c, mix(vec3(0.58, 0.63, 0.72), vec3(1.0, 0.97, 0.93), 0.45 + 0.55 * sunF), cl * 0.9);
    c += vec3(1.0, 0.95, 0.86) * (pow(sunF, 2400.0) * 60.0 + pow(sunF, 120.0) * 0.45 + pow(sunF, 12.0) * 0.04);
    return c;
  }
  vec3 procedural(vec3 d) {
    float az = atan(d.z, d.x);
    float hill = 0.010 + 0.040 * pow(max(0.0, sin(az * 1.3 + 2.2)), 3.0) + 0.012 * vnoise(vec2(az * 9.0, 0.5));
    if (d.y >= 0.0 && d.y < hill) return mix(vec3(0.10, 0.13, 0.18), sky(d), 0.25 + 0.35 * d.y / hill);
    if (d.y >= 0.0) return sky(d);
    vec2 sp = d.xz / max(-d.y, 0.015);
    float w = fbm(sp * 0.35) - 0.5;
    vec3 r = normalize(vec3(d.x + w * 0.05, -d.y, d.z + w * 0.05));
    float f = 0.02 + 0.98 * pow(1.0 + d.y, 5.0);
    vec3 c = mix(vec3(0.012, 0.04, 0.07), sky(r) * 0.85, clamp(f, 0.0, 1.0));
    c += vec3(1.0, 0.95, 0.86) * pow(max(dot(r, uSunDir), 0.0), 260.0) * 5.0 * (0.6 + w);
    return c;
  }
  void main() {
    vec2 uv = gl_FragCoord.xy / uSize;   // 第 0 行 = v 0 = 正上方（和 dirToEquirect 互逆）
    float ph = (uv.x - 0.5) * 6.2831853, th = uv.y * 3.14159265, st = sin(th);
    oColor = vec4(procedural(vec3(st * sin(ph), cos(th), -st * cos(ph))), 1.0);
  }`;

/** 9 个球谐系数（实验室 projectSH 原式）。px = RGBA 浮点、w × h、按行；第 j 行 = θ (j + 0.5)π/h。 */
export function projectSH(px: Float32Array, w: number, h: number): Float32Array {
  const c = new Float32Array(27), A = [Math.PI, 2 * Math.PI / 3, 2 * Math.PI / 3, 2 * Math.PI / 3, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
  const dPhi = 2 * Math.PI / w, dTh = Math.PI / h;
  for (let j = 0; j < h; j++) {
    const th = (j + 0.5) * dTh, st = Math.sin(th), y = Math.cos(th), dw = st * dTh * dPhi;
    for (let i = 0; i < w; i++) {
      const ph = ((i + 0.5) / w - 0.5) * 2 * Math.PI, x = st * Math.sin(ph), z = -st * Math.cos(ph);
      const Y = [0.282095, 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z, 0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)];
      const k = (j * w + i) * 4;
      for (let b = 0; b < 9; b++) for (let ch = 0; ch < 3; ch++) c[b * 3 + ch] += px[k + ch] * Y[b] * dw;
    }
  }
  for (let b = 0; b < 9; b++) for (let ch = 0; ch < 3; ch++) c[b * 3 + ch] *= A[b] / Math.PI;
  return c;
}

export class EnvSky {
  /** 共享 uniform：环境图、最大 mip 级、球谐（有没有算出来）。 */
  readonly uniforms = { uEnv: { value: null as any }, uEnvMaxLod: { value: ENV_MAX_LOD }, uSH: { value: Array.from({ length: 9 }, () => new THREE.Vector3()) }, uHasSH: { value: false } };
  private rt: any = null;
  private key = "";
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly mat: any;
  /** 上次烘用了多少毫秒。 */
  lastMs = 0;
  constructor() {
    this.mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: SKY_FS, depthTest: false, depthWrite: false, uniforms: { uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSize: { value: new THREE.Vector2(ENV_W, ENV_H) } } });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); q.frustumCulled = false; this.scene.add(q);
  }
  /** 太阳（实验室坐标，单位向量）变了才重烘；真烘了返回 true（血槽位按它记次数 / 毫秒）。 */
  ensure(renderer: any, sunLab: readonly [number, number, number]): boolean {
    const key = sunLab.map((x) => x.toFixed(4)).join(",");
    if (key === this.key && this.rt) return false;
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
