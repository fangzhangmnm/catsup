// editor/describe-event.ts —— 内核的面生命周期事件 → 一句中文（预演提示行里「预览：分割 面#3 → #7 + #8」那种）。
// 2026-11-09 Claude Opus 5.5 从 editor.ts 原样搬出来（体重棘轮：工单 1 加了选中参考几何那份，本体不许变胖）。
import type { FaceEvent } from "../kernel/kernel.ts";

export function describeEvent(ev: FaceEvent): string {
  switch (ev.type) {
    case "BIRTH": return `诞生 面#${ev.face}`;
    case "DIVIDE": return `分割 面#${ev.from} → ${ev.into.map((i) => `#${i}`).join(" + ")}`;
    case "MERGE": return `合并 ${ev.from.map((i) => `#${i}`).join("+")} → 面#${ev.into}`;
    case "ABSORB": return `吞洞 面#${ev.from} → 面#${ev.into}`;
    case "BURST": return `破膜 面#${ev.face}`;
    case "STRETCH": return `拉伸 ${ev.faces.map((i) => `面#${i}`).join(" ")}`;
    case "FACE_ERASED": return `删膜 面#${ev.face}`;
  }
}
