// created 2026-08-28 by Claude Opus 5 (subagent)
// #7 导出期 alpha 护栏（user 2026-08-23：软橡皮误擦 / 喷枪喷出界，白底看不见、discord 黑底才发现）。
// 本文件 = 阈值的**夹具床**：先枚举「正常」与「事故」两类画面，判据/阈值必须把两堆分开。
//   改 alpha-audit 的任何常数 → 先在这儿加一条夹具，别直接调数字。
import { describe, it } from "./runner.mjs";
import assert from "node:assert/strict";
import { auditExportAlpha, SOFT_CORE_RADIUS } from "../src/backend/algorithms/alpha-audit.ts";

const W = 256, H = 256;

// ── 夹具工具（纯字节；alpha 是唯一变量，RGB 一律填个肉色，护栏只看 α）──────────────────
function blank(w = W, h = H) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) { d[p * 4] = 240; d[p * 4 + 1] = 200; d[p * 4 + 2] = 180; }
  return d;
}
const setA = (d, w, x, y, a) => { d[(y * w + x) * 4 + 3] = a; };
const getA = (d, w, x, y) => d[(y * w + x) * 4 + 3];
/** 画一个圆盘，α 由 f(离圆心距离) 给；返回时 α 取 max（叠加不互相擦掉）。 */
function disc(d, w, h, cx, cy, r, f) {
  for (let y = Math.max(0, cy - r | 0); y < Math.min(h, cy + r + 1); y++) {
    for (let x = Math.max(0, cx - r | 0); x < Math.min(w, cx + r + 1); x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > r) continue;
      const a = f(dist);
      if (a > getA(d, w, x, y)) setA(d, w, x, y, a);
    }
  }
}
/** 软橡皮：圆心处擦到 minAlpha，边缘处不擦（α 取 min，与画笔的 max 相反）。 */
function softErase(d, w, h, cx, cy, r, minAlpha) {
  for (let y = Math.max(0, cy - r | 0); y < Math.min(h, cy + r + 1); y++) {
    for (let x = Math.max(0, cx - r | 0); x < Math.min(w, cx + r + 1); x++) {
      const dist = Math.hypot(x - cx, y - cy);
      if (dist > r) continue;
      const a = Math.round(minAlpha + (255 - minAlpha) * (dist / r));
      if (a < getA(d, w, x, y)) setA(d, w, x, y, a);
    }
  }
}
/** 抗锯齿实心圆盘：内部 255，最外 1.5px 按覆盖率渐变（正常插画的轮廓长这样）。 */
function aaDisc(d, w, h, cx, cy, r) {
  disc(d, w, h, cx, cy, r + 2, (dist) => {
    if (dist <= r - 0.75) return 255;
    if (dist >= r + 0.75) return 0;
    return Math.round(255 * (r + 0.75 - dist) / 1.5);
  });
}

