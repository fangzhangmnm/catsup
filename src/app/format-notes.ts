// app/format-notes.ts —— 打开一份文件时要说的话（读取侧三级拍子 + 素材架的两种情况；家族纪律：minor 更新提示一次、patch 静默）。纯函数（node 直测）。
// created 2026-11-04 by Claude Opus 5.5（从 session.noteFormat 搬出来，好直测；身份地基 ID-3 计划书 §15.1-F 加了素材架两句）。一条一个通知（通知是堆叠的，互相盖不掉）。
import { fmtStamp, type FormatReadNotes } from "../format/migrate/index.ts";

export function formatNotesSay(n: FormatReadNotes): string[] {
  const out: string[] = [];
  if (n.newerMinor.length) out.push(`这份文件是更新版的 CatsUp 写的（${n.newerMinor.map((x) => `${x.ext.replace("CATSUP_", "")} ${fmtStamp(x.file)}，本版 ${fmtStamp(x.mine)}`).join("；")}）：能开能存，它多出来的内容会原样带回`);
  if (n.deskTooNew) out.push(`这份文件的界面记录（desk ${fmtStamp(n.deskTooNew)}）比本版新：按默认显示，保存时原样带回`);
  if (n.shelfTooNew) out.push(`这份文件的素材架是更新版写的（shelf ${fmtStamp(n.shelfTooNew)}）：本版读不出架上有什么、也不能改，保存时原样带回；为了不删到架上的东西，这份文件里先不能清理没人用的组件和材质`);
  if (n.danglingShelfRefs) out.push(`素材架上有 ${n.danglingShelfRefs} 格指向的东西已经不在文件里，这次打开丢掉了（保存后就没了）`);
  return out;
}
