/** 名册上的种类。face = 模态（盖住场景，外面的一切不放）；menu / text / refwin = 只拿走键盘。 */
export type FaceKind = "face" | "menu" | "text" | "refwin";
export type Owner = FaceKind | "scene";
export type Source = "key" | "pointer" | "wheel" | "touch" | "xr";
export type HoldKind = "lock" | "asking";
export interface EditHold {
    readonly kind: HoldKind;
    readonly why: string;
}
export interface FaceEntry {
    readonly kind: FaceKind;
    /** 给人和黑匣子看的名字。 */
    readonly label: string;
    /** 谁在上面（对齐 styles.css 的 z 序）：决定主人是谁、Esc 先给谁。 */
    readonly rank: number;
    /** 现在开着吗。每次都现问，所以不会过期。 */
    up(): boolean;
    /** 这个面的地盘：写了 = 门口可以吞地盘外面的输入；没写 = 门口不吞，只是不放进场景（图库：菜单带和通知都在它自己的 DOM 外面）。 */
    readonly root?: unknown;
    /** 接 Esc：true = 接了。没有这一项或返回 false = 这次不接（模态面照样把 Esc 吞掉，不许穿到下面）。 */
    esc?(): boolean;
}
export interface HoldEntry {
    readonly kind: HoldKind;
    /** 给人看的原因（提示行 / 灰掉的钮的 title）。 */
    readonly why: string;
    /** 现在算不算。 */
    on(): boolean;
}
export interface InputGate {
    /** 进名册，返回退名册。 */
    face(f: FaceEntry): () => void;
    /** 加一条「此刻不许改模型」的理由，返回撤掉。 */
    hold(h: HoldEntry): () => void;
    /** 现在谁拥有输入：开着的面里最上面的那个；都关着 = scene。 */
    owner(): Owner;
    /** 这一下能不能进场景（编辑器 + 走路）。 */
    admits(source: Source): boolean;
    /** 这一下要不要在门口吞掉。inside = 宿主判断目标在不在这块地盘里。 */
    blocks(source: Source, inside: (root: unknown) => boolean): boolean;
    /** 把 Esc 交给最上面肯接的那个：handled = 接了；blocked = 模态面不接，吞掉；none = 没人管，照常往下走。 */
    escape(): "handled" | "blocked" | "none";
    /** 此刻不许改模型的第一条理由；空 = 能改。演示锁排最前。 */
    held(): EditHold | null;
}
export declare function createInputGate(): InputGate;
