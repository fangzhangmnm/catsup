// controller/axis-constraint.ts —— 轴键的约束：动作里按 X / Y / Z / N / T（单按 / 加 Shift）之后，现在被限制成什么（锁的一轮第一步）。created 2026-11-13 by Claude Opus 5.5
// 设计稿 = ai-docs/20261113-axis-constraint-module-design.md（规矩 user 11-13 夜逐条批的；模块的形状是统筹的设计）。
// 规矩第 3–7 条全部住在这里，别处一条都不许有：单按要几个方向（工具开头说的 wants）、加 Shift = 垂直于它的面、Shift 加单按 = 面里那个方向、同一个键再按 = 取消、组合不成立 = 后按的盖掉先按的。
// 纯函数：零 DOM、零编辑器、零内核。「这个键此刻指哪个方向」不在这里算（编辑器 resolveAxisKey 一处），这里只拿到方向和「它是谁」（判是不是同一个用）。
// 状态对外不透明：外面只存、只传回来，不许读里面（守卫钉）。改规矩 = 改这个文件 + 对照表 test/axis-constraint.test.ts。
import { AXIS_PARALLEL_DEG } from "./feel.ts";

export interface Vec3 { readonly x: number; readonly y: number; readonly z: number }
export type AxisKey = "x" | "y" | "z" | "n" | "t";
/** 一次按键。dir = 这个键此刻指的方向（调用方解析好；长度不要求是 1，这里归一）；ref = 它指的是谁（哪根轴 / 哪张面 / 哪条边的身份），只用来判「是不是同一个」。 */
export interface AxisPress { readonly key: AxisKey; readonly shift: boolean; readonly dir: Vec3; readonly ref: string }
declare const AXIS_STATE: unique symbol;
/** 模块自己的状态。不透明：外面只存、只传回来。 */
export type AxisState = { readonly [AXIS_STATE]: true };
/** 现在被限制成什么。工具只认这四种。 */
export type AxisConstraint =
  | { readonly kind: "free" }
  | { readonly kind: "line"; readonly dir: Vec3 }                              // 只沿这条线
  | { readonly kind: "plane"; readonly normal: Vec3 }                          // 只在这个面里
  | { readonly kind: "planeDir"; readonly normal: Vec3; readonly dir: Vec3 };  // 在这个面里，并且指定了面里的一个方向（dir ⟂ normal）

// ---------------------------------------------------------------- 里面（可以改，外面不受影响）
interface Entry { readonly key: AxisKey; readonly shift: boolean; readonly dir: Vec3; readonly ref: string }
/** 状态 = 按先后排的若干条 + 开头给的 wants。容量：Shift 最多两条；单按在没有 Shift 时最多 wants 条，有 Shift 时最多一条。 */
interface Inner { readonly wants: 1 | 2; readonly entries: readonly Entry[] }
const wrap = (i: Inner): AxisState => i as unknown as AxisState;
const open = (s: AxisState): Inner => s as unknown as Inner;

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const unit = (a: Vec3): Vec3 => { const l = Math.hypot(a.x, a.y, a.z); return l > 0 ? scale(a, 1 / l) : a; };
const COS_PAR = Math.cos((AXIS_PARALLEL_DEG * Math.PI) / 180);
/** 两个方向平行（同向或反向，夹角 ≤ AXIS_PARALLEL_DEG）。 */
const parallel = (a: Vec3, b: Vec3): boolean => Math.abs(dot(unit(a), unit(b))) >= COS_PAR;
/** 单按 d 和 Shift（面的法向）合不合：一条 Shift = d 能投进面里（不平行于法向）；两条 Shift = d 沿着两面的交线。 */
const fits = (d: Vec3, shifts: readonly Entry[]): boolean => shifts.length === 0 ? true : shifts.length === 1 ? !parallel(d, shifts[0].dir) : parallel(d, cross(shifts[0].dir, shifts[1].dir));
const same = (a: Entry, b: AxisPress): boolean => a.key === b.key && a.shift === b.shift && a.ref === b.ref;

/** 一个动作开始时拿一份空的状态。wants = 这把工具要几个方向（画线 / 移动 / 挤出 / 旋转 / 缩放 = 1；矩形 / 圆 = 2）。 */
export function axisBegin(wants: 1 | 2): AxisState { return wrap({ wants, entries: [] }); }

