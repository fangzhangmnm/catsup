// gesture-consts.ts —— 工具共用的两个小常量，从 editor.ts 搬出（2026-10-28 Claude Fable 5.1）：工具模块以前为了拿它们运行时 import 编辑器本体，
// 整层工具就没法在 node 里无头加载（立场表守卫 test/stance.test.ts 要加载各工作台的手势模块）。editor.ts 仍转出它们给老调用方。
export const SNAP_LABELS: Record<string, string> = {
  endpoint: "端点", midpoint: "中点", "on-edge": "边上", origin: "原点",
  "axis-x": "X 轴", "axis-y": "Y 轴", "axis-z": "Z 轴",
  align: "共轴", "align-combo": "共轴角点", "edge-align": "边上·共轴", intersection: "交点", "cross-line": "交线",
  "h-stop": "高度咬合", "on-face": "面上",
  "on-guide": "参考线上", "guide-point": "参考点", "guide-cross": "参考线交点",
  "grid-point": "格点", increment: "整数长度", "on-extension": "延长线上",
  center: "圆心", "pool-origin": "轴原点",
};

/** 手势最短长度（米）：短于它 = 没动。 */
export const MIN_GESTURE_LEN = 0.01;
