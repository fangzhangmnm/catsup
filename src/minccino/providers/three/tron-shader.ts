// minccino/backend/three/tron-shader.ts —— CRT Tron 的面 / 线材质（Tron 第 1 步第三个风格；实验室 overrides/lines/tron.js「青 Tron · 复古」移植）。
// 面：不借模型颜色，正面 / 背面两个深色，按一盏钉在视空间的光分一点明暗（0.5 + 0.7·lam，强度 shade），刻面感 1，掠射处的轮廓光进辉光。
// 线：实验室在面着色器里按重心坐标画边；CatsUp 的边本来就是单独的线几何（硬边 / 轮廓按实例判，profile-line-shader），所以这里给那份几何换 Tron 的线材质：
//   青色、1 个画面像素宽（画面 = 小图）、轮廓 ×1.3。坑：LineSegments2 画之前拿 renderer.getViewport()（画布的 CSS 视口）当分辨率，不管当前画进的是小图——
//   所以线宽要乘「画布 CSS 高 ÷ 小图高」才是小图上的像素（不乘 = 只有四分之一宽，斜线断成点；2026-10-29 截图基线抓到的）；「线芯发白」实验室是按离线中心的距离渐白，1 像素线几乎整根都在芯里，这里取整根 mix(线色, 白, core)——近似，待 user 看。
// 被挡住的边：同一份线几何再画一遍，深度测试反过来（GREATER）、半透明；实验室是 8 像素一节的虚线，这里先实线（LineMaterial 的虚线要另算线段距离，没接）。
// 辉光那遍（uGlowPass）：面只出轮廓光（底色不进辉光，实验室 uFaceBloom 0），线出全色、被挡的边 × 0.4。
// 选中 / 悬停的面：风格认领（不变量 7「Tron = Clu 橙」）——底色往橙色拉一半、辉光里也有一点橙。
// created 2026-10-29 by Claude Opus 5.5
import * as THREE from "three";
import { LineMaterial } from "../../../vendor/three/addons/lines/LineMaterial.js";
import { PROFILE_LINE_VERTEX } from "./profile-line-shader.ts";
import { contourLineMaterial } from "./contour-line-material.ts";
import type { TronShade } from "../../preset/index.ts";

const TRON_VS = /* glsl */`
  in vec3 aColor;
  #ifndef SINGLE
  in vec3 aColorB;
  out vec3 vColorB;
  #endif
  out vec3 vColor; out vec3 vPosV;
  void main() {
    vColor = aColor;
    #ifndef SINGLE
    vColorB = aColorB;
    #endif
    vec4 pv = viewMatrix * modelMatrix * vec4(position, 1.0); vPosV = pv.xyz;
    gl_Position = projectionMatrix * pv;
  }`;
const TRON_FS = /* glsl */`
  precision highp float;
  in vec3 vColor; in vec3 vPosV;
  #ifndef SINGLE
  in vec3 vColorB;
  #endif
  uniform vec3 uLine, uFace, uBack, uSel;
  uniform float uShade, uRim, uRimPow;
  uniform bool uGlowPass;
  layout(location = 0) out vec4 oColor;
  uniform vec3 uMark;
  void main() {
    #ifndef SINGLE
    vec3 c = gl_FrontFacing ? vColor : vColorB;
    if (c.r < 0.0) discard;   // 那一侧归贴图网格画
    #endif
    vec3 N = normalize(cross(dFdx(vPosV), dFdy(vPosV))), V = normalize(-vPosV);   // 刻面感 1：面法线，朝着看的这一侧
    float lam = max(dot(N, normalize(vec3(-0.35, 0.8, 0.5))), 0.0);
    vec3 base = (gl_FrontFacing ? uFace : uBack) * mix(1.0, 0.5 + 0.7 * lam, uShade);
    vec3 glow = uLine * pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPow) * uRim;   // 轮廓光（实验室 faceGlow，扫描线那项没接：CatsUp 按需画、不常驻循环）
    #ifdef SEL
    base = mix(base, uSel, 0.45); glow += uSel * 0.25;   // 选中：风格认领成 Clu 橙
    #endif
    #ifdef DIM
    base = mix(base, uMark, 0.5); glow *= 0.5;   // 淡出（上下文之外）：往淡出色拉一半、轮廓光减半（刀 c）
    #endif
    oColor = uGlowPass ? vec4(glow, 1.0) : vec4(base + glow, 1.0);
  }`;

const hex3 = (h: number): any => new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);

