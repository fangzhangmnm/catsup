// world-labels.ts —— 世界里的文字（标签深模块）：挂在 3D 某一点上、固定屏幕大小的一小块字。created 2026-10-25 by Claude Opus 5.5
// user 2026-10-25「文字可以好好设计一个深模块，不要ad hoc，以后猫娘举牌子也会用到的」。第一个用户 = X 轴 +1 个单位处的「1 m」（user 同日「能不能在x轴+1的地方背景颜色的小字写上1m或者别的单位定义」）。
//
// 窄接口：调用方只说「哪段字、挂在哪、用哪种样式、在点的哪一侧」——WorldLabel；字体 / 颜色 / 底 / 边距这些排版全在样式表 LABEL_STYLES 里，
// 光栅化（canvas 2D → 位图，只用于显示）和缓存也在这里。排版样式表和光栅化 2026-10-29 搬进 src/minccino/backend/label-raster.ts（引擎后端）；
// 这里只剩 WorldLabel（哪段字挂哪）和单位换算；后端把位图贴成固定屏幕大小的面片，按 id 增删改，字和样式没变就不重画。
import type { Pt3 } from "../kernel/kernel.ts";

import type { AuxText } from "../look/aux.ts";
type LabelAnchor = AuxText["anchor"];   // 2026-10-29 Opus：字 = 折线（look/stroke-font.ts），排版归画风表；引擎的位图字模块删了   // 排版 + 光栅化住供货商那层（label-raster.ts），编辑器只拿契约里的类型（刀 f）；文字 = 几何的方案见窄接口设计稿 §6端（Tron 第一刀步 6b）
export interface WorldLabel {
  /** 稳定身份（同一个 id = 同一块字，挪位置不重画）。 */
  id: string;
  text: string;
  /** 世界坐标。 */
  at: Pt3;
  /** 哪一种字（画风表 look/aux.ts TEXT_LOOKS 的一行）。 */
  role: AuxText["role"];
  anchor?: LabelAnchor;
  /** 和点之间留几 CSS px（默认 3）。 */
  gapPx?: number;
}

/** 单位刻度（X 轴 +1 个单位处的字 + Z 轴刻度的间距）：公制念「1 m」，英制念「1 ft」。 */
export function unitMark(unit: string): { unitM: number; label: string } {
  return unit === "ft" || unit === "in" ? { unitM: 0.3048, label: "1 ft" } : { unitM: 1, label: "1 m" };
}
/**
 * 一格有多大的字（DT16，user 10-25「1m的标记没有跟着格子的大小更新」）：X 轴上那个小标记放在一格处、写一格的长度。
 * 米制按大小挑 m / cm / mm；英制整英尺写「n ft」、不到一英尺写英寸、其余写英尺英寸（格子按米设、单位却是英尺时照实写，比如 1 m = 3' 3.38"）。
 */
export function gridStepLabel(stepM: number, unit: string): string {
  const trim = (v: number): string => String(Number(v.toFixed(3)));
  if (unit === "ft" || unit === "in") {
    const inch = stepM / 0.0254, ft = Math.round(inch / 12);
    if (ft >= 1 && Math.abs(inch - ft * 12) < 1e-6) return `${ft} ft`;
    if (inch < 12) return `${trim(inch)} in`;
    const f = Math.floor(inch / 12 + 1e-9), rest = inch - f * 12;
    return `${f}' ${Number(rest.toFixed(2))}"`;
  }
  return stepM >= 1 ? `${trim(stepM)} m` : stepM >= 0.01 ? `${trim(stepM * 100)} cm` : `${trim(stepM * 1000)} mm`;
}
