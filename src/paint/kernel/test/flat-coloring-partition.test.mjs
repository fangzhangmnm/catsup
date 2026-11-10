// 线稿分区管线（src/flat-coloring/，论文 Fourey–Tschumperlé–Revoy 2018）验收：
// EDT → 边界曲率/端点 → 样条闭合 → label map → 线下洋葱剥皮。
// 全合成图形、纯数组进出，node 直测无 DOM。
import { describe, it, assert, eq } from "./runner.mjs";

const { edtSquared } = await import("../src/backend/algorithms/flat-coloring/edt.ts");
const { traceBorderCycles, keypointsFromBinary } = await import("../src/backend/algorithms/flat-coloring/border.ts");
const { digitizeSpline, transitionCount, areaGuardOk } = await import("../src/backend/algorithms/flat-coloring/closing.ts");
const {
  binarizeLuma, buildPartitionFromBinary, regionMaskAt, attachInkDepth, DEFAULT_FLAT_COLORING_PARAMS,
  resolveInkBinarization,
} = await import("../src/backend/algorithms/flat-coloring/partition.ts");

// ---- 合成图形 helpers ----
function blank(w, h) { return new Uint8Array(w * h); }
function fillRect(Ib, w, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) Ib[y * w + x] = 1;
}
/** 圆环笔画；gapCenter/gapHalf（弧度）挖一个断口 */
function ring(w, h, cx, cy, r, thick, gapCenter = null, gapHalf = 0) {
  const Ib = blank(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - cx, dy = y - cy;
    if (Math.abs(Math.hypot(dx, dy) - r) > thick / 2) continue;
    if (gapCenter !== null) {
      let da = Math.atan2(dy, dx) - gapCenter;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      if (Math.abs(da) <= gapHalf) continue;
    }
    Ib[y * w + x] = 1;
  }
  return Ib;
}
/** 矩形描边（厚 2），顶边挖 [gx0,gx1] 断口 */
function rectOutlineWithGap(w, h, x0, y0, x1, y1, gx0, gx1) {
  const Ib = blank(w, h);
  fillRect(Ib, w, x0, y0, x1, y1);
  fillRect(Ib, w, x0 + 2, y0 + 2, x1 - 2, y1 - 2);
  for (let y = y0 + 2; y <= y1 - 2; y++) for (let x = x0 + 2; x <= x1 - 2; x++) Ib[y * w + x] = 0;
  for (let y = y0; y <= y0 + 1; y++) for (let x = gx0; x <= gx1; x++) Ib[y * w + x] = 0;
  return Ib;
}
const labelAt = (part, x, y) => part.labels[y * part.w + x];
const noClose = { ...DEFAULT_FLAT_COLORING_PARAMS, dmax: 0, smax: 0, erode: false };

describe("lineart · EDT（Meijster 距离平方）", () => {
  it("单 feature 点：距离平方 = 欧氏", () => {
    const w = 7, h = 5;
    const f = blank(w, h);
    f[2 * w + 3] = 1; // (3,2)
    const d = edtSquared(f, w, h);
    eq(d[2 * w + 3], 0, "feature 自身 0");
    eq(d[2 * w + 0], 9, "(0,2) → 3²");
    eq(d[0 * w + 0], 13, "(0,0) → 3²+2²");
    eq(d[4 * w + 6], 13, "(6,4) → 3²+2²");
  });
  it("两 feature 竞争取最近", () => {
    const w = 9, h = 3;
    const f = blank(w, h);
    f[1 * w + 0] = 1; f[1 * w + 8] = 1;
    const d = edtSquared(f, w, h);
    eq(d[1 * w + 3], 9, "(3,1) 归左");
    eq(d[1 * w + 6], 4, "(6,1) 归右");
  });
});

