/** 提示行的「作用于」那半句（披露）。 */
export declare function scopeText(sc: {
    readonly mode: "selection" | "context";
    readonly components: number;
    readonly copies: number;
    readonly locked: number;
}): string;
/** 擦线前问的那句话：要等多久、估计怎么来的（user 10-26「不要因为性能静默不做，宁愿弹警告问yes no」）。 */
export declare function eraseAskText(title: string, e: {
    edges: number;
    seconds: number;
    faces: number;
}): string;
