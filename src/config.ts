// config.ts —— 常量 SSoT（凡是「人类拍过板的数字/名字」都在这里）。created 2026-09-20 by Claude Fable 5.1
//
// OneDrive：scope 永久 AppFolder（家规硬规则 #6）；authority /consumers = personal-account-only（硬规则 #7，与 Azure 注册成对）。
// CLIENT_ID 空串 = 未配置：store 的 auth.isAuthConfigured() 为 false、不 load MSAL、纯无地；user 建好 Azure 注册后填进来。
export const APP_ID = "catsup";   // 本 origin 内唯一命名空间：IDB `catsup.defaultStore` + localStorage 前缀；与 WeebPaint / JRB 等兄弟隔离。
export const CLIENT_ID = "";
export const AUTHORITY = "https://login.microsoftonline.com/consumers";
export const SCOPES = ["Files.ReadWrite.AppFolder", "offline_access"];
export const MSAL_URL = "./vendor/msal/msal-browser.min.js";

/** 文档扩展名（契约 §2：文件 = 一个 .glb；身份 = `[夹/]<名>.glb`，路径即身份）。 */
export const DOC_EXT = ".glb";
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
