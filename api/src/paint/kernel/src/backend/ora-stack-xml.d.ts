import { type Stamp } from "./format/migrate.ts";
export interface OraNode {
    id: number;
    name: string;
    visible: boolean;
    opacity?: number;
    mode?: string;
    clippingMask?: boolean;
    isGroup: boolean;
    children?: OraNode[];
    bboxX?: number;
    bboxY?: number;
    lockAlpha?: boolean;
}
export interface OraDoc {
    layers: readonly OraNode[];
    width: number;
    height: number;
    activeId?: number | null;
    referenceLayerId?: number | null;
}
interface ParsedCommon {
    id: number | null;
    name: string;
    opacity: number;
    visible: boolean;
    mode: string;
    clippingMask: boolean;
    isActive: boolean;
}
export type ParsedNode = (ParsedCommon & {
    isGroup: true;
    children: ParsedNode[];
}) | (ParsedCommon & {
    isGroup: false;
    src: string;
    x: number;
    y: number;
    lockAlpha: boolean;
    isReference: boolean;
});
export declare function oraCompositeOp(canvasMode: string): string;
export declare function canvasModeFromOra(op: string): string;
export declare const ORA_FORMAT_VERSION: number;
export declare function buildStackXml(doc: OraDoc, wroteWithVersion?: string): string;
export declare function parseStackXml(xmlText: string): {
    w: number;
    h: number;
    nodes: ParsedNode[];
    wroteWith: string | null;
    formatVersion: number;
    formatStamp: Stamp;
};
export {};