describe("lineart · 边界追踪与端点检测", () => {
  it("3×3 实心块：单环 12 边", () => {
    const Ib = blank(8, 8);
    fillRect(Ib, 8, 2, 2, 4, 4);
    const cycles = traceBorderCycles(Ib, 8, 8);
    eq(cycles.length, 1, "一个环");
    eq(cycles[0].length, 12, "周长 12 条边");
  });
  it("横杆 26×3：恰好两个端点，法线朝 ±x", () => {
    const Ib = blank(40, 16);
    fillRect(Ib, 40, 4, 6, 29, 8);
    const kps = keypointsFromBinary(Ib, 40, 16, { kernelL: 5, thetaKappa: 0.18 });
    eq(kps.length, 2, `两端各一个端点（实得 ${kps.map((k) => `(${k.x},${k.y})κ${k.kappa.toFixed(2)}`).join(" ")}）`);
    const left = kps[0].x < kps[1].x ? kps[0] : kps[1];
    const right = kps[0].x < kps[1].x ? kps[1] : kps[0];
    assert(left.x <= 6 && right.x >= 27, "端点位于两端");
    assert(left.nx < -0.7, `左端法线朝 -x（实得 ${left.nx.toFixed(2)},${left.ny.toFixed(2)}）`);
    assert(right.nx > 0.7, `右端法线朝 +x（实得 ${right.nx.toFixed(2)},${right.ny.toFixed(2)}）`);
  });
  it("实心方块：分区仍是 1 个区域（角点即使被检出也不许被桥接）", () => {
    const Ib = blank(40, 40);
    fillRect(Ib, 40, 5, 5, 34, 34);
    const part = buildPartitionFromBinary(Ib, 40, 40);
    eq(part.regionCount, 1, "背景一个区域");
    eq(labelAt(part, 0, 0), 1, "角落 label 1");
    eq(labelAt(part, 20, 20), 1, "方块内部被洋葱剥皮吃进同一区");
  });
});

describe("lineart · 样条与 τ 相交测试", () => {
  it("对置端点的样条 ≈ 直线连接", () => {
    const s = { x: 10, y: 10, nx: 1, ny: 0, kappa: 1 };
    const t = { x: 20, y: 10, nx: -1, ny: 0, kappa: 1 };
    const path = digitizeSpline(s, t, 1.0, 32, 32);
    eq(path[0], 10 * 32 + 10, "起点");
    eq(path[path.length - 1], 10 * 32 + 20, "终点");
    for (const p of path) assert(Math.abs(((p / 32) | 0) - 10) <= 1, "路径贴着 y=10");
    for (let i = 1; i < path.length; i++) {
      const ax = path[i - 1] % 32, ay = (path[i - 1] / 32) | 0;
      const bx = path[i] % 32, by = (path[i] / 32) | 0;
      assert(Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1, "8-连通");
    }
  });
  it("transitionCount：离开一次+进入一次=2；穿墙=4", () => {
    const w = 16;
    const img = blank(w, 1);
    img[2] = 1; img[3] = 1; img[12] = 1;          // 左笔画 + 右笔画
    const path = [];
    for (let x = 3; x <= 12; x++) path.push(x);   // 从左笔画尾到右笔画头
    eq(transitionCount(path, img), 2, "干净桥 = 2");
    img[7] = 1;                                    // 中间加一堵墙
    eq(transitionCount(path, img), 4, "穿墙 = 4");
  });
});

