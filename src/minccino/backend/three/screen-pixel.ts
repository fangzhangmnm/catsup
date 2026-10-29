// minccino/backend/three/screen-pixel.ts —— 风格那条路的两遍全屏：像素描边（后处理挂点）+ 整数倍最近邻放大（屏幕一刀的第一块屏）。
// 像素描边的 GLSL 照实验室公用件 `ShaderLab.pixelOutline`（lab/core.js，user 10-28 调过的判法和线色）移植；改的只有两处：
//   ① CatsUp 有正交相机：内部深度跳变的「按对面那格外推」在透视下用 1/z（屏幕上仿射）、正交下用 z 本身（也仿射）；透视那支和实验室逐字一样。
//   ② 背景格：实验室靠清屏色，这里小图清成全零、背景色在这遍补上（渲染目标里 three 不给背景做色彩换算，自己补最稳）。
// 放大那遍顺手把小图的深度写回画布（gl_FragDepth）：之后按原分辨率画的叠加层（网格、吸附、选中边）照样被模型挡。
// created 2026-10-29 by Claude Opus 5.5（Tron 纪元第 1 步）
import * as THREE from "three";
import type { PixelOutlinePost } from "../../preset/index.ts";

const FULLSCREEN_VS = /* glsl */`
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const OUTLINE_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uCol, uDepth;
  uniform vec3 uLineCol, uBg;
  uniform float uLineTint, uNear, uFar, uLineMul;
  uniform bool uInner, uDarkSide, uOrtho, uOn;
  uniform int uWidth;
  layout(location = 0) out vec4 oColor;   // three r185 的 GLSL3 不再替你定义 gl_FragColor，自己声明输出
  float viewZ(float d) { if (uOrtho) return uNear + d * (uFar - uNear); float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / ((uFar + uNear) - z * (uFar - uNear)); }
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy), hi = textureSize(uDepth, 0) - 1;
    float d = texelFetch(uDepth, p, 0).r;
    vec4 c = d < 1.0 ? texelFetch(uCol, p, 0) : vec4(uBg, 1.0);
    if (!uOn) { oColor = c; return; }
    const ivec2 K[4] = ivec2[4](ivec2(1, 0), ivec2(-1, 0), ivec2(0, 1), ivec2(0, -1));
    bool line = false; vec3 nb = c.rgb;
    float z = d < 1.0 ? viewZ(d) : 0.0, w = d < 1.0 ? 1.0 / z : 0.0;
    for (int s = 1; s <= 2; s++) {
      if (s > uWidth || line) break;
      for (int i = 0; i < 4; i++) {
        ivec2 q = clamp(p + K[i] * s, ivec2(0), hi);
        float dq = texelFetch(uDepth, q, 0).r;
        bool hit = d >= 1.0 ? dq < 1.0 : false;
        if (d < 1.0 && uInner && dq < 1.0) {
          float dr = texelFetch(uDepth, clamp(p - K[i] * s, ivec2(0), hi), 0).r;
          if (uOrtho) {   // 正交：z 在屏幕上仿射；邻居更近 4% 以上且外推对不上
            float zq = viewZ(dq), pred = dr < 1.0 ? 2.0 * z - viewZ(dr) : z;
            hit = zq * 1.04 < z && pred - zq > 0.03 * z;
          } else {        // 透视：1/z 仿射（实验室原式）
            float wq = 1.0 / viewZ(dq), pred = dr < 1.0 ? 2.0 * w - 1.0 / viewZ(dr) : w;
            hit = wq > w * 1.04 && wq - pred > 0.03 * w;
          }
        }
        if (hit && !line) { line = true; nb = texelFetch(uCol, q, 0).rgb; }
      }
    }
    if (uDarkSide && dot(c.rgb, vec3(0.299, 0.587, 0.114)) < dot(nb, vec3(0.299, 0.587, 0.114))) nb = c.rgb;
    vec3 lc = uLineMul <= 1.0 ? nb * uLineMul : mix(nb, vec3(1.0), uLineMul - 1.0);
    oColor = line ? vec4(mix(uLineCol, lc, uLineTint), 1.0) : c;
  }`;

