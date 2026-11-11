import { type FormatReadNotes } from "../format/migrate/index.ts";
type Say<K extends keyof FormatReadNotes> = (v: NonNullable<FormatReadNotes[K]>) => string[];
/** 读入时记下的每一种 → 打开之后说的话（空 = 这一次没什么要说）。键的先后 = 说的先后。 */
export declare const READ_NOTE_SAY: {
    readonly [K in keyof Required<FormatReadNotes>]: Say<K>;
};
/** 故意不说的键（每一个写明为什么）。守卫只放过这几个「有值也不说」。 */
export declare const SILENT_NOTES: Readonly<Partial<Record<keyof FormatReadNotes, string>>>;
export declare function formatNotesSay(n: FormatReadNotes): string[];
export {};