describe("lineart · 断口闭合与分区（论文主张：不闭合就没有可用分区）", () => {
  it("断口圆（缝 ~6px）：闭合后内外分区；关掉闭合则内外同区", () => {
    const w = 64, h = 64;
    const Ib = ring(w, h, 32, 32, 20, 3, 0, 3 / 20); // 断口朝 +x，弧长 ~6px
    const open = buildPartitionFromBinary(Ib, w, h, noClose);
    eq(labelAt(open, 32, 32), labelAt(open, 2, 2), "不闭合：内外漏通");
    const part = buildPartitionFromBinary(Ib, w, h);
    assert(part.regionCount >= 2, "闭合后至少内外两区");
    assert(labelAt(part, 32, 32) !== labelAt(part, 2, 2), "闭合后内外分开");
    // v0.7.4 调试视图数据：端点+被采纳的桥都要在
    assert(part.keypoints.length >= 2, `断口两侧应有端点（实得 ${part.keypoints.length}）`);
    assert(part.bridges.some((b) => b.ok && b.px.length >= 2), "至少一条被采纳的桥");
  });
  it("缺口矩形框（缝 9px）：同上", () => {
    const w = 64, h = 48;
    const Ib = rectOutlineWithGap(w, h, 8, 8, 55, 40, 28, 36);
    const open = buildPartitionFromBinary(Ib, w, h, noClose);
    eq(labelAt(open, 30, 24), labelAt(open, 2, 2), "不闭合：漏通");
    const part = buildPartitionFromBinary(Ib, w, h);
    assert(labelAt(part, 30, 24) !== labelAt(part, 2, 2), "闭合后内外分开");
  });
  it("碎区守卫早退防污染（v0.7.6 真机指尖误毙回归）：大区多探测点不误判", () => {
    // 不对称 U 型 1px 走廊共 41 格（左臂16+底9+右臂16），amin=30 → 41≥30 理应放行。
    // 旧 bug：探测点1从左口 flood 数到 30 早退、残标留场；探测点2从右口 flood 撞残标当墙，
    // 只数到右臂余量 ~11 格（5≤11<30）→ 误毙。修后：撞「本候选早前残标」= 同一大区 → 判大。
    const w = 50, h = 50;
    const base = new Uint8Array(w * h).fill(1);
    for (let y = 10; y <= 25; y++) { base[y * w + 10] = 0; base[y * w + 20] = 0; }   // 两臂
    for (let x = 11; x <= 19; x++) base[25 * w + x] = 0;                             // 底
    const newPx = [9 * w + 10, 9 * w + 20];   // 候选桥像素：封在两个臂口上方
    const visited = new Int32Array(w * h);
    const ok = areaGuardOk(base, w, h, newPx, 30, visited, { v: 0 }, []);
    eq(ok, true, "41 格大区不得因早退污染被误判成碎区");
    // 对照：真碎区（走廊总长 20 < amin=30 且 ≥5）仍要拦
    const base2 = new Uint8Array(w * h).fill(1);
    for (let y = 10; y <= 19; y++) { base2[y * w + 10] = 0; base2[y * w + 12] = 0; }  // 两条 10 格短臂
    base2[20 * w + 10] = 0; base2[20 * w + 11] = 0; base2[20 * w + 12] = 0;           // 底连通 → 共 23 格
    const ok2 = areaGuardOk(base2, w, h, [9 * w + 10, 9 * w + 12], 30, new Int32Array(w * h), { v: 0 }, []);
    eq(ok2, false, "真碎区（23 格 < 30）仍拦");
  });
  it("碎区守卫基底 = Ib∪候选（论文 §5.1.5）：已接受的桥不当墙，平行双缝都能闭", () => {
    // 两排 1px 横线同位缝（缝 6px，桥与线同行 → 真封死），中带 = y11 一行 32px；amin=40 时：
    //   旧（Ic 基底）bug：先闭的桥把中带封死 → 第二条桥看到 32<40 被毙（本测试对旧代码红）；
    //   论文基底：第二条桥的守卫里首桥不是墙，中带从另一条缝逃去大区 → 两条都过，
    //   最终中带 32 < amin 是作者接受的轻微过分割。
    const w = 32, h = 32;
    const Ib = blank(w, h);
    fillRect(Ib, w, 0, 10, 12, 10); fillRect(Ib, w, 19, 10, 31, 10);   // 线 A（y=10）
    fillRect(Ib, w, 0, 12, 12, 12); fillRect(Ib, w, 19, 12, 31, 12);   // 线 B（y=12）
    // cmax=1：一端一桥，排除「从桥侧腹溜出去的斜跨桥」搅乱中带（那是 τ 的已知宽松面，另议）
    const part = buildPartitionFromBinary(Ib, w, h, { ...DEFAULT_FLAT_COLORING_PARAMS, amin: 40, erode: false, cmax: 1 });
    assert(part.bridges.filter((b) => b.ok).length >= 2, "两条缝都补上");
    const top = labelAt(part, 16, 3), mid = labelAt(part, 16, 11), bot = labelAt(part, 16, 24);
    assert(top !== mid && mid !== bot && top !== bot, `三带分区（实得 ${top}/${mid}/${bot}）`);
  });
  it("粗笔画（厚 8）断口圆：腐蚀细化后仍闭合分区", () => {
    const w = 80, h = 80;
    const Ib = ring(w, h, 40, 40, 24, 8, 0, 5 / 24); // 缝 ~10px
    const part = buildPartitionFromBinary(Ib, w, h);
    assert(part.strokeHalfWidth > 3, `半宽应触发腐蚀（实得 ${part.strokeHalfWidth.toFixed(1)}）`);
    assert(labelAt(part, 40, 40) !== labelAt(part, 2, 2), "闭合后内外分开");
  });
});

