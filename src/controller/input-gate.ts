// controller/input-gate.ts —— 输入闸：架在所有输入之前的窄接口，回答两个问题。created 2026-11-05 by Claude Opus 5.5
// user 11-05「应该有一个全局的窄接口，架在输入之前，而且要多放几层瑞士奶酪，我们有中心化的输入深模块吗。以后给vr铺路」。设计 = ai-docs/20261105-input-gate-design.md。
//   ① 谁拥有输入：一张名册，每个面声明「我现在开着吗」。键盘 / 指针 / 滚轮 / 触屏 / 头显进场景（编辑器和走路）之前问 admits。
//   ② 模型此刻能不能改：几条理由（演示锁 / 正在问），每条声明「现在算不算」。编辑器的口问 held。
// 两条轴都是**声明式**的：闸手里没有「开了 / 关了」的账，面自己怎么关（hidden = true、Vue 卸载、以后头显里的一块板）闸都当场知道。
//   不用开关配对的票据，是因为漏一次释放 = 键盘永远死掉，而面的关法太多（直接改 hidden、一路 finally、库的面）；声明式没有这种失败。
// 无头（src/controller/ 的规矩）：不认识 DOM、不认识头显。root 是不透明的：桌面 = CSS 选择器，以后 VR = 那块板的 id，判断「目标在不在里面」归宿主。

/** 名册上的种类。face = 模态（盖住场景，外面的一切不放）；menu / text / refwin = 只拿走键盘。 */
export type FaceKind = "face" | "menu" | "text" | "refwin";
export type Owner = FaceKind | "scene";
export type Source = "key" | "pointer" | "wheel" | "touch" | "xr";
export type HoldKind = "lock" | "asking";
export interface EditHold { readonly kind: HoldKind; readonly why: string }

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

const HOLD_ORDER: readonly HoldKind[] = ["lock", "asking"];

export function createInputGate(): InputGate {
  const faces: FaceEntry[] = [];
  const holds: HoldEntry[] = [];
  const upFaces = (): FaceEntry[] => faces.filter((f) => f.up());   // 名册按 rank 从高到低排好（face() 里插入），每次现问
  const isGuardedFace = (f: FaceEntry): boolean => f.kind === "face" && f.root !== undefined;
  const removeFrom = <T>(list: T[], x: T): void => { const i = list.indexOf(x); if (i >= 0) list.splice(i, 1); };
  return {
    face(f) {
      const at = faces.findIndex((x) => x.rank < f.rank);
      if (at < 0) faces.push(f); else faces.splice(at, 0, f);
      return () => removeFrom(faces, f);
    },
    hold(h) {
      holds.push(h);
      return () => removeFrom(holds, h);
    },
    owner: () => upFaces()[0]?.kind ?? "scene",
    admits(source) {
      const up = upFaces();
      if (up.length === 0) return true;
      if (up.some((f) => f.kind === "face")) return false;
      return source !== "key";
    },
    blocks(source, inside) {
      const up = upFaces();
      if (up.length === 0) return false;
      if (up.some((f) => f.root !== undefined && inside(f.root))) return false;
      if (up.some(isGuardedFace)) return true;
      return source === "key" && up.some((f) => f.kind === "menu");
    },
    escape() {
      for (const f of upFaces()) {
        if (f.esc?.()) return "handled";
        if (isGuardedFace(f)) return "blocked";
      }
      return "none";
    },
    held() {
      for (const kind of HOLD_ORDER) {
        const h = holds.find((x) => x.kind === kind && x.on());
        if (h) return { kind: h.kind, why: h.why };
      }
      return null;
    },
  };
}