export class TronMaterials {
  private readonly u = { uLine: { value: new THREE.Vector3() }, uFace: { value: new THREE.Vector3() }, uBack: { value: new THREE.Vector3() }, uSel: { value: new THREE.Vector3() }, uShade: { value: 0.5 }, uRim: { value: 0 }, uRimPow: { value: 3 }, uGlowPass: { value: false } };
  private readonly faces = new Map<string, any>();
  private readonly profileAdd = { value: 0 };
  readonly lineThick: any; readonly linePixel: any; readonly hiddenThick: any; readonly hiddenPixel: any;
  private hidden = 0.12;
  constructor(private readonly depthFace: number, private readonly depthOther: number) {
    this.lineThick = new LineMaterial({ color: 0xffffff, linewidth: 1, vertexColors: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
    this.lineThick.vertexShader = PROFILE_LINE_VERTEX; this.lineThick.uniforms.profileAdd = this.profileAdd;   // 轮廓加粗照 SU 轮廓线那套（按实例判剪影）
    this.linePixel = contourLineMaterial({ color: 0xffffff });   // 软边只在外轮廓时画（I12）
    this.hiddenThick = new LineMaterial({ color: 0xffffff, linewidth: 1, vertexColors: false, transparent: true, opacity: 0.12, depthWrite: false, depthFunc: THREE.GreaterDepth });
    this.hiddenThick.vertexShader = PROFILE_LINE_VERTEX; this.hiddenThick.uniforms.profileAdd = { value: 0 };   // 软边只在外轮廓时画（I12）；隐线不加粗
    this.hiddenPixel = contourLineMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, depthFunc: THREE.GreaterDepth });
  }
  /** 面材质：side / 深度偏移按槽；single = 贴图网格（只有 aColor）；sel = 选中 / 悬停的那份（认领色）。 */
  face(side: "front" | "back" | "double", active: boolean, single: boolean, sel = false): any {
    const key = `${side}|${active ? 1 : 0}|${single ? 1 : 0}|${sel ? 1 : 0}`;
    let m = this.faces.get(key);
    if (!m) {
      const defines: Record<string, number> = {}; if (single) defines.SINGLE = 1; if (sel) defines.SEL = 1;
      m = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: TRON_VS, fragmentShader: TRON_FS, defines, uniforms: { ...this.u },
        side: side === "front" ? THREE.FrontSide : side === "back" ? THREE.BackSide : THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: active ? this.depthFace : this.depthOther,
      });
      this.faces.set(key, m);
    }
    return m;
  }
  /** 每帧：参数 + 线宽换算（pxScale = 画布 CSS 高 ÷ 小图高：LineSegments2 按画布视口算像素，见文件头）。 */
  sync(t: TronShade, pxScale: number): void {
    const line = hex3(t.line), lineC = line.clone().lerp(new THREE.Vector3(1, 1, 1), t.core);   // 线芯发白：1 像素线整根取 mix（见文件头）
    this.u.uLine.value.copy(line); this.u.uFace.value.copy(hex3(t.face)); this.u.uBack.value.copy(hex3(t.back)); this.u.uSel.value.copy(hex3(t.select));
    this.u.uShade.value = t.shade; this.u.uRim.value = t.rim; this.u.uRimPow.value = t.rimPower;
    for (const m of [this.lineThick, this.linePixel]) m.color.setRGB(lineC.x, lineC.y, lineC.z, THREE.SRGBColorSpace);
    for (const m of [this.hiddenThick, this.hiddenPixel]) m.color.setRGB(line.x, line.y, line.z, THREE.SRGBColorSpace);
    // 粗线（屏幕空间四边形）正好 1 像素宽时斜线偶尔漏像素；实验室的线带一圈 ±0.6 像素的软边，这里加宽 0.25 像素
    const lw = (t.widthPx + 0.25) * pxScale;
    this.lineThick.linewidth = lw; this.hiddenThick.linewidth = lw;
    this.profileAdd.value = Math.max(0, (t.profile - 1) * t.widthPx) * pxScale;
    this.hidden = t.hidden; this.setGlowPass(false);
  }
  /** 辉光那遍：面只出轮廓光，被挡住的边 × 0.4（实验室 oGlow = uLine · a · 0.4）。 */
  setGlowPass(on: boolean): void {
    this.u.uGlowPass.value = on;
    const a = on ? this.hidden * 0.4 : this.hidden;
    this.hiddenThick.opacity = a; this.hiddenPixel.opacity = a;
  }
  dispose(): void { for (const m of this.faces.values()) m.dispose(); for (const m of [this.lineThick, this.linePixel, this.hiddenThick, this.hiddenPixel]) m.dispose(); }
}
