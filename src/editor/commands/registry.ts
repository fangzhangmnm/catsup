// commands/registry.ts —— 注册表的查法 + 守卫。核心（编辑器 / app）只经这里和 index.ts 认识指令与动作，不 import 任何一族的内部。created 2026-10-27 by Claude Fable 5.1
import type { Command, CommandId } from "./command.ts";
import { familyOf } from "./command.ts";
import type { Action, ActionId, Placement, Surface } from "./action.ts";
import type { ModeId } from "../mode.ts";
import { FAMILIES } from "./index.ts";

const FAMILY_NAMES: ReadonlySet<string> = new Set(["brep", "mesh", "object", "select", "view", "doc", "paint", "simulation"]);

let built: { commands: Map<CommandId, Command>; actions: Map<ActionId, Action>; placements: Placement[] } | null = null;
function tables(): NonNullable<typeof built> {
  if (built) return built;
  const commands = new Map<CommandId, Command>(), actions = new Map<ActionId, Action>(), placements: Placement[] = [];
  for (const f of FAMILIES) {
    for (const c of f.commands) if (!commands.has(c.id)) commands.set(c.id, c);
    for (const a of f.actions) if (!actions.has(a.id)) actions.set(a.id, a);
    placements.push(...f.placements);
  }
  placements.sort((a, b) => a.order - b.order);
  return (built = { commands, actions, placements });
}

export function commandById(id: string): Command | null { return tables().commands.get(id as CommandId) ?? null; }
export function actionById(id: string): Action | null { return tables().actions.get(id) ?? null; }
/** 某个放置面上的动作（按 order；按工作台筛）。O(表长)，几十到一百行。 */
export function placementsAt(where: Surface, mode?: ModeId): Placement[] {
  return tables().placements.filter((p) => p.where === where && (!mode || !p.modes || p.modes.includes(mode)));
}
export function allCommands(): readonly Command[] { return [...tables().commands.values()]; }

/** 守卫（测试调）：id 不重复、族名合法、每个动作指向存在的指令、每条放置指向存在的动作。返回问题清单（空 = 好）。 */
export function checkRegistry(): string[] {
  const bad: string[] = [];
  const seenC = new Set<string>(), seenA = new Set<string>();
  for (const f of FAMILIES) {
    for (const c of f.commands) {
      if (seenC.has(c.id)) bad.push(`指令 id 重复：${c.id}`); seenC.add(c.id);
      if (!FAMILY_NAMES.has(familyOf(c.id))) bad.push(`指令 ${c.id} 的族名不在表里（族名 = 单位种类）`);
      if (familyOf(c.id) !== c.unit) bad.push(`指令 ${c.id} 吃的单位是 ${c.unit}，族名却是 ${familyOf(c.id)}（族名 = 单位种类）`);
      if (!c.title || !c.none) bad.push(`指令 ${c.id} 缺标题 / 没事做时的说法`);
    }
    for (const a of f.actions) {
      if (seenA.has(a.id)) bad.push(`动作 id 重复：${a.id}`); seenA.add(a.id);
      if (!seenC.has(a.command)) bad.push(`动作 ${a.id} 指向不存在的指令 ${a.command}`);
    }
    for (const p of f.placements) if (!seenA.has(p.action)) bad.push(`放置 ${p.where}#${p.order} 指向不存在的动作 ${p.action}`);
  }
  return bad;
}
