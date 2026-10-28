// config.ts —— 常量 SSoT（凡是「人类拍过板的数字/名字」都在这里）。created 2026-09-20 by Claude Fable 5.1
//
// OneDrive：scope 永久 AppFolder（家规硬规则 #6）；authority /consumers = personal-account-only（硬规则 #7，与 Azure 注册成对）。
// CLIENT_ID 空串 = 未配置：store 的 auth.isAuthConfigured() 为 false、不 load MSAL、纯无地；user 建好 Azure 注册后填进来。
export const APP_ID = "catsup";   // 本 origin 内唯一命名空间：IDB `catsup.defaultStore` + localStorage 前缀；与 WeebPaint / JRB 等兄弟隔离。
export const CLIENT_ID = "09719643-dc48-4c50-bf97-6dde1488f876";   // Azure 注册（Personal Microsoft accounts only，user 2026-09-20 给）
export const AUTHORITY = "https://login.microsoftonline.com/consumers";
export const SCOPES = ["Files.ReadWrite.AppFolder", "offline_access"];
export const MSAL_URL = "./vendor/msal/msal-browser.min.js";

/** 工程文件后缀（2026-10-28 账本 UX39 / 导出设计稿 §6：.catsup = glb 换皮，VRoid 的 .vrm 同款；身份 = `[夹/]<名>.catsup`，路径即身份）。
 *  新建 / 另存 / 导出工程文件都写它。为什么不是 .catsup.glb：别的软件开了再存会把 catsup 这个名字带走，一份烤过的模型顶着工程的名字。 */
export const DOC_EXT = ".catsup";
/** 老工程文件的后缀（≤ v0.16.7 写的 .glb 工程）：永远照开、不改名（改叫法不迁移旧数据）；认工程靠内容（CATSUP_document），不靠后缀。 */
export const LEGACY_DOC_EXT = ".glb";
/** 认得的工程后缀（新的在前）。 */
export const DOC_EXTS: readonly string[] = [DOC_EXT, LEGACY_DOC_EXT];
/** 图库里不当文档、也不当杂物显示的名字：写入方半成品。 */
export const HIDDEN_NAME_RE = /(^|\/)([^/]*\.part|~[^/]*|[^/]*\.tmp)$/i;
/** 图库家文档的自动保存：编辑后空闲这么久落本地（并在线时推云）——WeebPaint 无地标准 T-crash 节律同值。 */
export const AUTOSAVE_IDLE_MS = 30_000;
/** 前台轮询云端新鲜度的周期（reconcilePolicy:"app-driven"）。 */
export const FOREGROUND_POLL_MS = 60_000;
/** 缩略图：长边像素 / JPEG 质量（契约 §3：≈ 8–12 KB，BIN 首段供头片 peek）。 */
export const THUMB_LONG_EDGE = 192;
export const THUMB_JPEG_QUALITY = 80;
/** 新文档默认名（WeebPaint 惯例 yyyymmdd-hex4；禁「未命名」）。 */
export function defaultDocName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${hex}`;
}
/**
 * 导出 / 下载文件名里的时间（WeebPaint `src/naming.ts downloadStamp` 同款：本地时间 YYYYMMDD-HHMM）。
 * user 2026-10-28「导出的时候应该加一个导出时间，看一下weebpaint的导出命名规范」：导出名 = `模型名-YYYYMMDD-HHMM.扩展名`（另存 / 安家不加，那是文档自己的名字）。
 */
export function downloadStamp(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
}
/** 导出 / 下载文件基名 = `名-YYYYMMDD-HHMM`（不含扩展名）。 */
export function downloadName(base: string, now = new Date()): string { return `${base}-${downloadStamp(now)}`; }
/** 派生缓存 / 崩溃影子的独立 IDB（家规 2026-08-15：可再生派生缓存与 T-crash 附加层不进 store 的库、逐案批；user 2026-09-20「234批准」）。
 *  名字带 device-kv 同一 GUID 前缀（file:// 共桶防撞）；两个库全删无损（缩略图可再生、崩溃帧本就是附加层）。 */
export const THUMB_DB_NAME = "catsup-7c1f0d2e9a4b6c58.thumbs";
export const CRASH_DB_NAME = "catsup-7c1f0d2e9a4b6c58.crash";
/** 图库包这台设备的记事本（多库登记；gallery 0.8.7 起库名归宿主 `configureGalleryRegistry`，不配 = 包里写死的 WeebPaint GUID 名）。家族命名 `<app>-<guid>.<用途>`，GUID 同 device-kv 前缀。
 *  CatsUp 单库、0.4.0 时从没开过那个库 → 换名零迁移；四等（还原出厂一起删）。2026-10-25 Claude Fable 5.1 */
export const GALLERY_REGISTRY_DB = "catsup-7c1f0d2e9a4b6c58.gallery-registry";
/** 封面头片 peek 首拉长度（契约 §3：JSON ≈ 2 KB + JPEG ≈ 5–12 KB 全在前 ~20 KB；不够按 JSON 长度补拉，最多三步）。 */
export const HEAD_PEEK_BYTES = 64 * 1024;
