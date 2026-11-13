import { type FormatReadNotes } from "../format/migrate/index.ts";
type Say<K extends keyof FormatReadNotes> = (v: NonNullable<FormatReadNotes[K]>) => string[];
/** 读入时记下的每一种 → 打开之后说的话（空 = 这一次没什么要说）。键的先后 = 说的先后。 */
export declare const READ_NOTE_SAY: {
    readonly [K in keyof Required<FormatReadNotes>]: Say<K>;
};
/**
 * 「N 张面、M 条边带着这一版不认识的标记」——打开和导入素材两处共用（导入那句在 shelf-actions.ts）。只说事实：不猜是谁写的
 * （可能是更新版的 CatsUp、别的软件，也可能是文件坏了；统筹 11-13）。
 */
export declare function unknownMarksText(v: {
    faces: number;
    edges: number;
}): string;
/** 故意不说的键（每一个写明为什么）。守卫只放过这几个「有值也不说」。 */
export declare const SILENT_NOTES: Readonly<Partial<Record<keyof FormatReadNotes, string>>>;
/**
 * 读入时记下的每一种：再存盘会不会把东西去掉（贴图主线 1-8b，统筹 11-11 定）。true = 会丢 → 第一次存盘之前要用户明着点一次头，在那之前自动保存不写这份文件。
 * 每个键都要表态（类型上少一个编译不过；守卫 test/format-notes-guard.test.ts 钉住哪几个是 true）。
 */
export declare const LOSSY_NOTES: {
    readonly [K in keyof Required<FormatReadNotes>]: boolean;
};
/** 这次读入记下的、会丢东西的那几种说的话（没有 = 空）。 */
export declare function lossySay(n: FormatReadNotes | undefined): string[];
export declare function formatNotesSay(n: FormatReadNotes): string[];
export {};
