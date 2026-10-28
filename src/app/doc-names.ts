// doc-names.ts —— 工程文件的名字：裸名 ↔ 全名 ↔ 后缀（纯函数，无 DOM；session / store-ui / 测试共用）。created 2026-10-28 by Claude Opus 5.5
// 账本 UX39 / 导出设计稿 §6：新文档 = .catsup，老 .glb 工程永远照开、不改名（改名只改主干、后缀保留）。认工程靠内容，这里只管名字。
import { DOC_EXT, DOC_EXTS } from "../config.ts";

/** 文档名的后缀（.catsup / 老 .glb；都不是 = ""）。大小写不敏感，返回的是规范小写形。 */
export const docSuffixOf = (p: string): string => { const low = p.toLowerCase(); return DOC_EXTS.find((e) => low.endsWith(e)) ?? ""; };
/** 去掉夹和后缀的裸名（显示用）。 */
export const bareName = (full: string): string => { const b = full.replace(/^.*\//, ""), e = docSuffixOf(b); return e ? b.slice(0, -e.length) : b; };
/** 拼文档名：缺 ext = 新文档的后缀（.catsup）；改名传原来的后缀（老 .glb 改名还是 .glb）。 */
export const fullName = (dir: string, bare: string, ext: string = DOC_EXT): string => `${dir ? dir + "/" : ""}${bare}${ext}`;
export const isDocName = (p: string): boolean => docSuffixOf(p) !== "";
