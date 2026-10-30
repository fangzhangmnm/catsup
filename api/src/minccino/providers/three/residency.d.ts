import type { Preset, ScreenPreset } from "../../preset/index.ts";
/** 常驻表认识的几样（provider 内部的名字，引擎契约里没有）。 */
export type ResidentId = "paperGround" | "pbrGround" | "pixelScreen" | "bloom" | "envMap" | "aoAtlas";
export interface Resident {
    /** 亮（场景里的东西：visible = true）。显存类的不用。 */
    show?(): void;
    /** 藏。 */
    hide?(): void;
    /** 放显存（对象留着；下次要时重建）。 */
    release?(): void;
    /** 现在占多少显存（字节；没建 / 放掉了 = 0）。 */
    bytes(): number;
}
/** 切走后闲置多久放显存（毫秒）：来回切画风不至于每次重建，放着不用也不会一直占。 */
export declare const IDLE_MS = 5000;
/** 这个画风这一帧要哪几样（声明；和画法分支同一个来源）。 */
export declare function residentsOf(p: Preset, screen: ScreenPreset): Set<ResidentId>;
export declare class Residency {
    private items;
    register(id: ResidentId, r: Resident): void;
    /** 这一帧要的名单：要的亮、不要的藏、不要超过 IDLE_MS 的放显存（画任何一遍之前调）。 */
    submit(wanted: ReadonlySet<ResidentId>, now: number): void;
    /** 实际常驻的显存（字节；血槽位用——以前只算当前画风的几块）。 */
    bytes(): number;
    /** 探针：现在亮着的几样。 */
    shownIds(): ResidentId[];
}