describe("lineart · 线下 label 瓜分与 mask 查询", () => {
  it("整宽横杆：全图无 0 label，笔画像素被上下两区到中线瓜分", () => {
    const w = 32, h = 32;
    const Ib = blank(w, h);
    fillRect(Ib, w, 0, 14, 31, 17);
    const part = buildPartitionFromBinary(Ib, w, h, noClose);
    eq(part.regionCount, 2, "上下两区");
    for (let i = 0; i < w * h; i++) assert(part.labels[i] !== 0, "全图无 0 label");
    eq(labelAt(part, 16, 15), labelAt(part, 16, 5), "杆上半归上区");
    eq(labelAt(part, 16, 16), labelAt(part, 16, 28), "杆下半归下区");
  });
  it("regionMaskAt：tap 上区 → mask 盖到杆内、与下区不重叠", () => {
    const w = 32, h = 32;
    const Ib = blank(w, h);
    fillRect(Ib, w, 0, 14, 31, 17);
    const part = buildPartitionFromBinary(Ib, w, h, noClose);
    const rm = regionMaskAt(part, 16, 5);
    assert(rm, "应有 mask");
    eq(rm.x, 0, "bbox 从 0 起");
    eq(rm.w, 32, "bbox 全宽");
    assert(rm.y === 0 && rm.h >= 15, "bbox 吃进杆的上半");
    eq(rm.mask[15 * rm.w + 16], 255, "杆上半 (16,15) 在 mask 内");
    eq(rm.mask[(rm.h - 1) * rm.w + 16] ?? 0, rm.h > 17 ? 0 : rm.mask[(rm.h - 1) * rm.w + 16], "底行不越进下区");
    const rmDown = regionMaskAt(part, 16, 28);
    let overlap = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const inUp = y >= rm.y && y < rm.y + rm.h && rm.mask[(y - rm.y) * rm.w + (x - rm.x)] === 255;
      const inDn = y >= rmDown.y && y < rmDown.y + rmDown.h
        && x >= rmDown.x && x < rmDown.x + rmDown.w
        && rmDown.mask[(y - rmDown.y) * rmDown.w + (x - rmDown.x)] === 255;
      if (inUp && inDn) overlap++;
      if (!inUp && !inDn) assert(false, `(${x},${y}) 两区都不盖`);
    }
    eq(overlap, 0, "两区 mask 无重叠");
  });
  it("蔓延距离（v0.7.17 像素画模式）：0=真墨水一个不碰、虚拟闭合桥仍可跨、自动=现行为", () => {
    // 整宽横杆（真墨水）：bleed=0 → 上区 mask 恰好 = 纯背景 14 行，杆像素零入选
    const w = 32, h = 32;
    const Ib = blank(w, h);
    fillRect(Ib, w, 0, 14, 31, 17);
    const part = buildPartitionFromBinary(Ib, w, h, noClose);
    // v0.7.19 懒构建：build 不带墨深；不 attach 就 bleed 查询 = 响亮抛（不静默按自动放行）
    eq(part.inkDepth, null, "build 后 inkDepth 为 null（自动档不花这块内存）");
    let threw = false;
    try { regionMaskAt(part, 16, 5, 0); } catch { threw = true; }
    eq(threw, true, "未 attach 就 bleed 查询应抛");
    attachInkDepth(part, Ib);
    const rm0 = regionMaskAt(part, 16, 5, 0);
    let n0 = 0, inkHit = 0;
    for (let ry = 0; ry < rm0.h; ry++) for (let rx = 0; rx < rm0.w; rx++) {
      if (rm0.mask[ry * rm0.w + rx] !== 255) continue;
      n0++;
      if (Ib[(rm0.y + ry) * w + (rm0.x + rx)]) inkHit++;
    }
    eq(inkHit, 0, "真墨水零入选");
    eq(n0, 14 * 32, "纯背景 14 行");
    const rmAuto = regionMaskAt(part, 16, 5, -1);
    let nAuto = 0;
    for (let i = 0; i < rmAuto.mask.length; i++) if (rmAuto.mask[i] === 255) nAuto++;
    eq(nAuto, 16 * 32, "自动 = 填到中线（含杆上半），现行为不变");
    // 断口圆：闭合桥是虚拟墨水（inkDepth=0）→ bleed=0 时桥上像素（label 归内/外区者）仍可入选
    const w2 = 64, h2 = 64;
    const Ring = ring(w2, h2, 32, 32, 20, 3, 0, 3 / 20);
    const part2 = buildPartitionFromBinary(Ring, w2, h2);
    attachInkDepth(part2, Ring);
    const inner = labelAt(part2, 32, 32);
    const rmIn = regionMaskAt(part2, 32, 32, 0);
    let bridgeIn = 0, ringHit = 0;
    for (let ry = 0; ry < rmIn.h; ry++) for (let rx = 0; rx < rmIn.w; rx++) {
      if (rmIn.mask[ry * rmIn.w + rx] !== 255) continue;
      const p = (rmIn.y + ry) * w2 + (rmIn.x + rx);
      if (Ring[p]) ringHit++;                                    // 真墨水
      else if (part2.labels[p] === inner && part2.inkDepth[p] === 0   // attach 后非 null
        && Math.abs((p % w2) - 32 - 20) <= 3 && Math.abs(((p / w2) | 0) - 32) <= 4) bridgeIn++; // 断口带内的非墨水像素
    }
    eq(ringHit, 0, "圆环真墨水零入选");
    assert(bridgeIn > 0, "断口带内的虚拟桥侧像素仍入选（填色能跨桥封口）");
  });

  it("越界/病态查询：出界 null；空图整图一区", () => {
    const part = buildPartitionFromBinary(blank(8, 8), 8, 8);
    eq(part.regionCount, 1, "空图一区");
    eq(regionMaskAt(part, -1, 0), null, "出界 null");
    const rm = regionMaskAt(part, 4, 4);
    eq(rm.w * rm.h, 64, "全图 mask");
  });
});

