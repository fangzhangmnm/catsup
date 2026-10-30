// minccino/backend/three/paper-shader.ts —— 平涂（剪纸 · 色纸）的面材质 + 地面背景（Tron 第 1 步）。实验室 overrides/flat/flat.js 的 FS / BG_FS 里
// 剪纸 · 色纸用到的那几段原样移植：明暗 = 光跟着相机（视空间）、色阶 + 交界软硬 + 渐变、阴影乘偏色、明暗强度；遮蔽 = ao-bake.ts 的 aoAt。
// 刻面感 1 = 面法线（屏幕导数求，和实验室的面法线一样朝着看的这一侧）。颜色 = 顶点色（材质色；没上色的面由 ChunkStyle 给纸色 = 实验室「一件一色」：
// 只认零件色、印不出贴图）。地面 = 一遍全屏：像素射线打到 z = 0 平面（CatsUp 的地面），地上的多重阴影 = 同一份遮蔽、半径放长。
// created 2026-10-29 by Claude Opus 5.5
import * as THREE from "three";
import { AO_GLSL, type AoUniforms } from "./ao-bake.ts";
import type { FlatShade } from "../../preset/index.ts";

const PAPER_VS = /* glsl */`
  in vec3 aColor;
  #ifndef SINGLE
  in vec3 aColorB;
  out vec3 vColorB;
  #endif
  out vec3 vColor; out vec3 vPosV; out vec3 vPosW;
  void main() {
    vColor = aColor;
    #ifndef SINGLE
    vColorB = aColorB;
    #endif
    vec4 pw = modelMatrix * vec4(position, 1.0); vPosW = pw.xyz;
    vec4 pv = viewMatrix * pw; vPosV = pv.xyz;
    gl_Position = projectionMatrix * pv;
  }`;

const PAPER_FS = /* glsl */`
  precision highp float;
  in vec3 vColor; in vec3 vPosV; in vec3 vPosW;
  uniform vec3 uMark;
  #ifndef SINGLE
  in vec3 vColorB;
  #endif
  uniform vec3 uLight, uShadowTint, uBase, uDefaultFace;
  uniform bool uModelColor;
  uniform float uSteps, uSoft, uContrast, uRamp, uAoAmt;
  uniform bool uAoOn;
  layout(location = 0) out vec4 oColor;
  ${AO_GLSL}
  void main() {
    #ifdef SINGLE
    vec3 c = uBase;   // 贴图面：一件一色印不出贴图 = 纸本色
    #else
    vec3 c = gl_FrontFacing ? vColor : vColorB;   // 两个表面（DT8）；负值 = 那侧归贴图网格画
    if (c.r < 0.0) discard;
    // 没上色的面 = 纸色。过渡做法：颜色还烤在顶点色里，白模灰（PALETTE.face，8 位量化后差不到 1/127）认出来换成纸色——
    // 换风格不用重建池网格；材质模块接上槽表（baseColor 默认）后退役
    if (all(lessThan(abs(c - uDefaultFace), vec3(0.006)))) c = uBase;
    if (!uModelColor) c = uBase;   // 预设「不上色」（1-bit 线稿：材质一律纸色，user 10-29「材质是白的，干净好看」）；选中 / 悬停 / 淡出照旧走下面的标记色
    #endif
    #ifdef SEL
    c = uMark;   // 标记（选中 / 悬停）：换成状态色（刀 b；这个风格的材质表 = 替换）
    #endif
    #ifdef DIM
    c = mix(c, uMark, 0.5);   // 淡出（上下文之外）：往淡出色拉一半（刀 c）
    #endif
    vec3 N = normalize(cross(dFdx(vPosV), dFdy(vPosV)));   // 刻面感 1：面法线，朝着看的这一侧
    float q = (dot(N, uLight) * 0.5 + 0.5) * uSteps;
    float sw = max(uSoft, 0.75 * fwidth(q));
    float lv = (floor(q) + smoothstep(0.5 - sw, 0.5 + sw + 1e-4, fract(q))) / uSteps;
    lv = mix(clamp(lv, 0.0, 1.0), smoothstep(0.0, 1.0, q / uSteps), uRamp);
    vec3 col = mix(c, mix(c * uShadowTint, c, lv), uContrast);   // 阴影乘偏色；明暗强度 0 = 纯色
    if (uAoOn) col *= mix(1.0, aoAt(vPosW, normalize((vec4(N, 0.0) * viewMatrix).xyz)), uAoAmt);
    oColor = vec4(col, 1.0);
  }`;