const UPSCALE_FS = /* glsl */`
  precision highp float;
  uniform sampler2D uCol, uDepth;
  uniform int uK;
  layout(location = 0) out vec4 oColor;
  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy) / uK;
    oColor = texelFetch(uCol, p, 0);
    gl_FragDepth = texelFetch(uDepth, p, 0).r;
  }`;

const srgbVec = (hex: number): any => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

/** 小图（颜色 + 深度贴图）+ 描边后的小图 + 两遍全屏。尺寸变了才重建。 */
export class PixelScreen {
  private low: any = null;
  private post: any = null;
  private readonly quadScene: any;
  private readonly quadCam: any;
  private readonly quad: any;
  private readonly outlineMat: any;
  private readonly upscaleMat: any;
  /** 小图尺寸（设备像素 ÷ k，向上取整）和放大倍数 k。 */
  w = 0; h = 0; k = 1;
  constructor() {
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.outlineMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, fragmentShader: OUTLINE_FS, depthTest: false, depthWrite: false,
      uniforms: { uCol: { value: null }, uDepth: { value: null }, uLineCol: { value: new THREE.Vector3() }, uBg: { value: new THREE.Vector3() }, uLineTint: { value: 1 }, uNear: { value: 0.1 }, uFar: { value: 100 }, uLineMul: { value: 0.42 }, uInner: { value: false }, uDarkSide: { value: false }, uOrtho: { value: false }, uOn: { value: true }, uWidth: { value: 1 } },
    });
    this.upscaleMat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: FULLSCREEN_VS, fragmentShader: UPSCALE_FS, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true,
      uniforms: { uCol: { value: null }, uDepth: { value: null }, uK: { value: 1 } },
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }
  /** 按画布（设备像素）和放大倍数（设备像素）准备小图；返回小图的渲染目标（场景画进它）。 */
  prepare(W: number, H: number, k: number): any {
    const w = Math.max(1, Math.ceil(W / k)), h = Math.max(1, Math.ceil(H / k));
    if (!this.low || this.w !== w || this.h !== h) {
      this.low?.dispose(); this.post?.dispose();
      const nearest = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false };
      this.low = new THREE.WebGLRenderTarget(w, h, { ...nearest, depthBuffer: true, depthTexture: new THREE.DepthTexture(w, h) });
      this.post = new THREE.WebGLRenderTarget(w, h, { ...nearest, depthBuffer: false });
      this.w = w; this.h = h;
    }
    this.k = k;
    return this.low;
  }
  /** 小图 → 描边 → 放大进 `target`（null = 画布），深度一起写回。 */
  finish(renderer: any, target: any, o: { outline: PixelOutlinePost | null; background: number; near: number; far: number; ortho: boolean }): void {
    const u = this.outlineMat.uniforms, pl = o.outline;
    u.uCol.value = this.low.texture; u.uDepth.value = this.low.depthTexture;
    u.uBg.value.copy(srgbVec(o.background)); u.uOn.value = !!pl;
    if (pl) { u.uLineCol.value.copy(srgbVec(pl.color)); u.uLineTint.value = pl.tint; u.uLineMul.value = pl.shade; u.uDarkSide.value = pl.darkSide; u.uInner.value = pl.inner; u.uWidth.value = pl.width; }
    u.uNear.value = o.near; u.uFar.value = o.far; u.uOrtho.value = o.ortho;
    this.quad.material = this.outlineMat;
    renderer.setRenderTarget(this.post); renderer.render(this.quadScene, this.quadCam);
    const v = this.upscaleMat.uniforms;
    v.uCol.value = this.post.texture; v.uDepth.value = this.low.depthTexture; v.uK.value = this.k;
    this.quad.material = this.upscaleMat;
    renderer.setRenderTarget(target); renderer.render(this.quadScene, this.quadCam);
  }
  /** 显存估算（血槽位）：小图颜色 + 深度 + 描边后的小图。 */
  bytes(): number { return this.low ? this.w * this.h * (4 + 4 + 4) : 0; }
  dispose(): void { this.low?.dispose(); this.post?.dispose(); this.low = this.post = null; this.outlineMat.dispose(); this.upscaleMat.dispose(); this.quad.geometry.dispose(); }
}
