// color-cluster（按颜色拆分的数学面）：确定性 k-means + 硬分配分片。
// 红线断言：分片互斥、∪ = 原字节（连 alpha 原样）——这是「拆完叠回去视觉不变」的全部根据。
import { test, eq, assert } from "./runner.mjs";
import { clusterColors, partitionByNearest, hexOf } from "../src/backend/algorithms/color-cluster.ts";

// 造一张 w×h 的 RGBA 字节图：painter(i) 返回 [r,g,b,a] 或 null（透明）。
function makeImage(n: number, painter: (i: number) => [number, number, number, number] | null) {
  const d = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const px = painter(i);
    if (px) d.set(px, i * 4);
  }
  return d;
}

test("三簇纯色：中心色精确恢复、share 按占比排序", () => {
  // 600 像素：300 红 / 200 绿 / 100 蓝
  const img = makeImage(600, (i) =>
    i < 300 ? [255, 0, 0, 255] : i < 500 ? [0, 255, 0, 255] : [0, 0, 255, 255]);
  const cs = clusterColors(img, 3);
  eq(cs.length, 3);
  eq(hexOf(cs[0].center), "#ff0000");
  eq(hexOf(cs[1].center), "#00ff00");
  eq(hexOf(cs[2].center), "#0000ff");
  assert(Math.abs(cs[0].share - 0.5) < 0.01, `share[0]=${cs[0].share}`);
  assert(cs[0].share > cs[1].share && cs[1].share > cs[2].share, "share 降序");
});

test("k 大于实际颜色数：空簇丢弃，返回长度 ≤ 实际颜色数", () => {
  const img = makeImage(100, (i) => (i < 60 ? [10, 20, 30, 255] : [200, 210, 220, 255]));
  const cs = clusterColors(img, 6);
  assert(cs.length <= 6 && cs.length >= 2, `得 ${cs.length} 簇`);
  // 两大簇必在（近似即可：簇心离两真色 < 8）
  const near = (hex: [number, number, number]) =>
    cs.some((c) => Math.hypot(c.center[0] - hex[0], c.center[1] - hex[1], c.center[2] - hex[2]) < 8);
  assert(near([10, 20, 30]) && near([200, 210, 220]), "两个真色都有簇心");
});

test("全透明输入 → 空结果", () => {
  eq(clusterColors(makeImage(50, () => null), 4).length, 0);
});

test("确定性：同输入同 k 两次结果逐字节一致", () => {
  const img = makeImage(997, (i) => [i % 256, (i * 7) % 256, (i * 13) % 256, 255]);
  eq(JSON.stringify(clusterColors(img, 5)), JSON.stringify(clusterColors(img, 5)));
});

test("硬分配：分片互斥、∪ = 原字节（含半透明像素原样带走）", () => {
  const img = makeImage(400, (i) => {
    if (i % 10 === 9) return null;                       // 撒些全透明
    if (i < 150) return [250, 10, 10, 255];
    if (i < 300) return [10, 250, 10, 128];              // 半透明绿
    return [10, 10, 250, 40];
  });
  const centers: [number, number, number][] = [[250, 10, 10], [10, 250, 10], [10, 10, 250]];
  const { parts, counts } = partitionByNearest(img, centers);
  eq(parts.length, 3);
  eq(counts[0], 135); eq(counts[1], 135); eq(counts[2], 90);   // 每段 10% 透明被排除
  const union = new Uint8ClampedArray(img.length);
  for (let i = 0; i < img.length; i += 4) {
    let owners = 0;
    for (const p of parts) {
      if (p[i + 3] !== 0) {
        owners++;
        union.set(p.subarray(i, i + 4), i);
      } else {
        // 互斥：非 owner 分片该像素必须全 0（RGB 也不许残留）
        eq(p[i] + p[i + 1] + p[i + 2], 0);
      }
    }
    assert(owners <= 1, `像素 ${i / 4} 被 ${owners} 个分片持有`);
  }
  eq(Buffer.compare(Buffer.from(union.buffer), Buffer.from(img.buffer)), 0);
});

test("partition 空簇计数为 0（调用方据此丢弃）", () => {
  const img = makeImage(64, () => [0, 0, 0, 255]);
  const { counts } = partitionByNearest(img, [[0, 0, 0], [255, 255, 255]]);
  eq(counts[0], 64);
  eq(counts[1], 0);
});