describe("alpha-audit（#7 导出 alpha 护栏）", () => {
  // ── 正常画面：一条都不许报（报警疲劳 = 护栏死掉）────────────────────────────
  it("正常①硬边像素画（零半透明）不报", () => {
    const d = blank();
    for (let y = 60; y < 160; y++) for (let x = 60; x < 160; x++) setA(d, W, x, y, 255);
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.partial, 0, "无半透明像素");
    assert.equal(a.flagged, false);
  });

  it("正常②抗锯齿立绘（1-2px 软边）不报", () => {
    const d = blank();
    aaDisc(d, W, H, 128, 128, 80);
    const a = auditExportAlpha(d, W, H);
    assert.ok(a.partial > 300, `AA 边确实贡献了半透明像素（${a.partial}）`);
    assert.equal(a.suspicious, 0, "过渡带全部被解释掉");
    assert.equal(a.flagged, false);
  });

  it("正常③立绘 + 细软发梢（5px 宽软笔触伸出体外）不报", () => {
    const d = blank();
    aaDisc(d, W, H, 128, 128, 60);
    for (let k = 0; k < 12; k++) {                    // 12 根发梢，各长 40px、宽 5px、尖端渐隐
      const ang = (k / 12) * Math.PI * 2;
      for (let s = 0; s < 40; s++) {
        const cx = 128 + Math.cos(ang) * (58 + s), cy = 128 + Math.sin(ang) * (58 + s);
        disc(d, W, H, cx, cy, 2.5, () => Math.round(200 * (1 - s / 40)));
      }
    }
    const a = auditExportAlpha(d, W, H);
    assert.ok(a.partial > 2000, `发梢是大片半透明（${a.partial}）`);
    assert.equal(a.suspicious, 0, "细笔触处处贴着透明 → 不算软面芯");
    assert.equal(a.flagged, false);
  });

  it("正常④整张软喷枪作品（没有硬边主体）不报", () => {
    const d = blank();
    disc(d, W, H, 128, 128, 120, (dist) => Math.round(200 * (1 - dist / 120)));
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.hardEdged, false, "实心占比不足 → 不是本护栏管的场景");
    assert.equal(a.flagged, false);
  });

  it("正常⑤整幅不透明（画满底色）不报", () => {
    const d = blank();
    for (let p = 0; p < W * H; p++) d[p * 4 + 3] = 255;
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.partial, 0);
    assert.equal(a.clear, 0);
    assert.equal(a.flagged, false);
  });

  // ── 事故画面：必须报 ──────────────────────────────────────────────────
  it("事故①软橡皮误擦（实心身体中间一块凹陷）要报", () => {
    const d = blank();
    aaDisc(d, W, H, 128, 128, 90);
    // 软橡皮擦一下：半径 24 的软斑，α 从 255 掉到 ~120（白底上根本看不出来）
    softErase(d, W, H, 120, 130, 24, 120);
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.hardEdged, true, "身体仍是大面积实心");
    assert.ok(a.suspicious > 200, `凹陷芯被逮到（${a.suspicious}）`);
    assert.equal(a.flagged, true);
  });

  it("事故②喷枪喷出界（透明区一片淡雾）要报", () => {
    const d = blank();
    aaDisc(d, W, H, 100, 128, 70);
    disc(d, W, H, 215, 60, 22, () => 40);   // 离身体老远的一片 α=40 淡雾
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.hardEdged, true);
    assert.ok(a.suspicious > 200, `雾芯被逮到（${a.suspicious}）`);
    assert.equal(a.flagged, true);
  });

  it("事故③画满底色上误擦（全图无 α=0，护栏照样看得见）要报", () => {
    const d = blank();
    for (let p = 0; p < W * H; p++) d[p * 4 + 3] = 255;
    softErase(d, W, H, 128, 128, 26, 100);
    const a = auditExportAlpha(d, W, H);
    assert.equal(a.clear, 0, "一个全透明像素都没有");
    assert.ok(a.suspicious > 200);
    assert.equal(a.flagged, true);
  });

  // ── 契约细节 ────────────────────────────────────────────────────────
  it("只读：不改输入一个字节；直方图 256 桶且总数守恒", () => {
    const d = blank();
    aaDisc(d, W, H, 128, 128, 60);
    const before = new Uint8ClampedArray(d);
    const a = auditExportAlpha(d, W, H);
    assert.deepEqual([...d], [...before], "输入未被改写");
    assert.equal(a.histogram.length, 256);
    assert.equal(a.histogram.reduce((s, n) => s + n, 0), W * H, "直方图总数 = 像素数");
    assert.equal(a.clear + a.partial + a.opaque, W * H, "三分类总数 = 像素数");
    assert.equal(a.ink, a.partial + a.opaque);
  });

  it("过渡带宽度边界：≤2R 宽的软带算正常，更宽的算可疑", () => {
    // 一条竖软带夹在「左实心 / 右透明」之间：带宽 2R 时最中间那列离两边恰好各 R（不 > R）→ 正常
    const mk = (band) => {
      const w = 64, h = 32, d = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < 20; x++) setA(d, w, x, y, 255);
        for (let x = 0; x < band; x++) setA(d, w, 20 + x, y, 128);
      }
      return auditExportAlpha(d, w, h);
    };
    assert.equal(mk(2 * SOFT_CORE_RADIUS).suspicious, 0, `${2 * SOFT_CORE_RADIUS}px 带 = 过渡带`);
    assert.ok(mk(2 * SOFT_CORE_RADIUS + 1).suspicious > 0, `${2 * SOFT_CORE_RADIUS + 1}px 起 = 软面芯`);
  });
});
