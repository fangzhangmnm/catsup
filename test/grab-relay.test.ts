// 笔轻 = 选、重 = 抓（controller/grab-relay.ts；笔的设计稿第七节第 6 步，统筹 11-13 定的五条）。created 2026-11-13 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { GrabRelay, type PressKind, type RelayAction, type RelayEnv } from "../src/controller/grab-relay.ts";
import type { PressHit } from "../src/controller/hard-press.ts";

/** 假环境：x < 100 = 东西、100 ≤ x < 200 = 把手、别处 = 空处。 */
const env = (o: { busy?: boolean; sel?: boolean } = {}): RelayEnv => ({ kindAt: (x): PressKind => (x < 100 ? "thing" : x < 200 ? "handle" : "empty"), busy: () => !!o.busy, hasActableSelection: () => !!o.sel, slop: 6 });
const hit = (x: number, y = 0): PressHit => ({ x, y, t: 0, how: "rise", base: 0.15, p: 0.6, after: 300 });
const P = (x: number, y = 0): { x: number; y: number } => ({ x, y });
const s = (acts: readonly RelayAction[]): string => acts.map((a) => (a.a === "abort" ? "abort" : `${a.a}@${a.x}${a.a === "down" ? `:${a.intent ?? "-"}` : ""}`)).join(" ");

describe("笔轻 = 选、重 = 抓：输入层怎么翻", () => {
  it("落在东西上轻按着滑 = 只找位置（一下按下都没有），抬笔 = 什么都不做", () => {
    const r = new GrabRelay(), e = env();
    eq(s(r.down(P(10), null, e)), "move@10"); eq(s(r.move(P(40))), "move@40"); eq(s(r.up(P(40), e)), "");
  });
  it("落在东西上轻点 = 在落笔处点一下（意思 = 选）", () => {
    const r = new GrabRelay(), e = env();
    r.down(P(10), null, e); r.move(P(12)); eq(s(r.up(P(12), e)), "down@10:select up@10");
  });
  it("空处轻按 = 框（按下带「选」）、拖、抬笔 = 框选生效", () => {
    const r = new GrabRelay(), e = env({ sel: true });
    eq(s(r.down(P(300), null, e)), "down@300:select"); r.move(P(340)); eq(s(r.up(P(340), e)), "up@340");
  });
  it("框到一半来了重按 = 框作废、在猛升之前那一点起抓", () => {
    const r = new GrabRelay(), e = env({ sel: true });
    r.down(P(300), null, e); r.move(P(50)); eq(s(r.hard(hit(50), e)), "abort down@50:grab"); eq(r.state, "grab");
  });
  it("重按 → 轻按滑 → 重按 = 抓、拖、落定；之后回到找位置，抬笔不再点一下", () => {
    const r = new GrabRelay(), e = env();
    r.down(P(10), null, e); eq(s(r.hard(hit(12), e)), "down@12:grab"); eq(s(r.move(P(60))), "move@60");
    eq(s(r.hard(hit(60), e)), "up@60"); eq(r.state, "seek"); eq(s(r.up(P(60), e)), "");
  });
  it("重按 → 滑 → 抬笔 = 在抬笔处落定", () => {
    const r = new GrabRelay(), e = env();
    r.down(P(10), null, e); r.hard(hit(10), e); r.move(P(70)); eq(s(r.up(P(70), e)), "up@70");
  });
  it("空处重按、没有选区 = 没东西可抓（什么都不做）；有选区 = 对选区做", () => {
    const a = new GrabRelay(), e0 = env(); a.down(P(10), null, e0); eq(s(a.hard(hit(300), e0)), "");
    const b = new GrabRelay(), e1 = env({ sel: true }); b.down(P(10), null, e1); eq(s(b.hard(hit(300), e1)), "down@300:grab");
  });
  it("落在把手上 = 照旧按住拖（不要重按），途中重按不管，抬笔 = 松手", () => {
    const r = new GrabRelay(), e = env();
    eq(s(r.down(P(150), null, e)), "down@150:-"); r.move(P(180)); eq(s(r.hard(hit(180), e)), ""); eq(s(r.up(P(180), e)), "up@180");
  });
  it("重按落在把手上 = 也是按住把手", () => {
    const r = new GrabRelay(), e = env();
    eq(s(r.down(P(150), { ...hit(150), how: "down" }, e)), "down@150:-"); eq(r.state, "handle");
  });
  it("落笔就重、落在东西上 = 起抓", () => {
    const r = new GrabRelay(), e = env();
    eq(s(r.down(P(10), { ...hit(10), how: "down" }, e)), "down@10:grab");
  });
  it("编辑器正在手势里（键盘起手跟着走）：重按 = 在那一点点一下（落定），轻点 = 在落笔处点一下", () => {
    const a = new GrabRelay(), e = env({ busy: true });
    eq(s(a.down(P(10), null, e)), "move@10"); eq(s(a.hard(hit(30), e)), "down@30:- up@30");
    const b = new GrabRelay(); b.down(P(10), null, e); eq(s(b.up(P(11), e)), "down@10:select up@10");
  });
});
