export type BodyKind = "brep" | "card";
export declare const BODY_KINDS: readonly BodyKind[];
export declare const isBodyKind: (x: unknown) => x is BodyKind;
