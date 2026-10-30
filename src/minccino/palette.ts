// minccino/palette.ts —— 白模的调色板：现状那几个颜色常量一处放（背景 / 面 / 选中 / 悬停 / 淡出 / 边 / 网格 / 三轴）。
// 6c（v0.17.9）从 backend/three/render3.ts 搬出来：编辑器的叠加层拿颜色不再碰后端模块；Opus 的预设 / 风格认领「选中」色（Tron = Clu 橙，不变量 7）从这里长出去。
// created 2026-10-29 by Claude Fable 5.1
export const PALETTE = {
  background: 0xf2f0ea,
  face: 0xd6d6d6,
  faceSelected: 0xf3a698,   // 选中统一红（2026-10-29 user「写实线稿的时候是不是也红色统一一下比较好，然后开放一个设置？」；以前蓝 #8fb4e8）
  faceHover: 0xf8cbbf,
  faceDim: 0xe9e9e9,        // 上下文之外的几何（淡出）
  edgeDim: 0xb8b8b8,
  edge: 0x2a2a2a,
  edgeWire: 0x111111,
  edgeSelected: 0xd8323a,   // 以前蓝 #2b6cb0
  edgeHot: 0xf08a00,      // 刮擦/悬停将删（选中改红之后让开：橙；以前红 #cc3333）
  edgeWarn: 0x8b5cf6,     // 修复面板「检查」：微折软边（橙给了将删：紫；以前橙 #d97706）
  grid: 0xd9d6cf,
  /** 网格正片叠底的系数色（× 背景 ≈ 原 grid 灰）：主线 / 细线；压在深色材质上只暗 ~10% / ~5%。 */
  gridMajor: 0xe3e1dc, gridMinor: 0xf0eeea,
  axisX: 0xcc3333,
  axisY: 0x2e8b57,
  axisZ: 0x2b6cb0,
} as const;
