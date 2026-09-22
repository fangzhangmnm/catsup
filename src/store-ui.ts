// store-ui.ts —— 给 @internal/store 的 ui bundle（busy / text / resolveConflict / reportError / offlineEscape / onReplayStatus / confirmReplay）。
// 形状照 JRB / WeebPaint store-ui.ts（pwa-cloud-store skill §2）。created 2026-09-20 by Claude Fable 5.1
//   · 后台节律（推云 / 改名 / 拉取 / 云端检查）**不上全屏遮罩**——走 notice 栈同 id 原地更新、完成即收；用户动作（回收站 / 建删夹 / 重传）才遮罩。
//   · 冲突必 surface（ADR-0009）：真 sheet，绝不静默 cancel；takeCloud 由 session 整份重载。
import type { StoreUI, StoreTextKey, StoreTextParams } from "@internal/store";
import { withBusy, openChoiceSheet, openConfirmSheet } from "./app/ui/sheets.ts";
import { showNotice, type NoticeHandle } from "./app/ui/notice.ts";
import { reportError } from "./app/error-funnel.ts";
import { note } from "./app/debug-log.ts";
import { DOC_EXT } from "./config.ts";

// 库 15 个 busy 文案 key → 中文（孵化中项目不走 i18n SSoT；毕业时搬）。穷举 Record：库加 key 本表漏映 = 编译错。
const STORE_TEXT: Record<StoreTextKey, (p?: StoreTextParams) => string> = {
  "sync.pushing": () => "正在同步到云端…",
  "file.renaming": (p) => `正在改名 ${p?.name ?? ""}…`,
  "file.pulling": (p) => `正在从云端拉取 ${p?.name ?? ""}…`,
  "cloud.checking": () => "正在检查云端…",
  "file.deleting": (p) => `正在删除 ${p?.name ?? ""}…`,
  "trash.restoring": () => "正在从回收站恢复…",
  "trash.purging": () => "正在彻底删除…",
  "trash.emptyTrash": () => "正在清空回收站…",
  "trash.emptyBackups": () => "正在清空备份…",
  "file.encrypting": () => "正在加密…",
  "file.decrypting": () => "正在解密…",
  "file.rekeying": () => "正在换密码…",
  "file.reuploading": () => "正在重新上传…",
  "folder.creating": () => "正在新建文件夹…",
  "folder.deleting": () => "正在删除文件夹…",
};
const stripExt = (n: string): string => n.replace(new RegExp(`\\${DOC_EXT}$`, "i"), "");

const QUIET_KEYS = new Set<StoreTextKey>(["sync.pushing", "file.renaming", "file.pulling", "cloud.checking"]);
let _quietDepth = 0;
let _quietNotice: NoticeHandle | null = null;
async function quietBusy<T>(label: string, fn: () => Promise<T>): Promise<T> {
  _quietDepth++;
  _quietNotice = showNotice({ id: "store-quiet-busy", level: "info", text: label, timeoutMs: null });
  try { return await fn(); }
  finally { _quietDepth--; if (_quietDepth <= 0) { _quietDepth = 0; _quietNotice?.close(); _quietNotice = null; } }
}

export const storeUI: StoreUI = {
  busy: (label, fn, key) => (key && QUIET_KEYS.has(key) ? quietBusy(label, fn) : withBusy(label, fn)),
  text: (key: StoreTextKey, params?: StoreTextParams): string | undefined => STORE_TEXT[key]?.(params),

  resolveConflict: async ({ name, occasion }): Promise<"keepMine" | "takeCloud" | "cancel"> => {
    const n = stripExt(name);
    note("store", `conflict occasion=${occasion} name=${n}`);
    const choice = occasion === "open"
      ? await openChoiceSheet<"cancel" | "takeCloud">("云端有另一个版本", `「${n}」在云端和本机各有一份不同的内容。两边都会保留（输的一方进 .backup）。`,
          [{ label: "先开本机的，稍后再定", value: "cancel", primary: true }, { label: "用云端的版本", value: "takeCloud" }])
      : await openChoiceSheet<"keepMine" | "takeCloud" | "cancel">("保存撞上云端新版本", `「${n}」在云端已被改过。选一边覆盖，另一边会留在 .backup。`,
          [{ label: "以本机为准（覆盖云端）", value: "keepMine", primary: true }, { label: "以云端为准（本机重载）", value: "takeCloud" }, { label: "取消", value: "cancel" }]);
    note("store", `conflict resolved → ${choice ?? "cancel"}`);
    return choice ?? "cancel";
  },

  reportError: (err: unknown, level): void => {
    const msg = (err as { message?: string } | null)?.message ?? "";
    if (msg === "Not signed in") { reportError(err, "log"); return; }
    // 登录 redirect 回程裸 `server_error`（零 error_description）= 浏览器会话状态：该窗口登着多个微软身份 → consent 页 Accept 后 /authorize 直接顶回
    //   （家族案卷 ai-docs/20260823-onedrive-new-consent-403-and-authority-mismatch.md §9.1，微软 Graph Explorer 独立复现；无痕窗口即通）。
    //   CatsUp 2026-09-20 真机回执正是这一签名（user 09-22 贴的黑匣子）。原文照旧进黑匣子（log 级），用户看人话 + 处方。
    if (msg.includes("handleRedirectPromise") && msg.includes("server_error")) {
      reportError(err, "log");
      showNotice({ id: "auth-server-error", level: "error", timeoutMs: null,
        text: "微软登录页把授权顶回来了（server_error）。这通常是浏览器会话状态：这个窗口登着多个微软身份。请开一个 InPrivate / 无痕窗口打开本页再登录，或清掉 login.live.com 的 cookie 后重试。" });
      return;
    }
    if ((err as { name?: string } | null)?.name === "CloudNetworkError") { reportError(err, "log"); reportError(new Error("云端暂时连不上（已离线工作，稍后自动重试）"), level ?? "warning"); return; }
    reportError(err, level ?? "error");
  },

  onReplayStatus: ({ phase, name, done, total }): void => {
    const n = name ? stripExt(name) : "";
    note("store", `replay ${phase} ${n} ${done ?? ""}/${total ?? ""}`);
    if (phase === "collision") reportError(new Error(`「${n}」补推时云端已有同名文件，已跳过`), "warning");
    else if (phase === "done") reportError(`离线保存的模型已补推云端（${done}/${total}）`, "info");
  },
  confirmReplay: (count: number): Promise<boolean> => openConfirmSheet("补推到云端", `有 ${count} 个离线时保存的模型，现在同步到云端？`),

  offlineEscape: (): { probe: Promise<unknown>; settle: () => void } => {
    let onSkip!: () => void;
    const probe = new Promise<unknown>((res) => { onSkip = () => res(undefined); });
    const h = showNotice({ id: "store-offline-escape", level: "info", text: "正在检查云端…", timeoutMs: null, actions: [{ label: "跳过，先开本机的", onClick: () => { note("store", "offline escape: user skipped cloud check"); onSkip(); } }] });
    return { probe, settle: () => h.close() };
  },
};
