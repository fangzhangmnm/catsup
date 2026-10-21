import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { Frame, Xform } from "../scene/xform.ts";
export type BakeMode = "wysiwyg" | "engine";
export interface DocumentSettings {
    displayUnit: string;
    gridStep: number;
    snapIncrement: number;
    absoluteGrid: boolean;
}
export interface GroupDoc {
    id: number;
    parent: number | null;
    axes: Frame;
    brep: BrepSnapshot;
    name?: string;
}
export interface InstanceDoc {
    id: number;
    definition: number;
    parent: number | null;
    xform: Xform;
    name?: string;
}
export interface DefinitionDoc {
    name: string;
    brep: BrepSnapshot;
    groups: GroupDoc[];
    instances: InstanceDoc[];
    extras?: Record<string, unknown>;
}
export interface CatsupDocument {
    settings: DocumentSettings;
    lastView?: unknown;
    bakeMode: BakeMode;
    /** 全部 definition；root = definitions[rootIndex]（同一对象）。 */
    definitions: DefinitionDoc[];
    rootIndex: number;
    root: DefinitionDoc;
    thumbnail?: {
        mimeType: string;
        bytes: Uint8Array;
    };
    /** round-trip 保真：读到的未知顶层键 / 未知扩展 / extras 原样带回；其中任何 `{ bufferView: N }` 引用的二进制也随 `views` 携带。 */
    carry: {
        topLevel: Record<string, unknown>;
        extensions: Record<string, unknown>;
        documentExtra: Record<string, unknown>;
        definitionsExtra: Record<string, unknown>;
        brepKeep?: Record<string, unknown>;
        views: Map<number, Uint8Array>;
    };
}
export declare const DEFAULT_SETTINGS: DocumentSettings;
export declare function newDocument(brep: BrepSnapshot, name?: string): CatsupDocument;