describe("lineart · 半宽估计毒化回归（v0.10.11 脊线中位数）", () => {
  it("全连通线稿+实心块：估计不被毒化、细线不被腐蚀蒸发（2026-08-20 铅笔图标实案缩影）", () => {
    // 3px 宽矩形轮廓 + 实心圆盘压在角上连成**一个组件**。
    // 旧估计器（每组件取最大、跨组件中位数）：单组件 → 中位数=圆盘内切半径 8 → erode r=4
    // → 3px 线全灭 → 内外漏成一区。脊线中位数：线条脊点海量（dist≈1.5）压住圆盘中心几点。
    const w = 64, h = 64;
    const Ib = blank(w, h);
    fillRect(Ib, w, 8, 8, 55, 10); fillRect(Ib, w, 8, 53, 55, 55);
    fillRect(Ib, w, 8, 8, 10, 55); fillRect(Ib, w, 53, 8, 55, 55);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (Math.hypot(x - 10, y - 10) <= 8) Ib[y * w + x] = 1;
    }
    const part = buildPartitionFromBinary(Ib, w, h);
    assert(part.strokeHalfWidth <= 3, `脊线估计不被实心块顶爆（实得 ${part.strokeHalfWidth.toFixed(1)}）`);
    assert(labelAt(part, 32, 32) !== labelAt(part, 2, 32), "矩形内外仍分区（线没被蒸发）");
  });
});

