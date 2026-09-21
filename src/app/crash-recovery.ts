// crash-recovery.ts —— T-crash boot 恢复（WeebPaint crash-banner 同形；user 2026-09-20「234批准」）。
// created 2026-09-20 by Claude Fable 5.1
//
// 职责（单一）：boot 扫 crash 库 → ① pending-adoption（登录 redirect 前留声的模型）**自动领养**——用户没关页、只是去登录了；
//   ② crash 帧 → 顶部非模态通知（画布照常可用）：[恢复] = 领养字节 → session.adoptRecovered（图库家 `<名>-恢复` / 无图库 transient，
//   视为 dirty 直到首次真保存）；[丢弃] = 显式 discard；[×] = 本次不管（记录留着，下次 boot 再问）。一次一条，新→旧。
// 领养流产安全：adopt 是事务化取删——挽留门取消 / 解码失败必须把记录 put 回去，绝不让「点了恢复但中途取消」变成静默丢模型。
// 附加层纪律：全路径 catch——本层坏死不许影响 boot。
import { crashStore, type CrashRecordMeta } from "./crash-store.ts";
import type { Session } from "./session.ts";
import type { NoticeOpts } from "./ui/notice.ts";
import { reportError } from "./error-funnel.ts";

export interface CrashRecoveryDeps {
  session: Session;
  notify: (o: NoticeOpts) => void;
  /** 领养成功后关掉图库（若开着）——用户要看的是刚接回来的模型。 */
  closeGallery: () => void;
}

const putBack = (m: CrashRecordMeta, bytes: Blob) => crashStore.put(m.tag, bytes, { state: m.state, name: m.name, at: m.at, homeKind: m.homeKind }).catch(() => {});

async function recover(d: CrashRecoveryDeps, m: CrashRecordMeta, gate: boolean): Promise<boolean> {
  const bytes = await crashStore.adopt(m.tag);
  if (!bytes) { d.notify({ text: `「${m.name}」已被别的窗口接走`, level: "warning" }); return false; }
  try {
    const where = await d.session.adoptRecovered(new Uint8Array(await bytes.arrayBuffer()), m.name, { gate });
    if (!where) { void putBack(m, bytes); return false; }   // 挽留门取消 = 不恢复（记录放回，下次再问）
    d.closeGallery();
    d.notify({ text: where === "gallery" ? `已接回「${m.name}」，存进图库为「${d.session.displayName()}」` : `已接回「${m.name}」（还没有家：记得保存到磁盘）`, level: "info" });
    return true;
  } catch (e) {
    void putBack(m, bytes);
    reportError(new Error("[t-crash] recover failed: " + String(e)), "warning");
    d.notify({ text: `恢复「${m.name}」失败：${(e as Error).message ?? e}`, level: "error" });
    return false;
  }
}

function ask(d: CrashRecoveryDeps, m: CrashRecordMeta, onDone: () => void): void {
  const when = new Date(m.at);
  d.notify({
    id: "crash-recover", level: "warning", timeoutMs: null,
    text: `上次没保存的模型「${m.name}」（${m.homeKind === "file" ? "文件" : "未安家"}，${when.getMonth() + 1}/${when.getDate()} ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}）`,
    actions: [
      { label: "恢复", primary: true, onClick: () => { void recover(d, m, true).finally(onDone); } },
      { label: "丢弃", onClick: () => { void crashStore.discard(m.tag).catch(() => {}).then(onDone); } },
    ],
  });
}

/** boot 接线（main 的开机 IIFE 末尾，last-doc 恢复之后）：pending 先自动领养，再逐条问 crash 帧。 */
export async function initCrashRecovery(d: CrashRecoveryDeps): Promise<void> {
  try {
    const metas = await crashStore.listAtBoot();
    for (const m of metas.filter((x) => x.state === "pending-adoption")) await recover(d, m, true);   // gate：boot 若已开了上次的图库文档，先照规矩离开
    const queue = metas.filter((x) => x.state === "crash");
    const next = (): void => { const m = queue.shift(); if (m) ask(d, m, next); };
    next();
  } catch (e) { reportError(new Error("[t-crash] boot scan failed (best-effort): " + String(e)), "log"); }
}
