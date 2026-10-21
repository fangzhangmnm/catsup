import type { EditorTrace } from "../editor/editor.ts";
/** 开机 URL 一行（canary 探针页「原始 fragment 抓取」的同义物）：路径 + query 键 + hash 键。
 *  OAuth 回程的 error / error_description / error_uri **原文照抄**（这就是「授权没反应」要看的那句），
 *  code / state / client_info 等只记长度——一次性授权码不落黑匣子。必须在 initAuth 之前取：MSAL 处理完会把 hash 抹掉。 */
export declare function bootUrlLine(loc: {
    pathname: string;
    search: string;
    hash: string;
}): string;
/** 编辑器记账面包屑 → 一行。op 行 = 摘要 + 事件数 + 耗时 + 历史位置；失败行附 op JSON 前 400 字符（复现钥匙）。 */
export declare function traceLine(e: EditorTrace): string;