describe("lineart · 动态墨线判定（v0.10.11 resolveInkBinarization）", () => {
  /** 淡粉线（白底亮度 ≈190 > 默认手动 128）闭合方框，透明底 */
  function lightBoxRgba(w, h) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    const put = (x, y) => {
      const o = (y * w + x) * 4;
      rgba[o] = 230; rgba[o + 1] = 180; rgba[o + 2] = 180; rgba[o + 3] = 255;
    };
    for (let x = 8; x <= 55; x++) { put(x, 8); put(x, 55); }
    for (let y = 8; y <= 55; y++) { put(8, y); put(55, y); }
    return rgba;   // 落笔像素恰 188 个（周长去重）
  }
  it("手动档：pct 就是原亮度行为", () => {
    const w = 64, h = 64;
    const r = resolveInkBinarization(lightBoxRgba(w, h), w, h, 50);
    eq(r.mode, "manual", "≥0 = 手动");
    let ink = 0; for (const v of r.Ib) ink += v;
    eq(ink, 0, "亮度 190 > 50%·2.55 → 手动档全漏（这正是淡线稿事故）");
  });
  it("动态档·稀疏透明底 → alpha 档全捕获", () => {
    const w = 64, h = 64;
    const r = resolveInkBinarization(lightBoxRgba(w, h), w, h, -1);
    eq(r.mode, "alpha", "覆盖率 ≪25% → alpha 档");
    let ink = 0; for (const v of r.Ib) ink += v;
    eq(ink, 188, "落笔像素全数是墨线，亮度无关");
  });
  it("动态档·稠密不透明 → Otsu 档：深线是墨、白底不是、阈值夹在 [30%,90%]", () => {
    const w = 64, h = 64;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let x = 8; x <= 55; x++) {
      const o = (20 * w + x) * 4;
      rgba[o] = 40; rgba[o + 1] = 40; rgba[o + 2] = 40;
    }
    const r = resolveInkBinarization(rgba, w, h, -1);
    eq(r.mode, "otsu", "覆盖率 100% → Otsu 档");
    assert(r.thresholdLuma >= 30 * 2.55 && r.thresholdLuma <= 90 * 2.55,
      `阈值夹限（实得 ${r.thresholdLuma}）`);
    eq(r.Ib[20 * w + 30], 1, "深线是墨");
    eq(r.Ib[5 * w + 5], 0, "白底不是墨");
  });
});

describe("lineart · 二值化", () => {
  it("透明=背景；黑不透明=笔画；半透明黑按白底合成", () => {
    const w = 4, h = 1;
    const rgba = new Uint8Array(w * h * 4);
    // px0: 全透明；px1: 不透明黑；px2: 50% 黑（白底合成 ≈128）；px3: 不透明白
    rgba[1 * 4 + 3] = 255;
    rgba[2 * 4 + 3] = 128;
    rgba[3 * 4 + 0] = 255; rgba[3 * 4 + 1] = 255; rgba[3 * 4 + 2] = 255; rgba[3 * 4 + 3] = 255;
    const Ib = binarizeLuma(rgba, w, h, 128);
    eq(Ib[0], 0, "透明 → 背景");
    eq(Ib[1], 1, "黑 → 笔画");
    eq(Ib[2], 1, "50% 黑合成 ≈127.5 ≤ 128 → 笔画");
    eq(Ib[3], 0, "白 → 背景");
  });
});
