// src/lab/presets.ts —— 2D 肥皂膜 lab 的场景预置（纯逻辑、DOM-free、node 直测）。
// created by Claude Fable 5, 2026-09-01
// 定位：drill 仪器。一键把内核摆进标准/极端场景（日/回/三层回…），走的就是 addEdges
// 正门（和手画一个字节不差），事件流照常涌出——摆场景本身就是一次膜事件教学。
// 终态面数由 test/lab-presets.test.ts 钉死（仪器自身不许骗人）。

import type { FaceEvent, Kernel, Pt } from "../kernel/kernel.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const rect = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt][] => [
  [P(x0, y0), P(x1, y0)],
  [P(x1, y0), P(x1, y1)],
  [P(x1, y1), P(x0, y1)],
  [P(x0, y1), P(x0, y0)],
];

export interface LabPreset {
  name: string;
  note: string;              // 一句话：这个场景在测什么
  batches: [Pt, Pt][][];     // 每个 batch = 一次手势（一次 addEdges 调用）
  expectFaces: number;       // 摆完后的面数（冒烟测试断言用）
}

export const PRESETS: LabPreset[] = [
  {
    name: "日字",
    note: "两膜共边——擦中缝该 MERGE",
    batches: [rect(-100, -60, 100, 60), [[P(-100, 0), P(100, 0)]]],
    expectFaces: 2,
  },
  {
    name: "回字",
    note: "环带+内岛——删内膜再擦洞边看 ABSORB",
    batches: [rect(-100, -100, 100, 100), rect(-40, -40, 40, 40)],
    expectFaces: 2,
  },
  {
    name: "三层回字",
    note: "暗礁①现场：中环擦=ABSORB？内环擦=BURST？（推导值待真机 SU 裁决）",
    batches: [rect(-120, -120, 120, 120), rect(-75, -75, 75, 75), rect(-30, -30, 30, 30)],
    expectFaces: 3,
  },
  {
    name: "田字",
    note: "十字划分——四膜；擦十字任一臂看 MERGE 链",
    batches: [
      rect(-100, -100, 100, 100),
      [[P(0, -100), P(0, 100)]],
      [[P(-100, 0), P(100, 0)]],
    ],
    expectFaces: 4,
  },
  {
    name: "T 触碰",
    note: "外来线 T 到边上——切边不生膜（手势边裁决的反例位）",
    batches: [rect(-100, -60, 100, 60), [[P(0, 60), P(0, 140)]]],
    expectFaces: 1,
  },
  {
    name: "开口方",
    note: "三边开口——不出膜；你补第四笔看 BIRTH（描一笔就出）",
    batches: [[
      [P(-80, -80), P(80, -80)],
      [P(80, -80), P(80, 80)],
      [P(80, 80), P(-80, 80)],
    ]],
    expectFaces: 0,
  },
];

/** 把预置摆进内核；返回每个 batch 的事件（供 lab 逐 batch 打日志）。 */
export function applyPreset(k: Kernel, preset: LabPreset): FaceEvent[][] {
  return preset.batches.map((segs) => k.addEdges(segs));
}
