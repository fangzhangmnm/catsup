// cloud-return.ts —— 回来（开机登录好 / 网回来）时没传的东西怎么办（家族规则书 §1 第 15 条，2026-11-03 夜改写）。created 2026-11-04 by Claude Opus 5.5
//   CatsUp 是心跳 app：自动保存就是同意传，所以没有 WeebPaint 那种「只是自动保存、不传不问」的第三类。两类：
//   (a) 从没传过（syncState float，没登录 / 离线时新建，云端没有这个名字）→ 问一次；第一次把东西放进某个账号是人的决定。
//   (b) 传过、后来改了没传成 → 自动续传不问（ADR-0018 consented replay）。
//   库的 pushAll 不分这两类（不加筛选，user 11-03）：有 (a) 又没答应时不能批量推，(b) 只能等——开着那份照旧走心跳，其余进「要处理」列表。
//   纯函数：node 直测。

export type ReturnPlan =
  | { kind: "none" }
  | { kind: "resume" }                          // 直接 pushAll，不问
  | { kind: "ask"; neverUploaded: number }      // 问一次，点了才 pushAll
  | { kind: "list"; total: number };            // 这一页说过「稍后」：不问不推，进列表

export function planReturn(f: { dirty: number; neverUploaded: number; consented: boolean; saidLater: boolean }): ReturnPlan {
  if (f.dirty <= 0) return { kind: "none" };
  if (f.neverUploaded <= 0 || f.consented) return { kind: "resume" };
  if (f.saidLater) return { kind: "list", total: f.dirty };
  return { kind: "ask", neverUploaded: f.neverUploaded };
}

/** 列举里「从没传过且有字节要传」的身份。local-only 是干净的（pushAll 不推它），不算。 */
export function neverUploadedIds(files: readonly { identifier: string; syncState?: string | null }[]): Set<string> {
  return new Set(files.filter((f) => f.syncState === "float").map((f) => f.identifier));
}