/** 按了一下之后的状态。换 / 加 / 取消 / 最多几条 / 谁盖谁，都在这里。 */
export function axisPress(s: AxisState, p: AxisPress): AxisState {
  const st = open(s), e: Entry = { key: p.key, shift: p.shift, dir: unit(p.dir), ref: p.ref };
  if (st.entries.some((x) => same(x, p))) return wrap({ wants: st.wants, entries: st.entries.filter((x) => !same(x, p)) });   // 规矩 6：同一个键（N / T = 同一张面 / 同一条边）再按 = 取消它
  let shifts = st.entries.filter((x) => x.shift), singles = st.entries.filter((x) => !x.shift);
  if (!e.shift) {
    // 新来一条单按：有 Shift 在 = 换掉原来的单按；没有 = 加进来、只留最近的 wants 条（和它平行的旧的去掉，留新的）
    singles = shifts.length ? [e] : [...singles.filter((x) => !parallel(x.dir, e.dir)), e].slice(-st.wants);
    // 规矩 7（后按的单按盖掉先按的 Shift）：两条 Shift 而它不沿交线 = 丢掉早的那条；剩一条而它平行于法向（投不进面里）= 那条也丢
    if (shifts.length === 2 && !fits(e.dir, shifts)) shifts = shifts.slice(1);
    if (shifts.length === 1 && !fits(e.dir, shifts)) shifts = [];
  } else {
    // 新来一条 Shift：加进来、只留最近的两条（和它平行的旧的去掉，留新的）；单按只留最近的一条；那条单按和现在的 Shift 不合 = 丢掉单按（后按的 Shift 盖掉先按的单按）
    shifts = [...shifts.filter((x) => !parallel(x.dir, e.dir)), e].slice(-2);
    singles = singles.slice(-1).filter((x) => fits(x.dir, shifts));
  }
  return wrap({ wants: st.wants, entries: st.entries.filter((x) => shifts.includes(x) || singles.includes(x)).concat([e].filter((x) => shifts.includes(x) || singles.includes(x))) });
}

/** 现在被限制成什么。 */
export function axisConstraint(s: AxisState): AxisConstraint {
  const es = open(s).entries, shifts = es.filter((x) => x.shift), singles = es.filter((x) => !x.shift);
  if (shifts.length === 2) return { kind: "line", dir: unit(cross(shifts[0].dir, shifts[1].dir)) };   // 两个面夹出的线（有沿着它的单按也还是这条线）
  if (shifts.length === 1) {
    const n = shifts[0].dir;
    if (!singles.length) return { kind: "plane", normal: n };
    const d = singles[singles.length - 1].dir;
    return { kind: "planeDir", normal: n, dir: unit(sub(d, scale(n, dot(d, n)))) };   // 单按投到面里
  }
  if (singles.length === 2) {   // 两条单按（只有 wants = 2 才会有）：两根撑出的面，方向 = 第一根；第二根取和它垂直的那一部分
    const [d1, d2] = [singles[0].dir, singles[1].dir];
    return { kind: "planeDir", normal: unit(cross(d1, d2)), dir: d1 };
  }
  if (singles.length === 1) return { kind: "line", dir: singles[0].dir };
  return { kind: "free" };
}

const KEY_NAME: Readonly<Record<AxisKey, string>> = { x: "X", y: "Y", z: "Z", n: "法线", t: "边的方向" };
const PLANE_NAME: Readonly<Record<AxisKey, string>> = { x: "YZ 面", y: "XZ 面", z: "XY 面", n: "光标下那张面", t: "垂直于那条边的面" };
/** 给人看的：亮哪几个键（带不带 Shift，按先后）、一句话（提示行）。 */
export function axisDescribe(s: AxisState): { readonly keys: readonly { key: AxisKey; shift: boolean }[]; readonly say: string } {
  const es = open(s).entries, shifts = es.filter((x) => x.shift), singles = es.filter((x) => !x.shift);
  const keys = es.map((x) => ({ key: x.key, shift: x.shift }));
  let say = "";
  if (shifts.length === 2) say = `沿${PLANE_NAME[shifts[0].key]}和${PLANE_NAME[shifts[1].key]}的交线`;
  else if (shifts.length === 1) say = singles.length ? `在${PLANE_NAME[shifts[0].key]}里，沿 ${KEY_NAME[singles[singles.length - 1].key]}（投到面里）` : `只在${PLANE_NAME[shifts[0].key]}里`;
  else if (singles.length === 2) say = `在 ${KEY_NAME[singles[0].key]} 和 ${KEY_NAME[singles[1].key]} 撑出的面里，一条边沿 ${KEY_NAME[singles[0].key]}`;
  else if (singles.length === 1) say = `沿 ${KEY_NAME[singles[0].key]}`;
  return { keys, say };
}