const GROUND_VS = /* glsl */`
  out vec2 vNdc;
  void main() { vNdc = position.xy; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const GROUND_FS = /* glsl */`
  precision highp float;
  in vec2 vNdc;
  uniform mat4 uInvVP;
  uniform vec3 uBg, uGround, uLine, uFade;
  uniform float uGroundOn, uAoAmt, uGrid, uGridR;
  uniform bool uAoOn, uGlowPass;
  layout(location = 0) out vec4 oColor;
  ${AO_GLSL}
  // Tron 的地格（实验室 tron.js BG_FS）：小格 1/4、大格 1（场景半径 = 1），按到相机的距离淡出
  float gridLine(vec2 g) { vec2 fw = max(fwidth(g), vec2(1e-4)); vec2 a = abs(fract(g - 0.5) - 0.5) / fw; return (1.0 - min(min(a.x, a.y), 1.0)) * (1.0 - smoothstep(0.2, 0.7, max(fw.x, fw.y))); }
  void main() {
    vec4 a = uInvVP * vec4(vNdc, -1.0, 1.0), b = uInvVP * vec4(vNdc, 1.0, 1.0);
    vec3 p0 = a.xyz / a.w, d = b.xyz / b.w - p0;
    vec3 g = p0 + d * (d.z < -1e-9 ? -p0.z / d.z : 0.0);
    vec2 q = g.xy / uGridR;
    float gSmall = gridLine(q * 4.0), gBig = gridLine(q);   // 导数在分支外面求
    vec3 col = uBg, glow = vec3(0.0);
    if (d.z < -1e-9 && p0.z > 0.0) {   // 往下看、起点在地面以上：打到 z = 0
      col = mix(uBg, uGround, uGroundOn);
      if (uAoOn) col *= mix(1.0, aoAt(g, vec3(0.0, 0.0, 1.0)), uAoAmt);   // 模型压在地上的多重阴影
      if (uGrid > 0.0) {
        float al = max(gSmall * 0.3, gBig) * exp(-0.22 * length(g - uFade) / uGridR) * uGrid;
        col = mix(col, uLine, al * 0.55); glow = uLine * al * 0.3;
      }
    }
    oColor = uGlowPass ? vec4(glow, 1.0) : vec4(col, 1.0);
  }`;

const srgb3 = (hex: number): any => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

/** 平涂的一组材质（同一套 uniform 对象：换参数 / 遮蔽烘好，大家一起变）。 */
export class PaperMaterials {
  private readonly shade = { uLight: { value: new THREE.Vector3(0, 0, 1) }, uShadowTint: { value: new THREE.Vector3(1, 1, 1) }, uBase: { value: new THREE.Vector3(1, 1, 1) }, uDefaultFace: { value: new THREE.Vector3() }, uModelColor: { value: true }, uSteps: { value: 1 }, uSoft: { value: 0.1 }, uContrast: { value: 1 }, uRamp: { value: 0 } };
  private readonly aoModel = { uAoRadius: { value: 0.5 }, uAoSoft: { value: 1 }, uAoAmt: { value: 0 }, uAoOn: { value: false } };
  private readonly aoGround = { uAoRadius: { value: 0.2 }, uAoSoft: { value: 1 }, uAoAmt: { value: 0 }, uAoOn: { value: false } };
  private readonly mats = new Map<string, any>();
  readonly ground: any;
  private readonly groundU: { uInvVP: { value: any }; uBg: { value: any }; uGround: { value: any }; uGroundOn: { value: number }; uLine: { value: any }; uFade: { value: any }; uGrid: { value: number }; uGridR: { value: number }; uGlowPass: { value: boolean } };
  /** @param defaultFace 白模没上色的面那个灰（0xRRGGBB；认出来换成纸色） */
  constructor(private readonly ao: AoUniforms, private readonly depthFace: number, private readonly depthOther: number, defaultFace: number) {
    this.shade.uDefaultFace.value.copy(srgb3(defaultFace));
    this.groundU = { uInvVP: { value: new THREE.Matrix4() }, uBg: { value: new THREE.Vector3() }, uGround: { value: new THREE.Vector3() }, uGroundOn: { value: 1 }, uLine: { value: new THREE.Vector3() }, uFade: { value: new THREE.Vector3() }, uGrid: { value: 0 }, uGridR: { value: 1 }, uGlowPass: { value: false } };
    const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: GROUND_VS, fragmentShader: GROUND_FS, depthTest: false, depthWrite: false, uniforms: { ...this.groundU, ...this.aoGround, ...ao } });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.ground.frustumCulled = false; this.ground.renderOrder = -100; this.ground.visible = false;
  }
  /** 面材质：single = 贴图网格那份（只有 aColor）；side / 深度偏移按槽（活动池 / 别的池、单面 / 双面）。 */
  face(side: "front" | "back" | "double", active: boolean, single: boolean): any {
    const key = `${side}|${active ? 1 : 0}|${single ? 1 : 0}`;
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: PAPER_VS, fragmentShader: PAPER_FS, defines: single ? { SINGLE: 1 } : {},
        uniforms: { ...this.shade, ...this.aoModel, ...this.ao },
        side: side === "front" ? THREE.FrontSide : side === "back" ? THREE.BackSide : THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: active ? this.depthFace : this.depthOther,
      });
      this.mats.set(key, m);
    }
    return m;
  }
  /** 面用不用模型的颜色（预设 colorize：none = 一律纸色）。 */
  useModelColor(on: boolean): void { this.shade.uModelColor.value = on; }
  /** 每帧：光（视空间，跟着相机）、参数、遮蔽开没开；地面的逆矩阵。 */
  sync(f: FlatShade, ao: { amount: number; radius: number; groundRadius: number; soft: number } | null, aoReady: boolean, ground: { color: number; on: number; grid: number } | null, background: number, cam: any,
    grid: { line: number; r: number; fade: { x: number; y: number; z: number } } | null = null): void {
    const az = f.lightAz * Math.PI / 180, el = f.lightEl * Math.PI / 180;
    this.shade.uLight.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));   // 光跟着相机走（实验室原式，视空间）
    this.shade.uShadowTint.value.copy(srgb3(f.shadowTint)); this.shade.uBase.value.copy(srgb3(f.base)); this.shade.uSteps.value = f.steps; this.shade.uSoft.value = f.soft;
    this.shade.uContrast.value = f.contrast; this.shade.uRamp.value = f.ramp;
    const on = !!ao && aoReady;
    this.aoModel.uAoOn.value = on; this.aoGround.uAoOn.value = on;
    if (ao) {
      this.aoModel.uAoAmt.value = ao.amount; this.aoModel.uAoRadius.value = ao.radius; this.aoModel.uAoSoft.value = ao.soft;
      this.aoGround.uAoAmt.value = ao.amount; this.aoGround.uAoRadius.value = ao.groundRadius; this.aoGround.uAoSoft.value = ao.soft;
    }
    this.ground.visible = true;
    this.groundU.uBg.value.copy(srgb3(background));
    this.groundU.uGround.value.copy(srgb3(ground?.color ?? background)); this.groundU.uGroundOn.value = ground ? ground.on : 0;
    this.groundU.uInvVP.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).invert();
    this.groundU.uGrid.value = ground && grid ? ground.grid : 0;
    if (grid) { this.groundU.uLine.value.copy(srgb3(grid.line)); this.groundU.uGridR.value = Math.max(grid.r, 1e-6); this.groundU.uFade.value.set(grid.fade.x, grid.fade.y, grid.fade.z); }
    this.groundU.uGlowPass.value = false;
  }
  /** 辉光那遍：地面只出地格的光。 */
  setGlowPass(on: boolean): void { this.groundU.uGlowPass.value = on; }
  hide(): void { this.ground.visible = false; }
  dispose(): void { for (const m of this.mats.values()) m.dispose(); this.ground.material.dispose(); this.ground.geometry.dispose(); }
}
