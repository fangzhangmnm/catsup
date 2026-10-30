// minccino/backend/three/bloom.ts —— 辉光（后处理挂点；CRT Tron）：实验室 overrides/lines/tron.js 的「发光四级降采样 + 每级横竖高斯 + 合成」移植。
// 辉光图（小图尺寸，半精度）由 render3 画（场景再画一遍、面只出轮廓光）；这里：四级 w>>1…w>>4，每级 4 抽头降采样 → 横 → 竖 9 抽头高斯（半径 = 预设），
// 合成 = 颜色 + 四级加权（0.30 / 0.30 / 0.25 / 0.25）× 辉光 × 1.6，tanh 软削顶（辉光上限），暗角。和实验室不一样：没有余辉 / 磁场 / 4:3 外框 / 彩色片（复古那份预设都关着）。
// created 2026-10-29 by Claude Opus 5.5
import * as THREE from "three";

const VS = /* glsl */`void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const DOWN_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uSrc; uniform vec2 uTexel, uDst;
  layout(location = 0) out vec4 oColor;
  void main() {
    vec2 uv = gl_FragCoord.xy / uDst;
    oColor = vec4(0.25 * (textureLod(uSrc, uv + uTexel * vec2(-1.0, -1.0), 0.0).rgb + textureLod(uSrc, uv + uTexel * vec2(1.0, -1.0), 0.0).rgb
                        + textureLod(uSrc, uv + uTexel * vec2(-1.0, 1.0), 0.0).rgb + textureLod(uSrc, uv + uTexel * vec2(1.0, 1.0), 0.0).rgb), 1.0);
  }`;
const BLUR_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uSrc; uniform vec2 uDir, uDst;
  layout(location = 0) out vec4 oColor;
  vec3 s(vec2 uv, float k) { return textureLod(uSrc, uv + uDir * k, 0.0).rgb; }
  void main() {
    vec2 uv = gl_FragCoord.xy / uDst;
    oColor = vec4(s(uv, 0.0) * 0.2270270 + (s(uv, 1.3846154) + s(uv, -1.3846154)) * 0.3162162 + (s(uv, 3.2307692) + s(uv, -3.2307692)) * 0.0702703, 1.0);
  }`;
const COMPOSITE_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uColor, uB0, uB1, uB2, uB3; uniform float uBloom, uVignette, uGlowCap; uniform vec2 uDst;
  layout(location = 0) out vec4 oColor;
  void main() {
    vec2 uv = gl_FragCoord.xy / uDst;
    vec3 c = texelFetch(uColor, ivec2(gl_FragCoord.xy), 0).rgb;
    vec3 b = textureLod(uB0, uv, 0.0).rgb * 0.30 + textureLod(uB1, uv, 0.0).rgb * 0.30 + textureLod(uB2, uv, 0.0).rgb * 0.25 + textureLod(uB3, uv, 0.0).rgb * 0.25;
    b *= uBloom * 1.6;
    float m = max(max(b.r, b.g), b.b);
    if (m > 1e-4) b *= uGlowCap * tanh(m / uGlowCap) / m;   // 辉光上限：软削顶，只压最亮的那一截
    c += b;
    c *= 1.0 - uVignette * smoothstep(0.45, 1.35, length(uv * 2.0 - 1.0));
    oColor = vec4(c, 1.0);
  }`;

export interface BloomParams { readonly amount: number; readonly radius: number; readonly cap: number; readonly vignette: number }

export class Bloom {
  /** 辉光图（render3 往里画）：小图尺寸、半精度、自己的深度（被挡住的线不发光）。 */
  glow: any = null;
  private levels: { w: number; h: number; a: any; b: any }[] = [];
  private w = 0; private h = 0;
  private readonly scene = new THREE.Scene();
  private readonly cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: any;
  private readonly down: any; private readonly blur: any; private readonly comp: any;
  constructor() {
    const mk = (fs: string, uniforms: Record<string, { value: unknown }>): any => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
    this.down = mk(DOWN_FS, { uSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uDst: { value: new THREE.Vector2() } });
    this.blur = mk(BLUR_FS, { uSrc: { value: null }, uDir: { value: new THREE.Vector2() }, uDst: { value: new THREE.Vector2() } });
    this.comp = mk(COMPOSITE_FS, { uColor: { value: null }, uB0: { value: null }, uB1: { value: null }, uB2: { value: null }, uB3: { value: null }, uBloom: { value: 1 }, uVignette: { value: 0 }, uGlowCap: { value: 2 }, uDst: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.down);
    this.quad.frustumCulled = false; this.scene.add(this.quad);
  }
  prepare(w: number, h: number): void {
    if (this.glow && this.w === w && this.h === h) return;
    this.disposeTargets();
    const half = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    this.glow = new THREE.WebGLRenderTarget(w, h, { ...half, depthBuffer: true });
    for (let i = 1; i <= 4; i++) {
      const lw = Math.max(1, w >> i), lh = Math.max(1, h >> i);
      this.levels.push({ w: lw, h: lh, a: new THREE.WebGLRenderTarget(lw, lh, { ...half, depthBuffer: false }), b: new THREE.WebGLRenderTarget(lw, lh, { ...half, depthBuffer: false }) });
    }
    this.w = w; this.h = h;
  }
  private pass(renderer: any, mat: any, target: any): void { this.quad.material = mat; renderer.setRenderTarget(target); renderer.render(this.scene, this.cam); }
  /** 辉光图 → 四级模糊 → 和颜色合成进 target（小图尺寸）。 */
  run(renderer: any, color: any, target: any, p: BloomParams): void {
    let src = this.glow.texture, sw = this.w, sh = this.h;
    for (const L of this.levels) {
      const d = this.down.uniforms, b = this.blur.uniforms;
      d.uSrc.value = src; d.uTexel.value.set(1 / sw, 1 / sh); d.uDst.value.set(L.w, L.h); this.pass(renderer, this.down, L.a);
      b.uDst.value.set(L.w, L.h);
      b.uSrc.value = L.a.texture; b.uDir.value.set(p.radius / L.w, 0); this.pass(renderer, this.blur, L.b);
      b.uSrc.value = L.b.texture; b.uDir.value.set(0, p.radius / L.h); this.pass(renderer, this.blur, L.a);
      src = L.a.texture; sw = L.w; sh = L.h;
    }
    const c = this.comp.uniforms;
    c.uColor.value = color; this.levels.forEach((L, i) => { c[`uB${i}`].value = L.a.texture; });
    c.uBloom.value = p.amount; c.uVignette.value = p.vignette; c.uGlowCap.value = p.cap; c.uDst.value.set(this.w, this.h);
    this.pass(renderer, this.comp, target);
  }
  /** 显存（血槽位）：辉光图 8 字节 / 像素（半精度 RGBA）+ 深度 4 + 四级 × 2 张。 */
  bytes(): number { let b = this.w * this.h * 12; for (const L of this.levels) b += L.w * L.h * 16; return b; }
  private disposeTargets(): void { this.glow?.dispose(); for (const L of this.levels) { L.a.dispose(); L.b.dispose(); } this.glow = null; this.levels = []; }
  /** 只放显存（辉光整串）；材质留着，下次 prepare 重建（常驻表 residency.ts 调）。 */
  release(): void { this.disposeTargets(); this.w = this.h = 0; }
  dispose(): void { this.disposeTargets(); for (const m of [this.down, this.blur, this.comp]) m.dispose(); this.quad.geometry.dispose(); }
}
