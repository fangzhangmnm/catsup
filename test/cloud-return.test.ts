// 回来时没传的分两类（规则书 §1 第 15 条，2026-11-03 夜改写）。created 2026-11-04 by Claude Opus 5.5
import { describe, it, eq } from "./runner.mjs";
import { planReturn, neverUploadedIds } from "../src/app/cloud-return.ts";

describe("planReturn（CatsUp：心跳 app）", () => {
  const base = { dirty: 0, neverUploaded: 0, consented: false, saidLater: false };
  it("什么都没脏：什么都不做", () => eq(planReturn(base).kind, "none"));
  it("只有传过的：直接续传，不问", () => eq(planReturn({ ...base, dirty: 3 }).kind, "resume"));
  it("有从没传过的：问，N 只数从没传过的", () => { const p = planReturn({ ...base, dirty: 3, neverUploaded: 1 }); eq(p.kind, "ask"); eq(p.kind === "ask" && p.neverUploaded, 1); });
  it("这一页说过稍后：不问不推，全部进列表", () => { const p = planReturn({ ...base, dirty: 3, neverUploaded: 1, saidLater: true }); eq(p.kind, "list"); eq(p.kind === "list" && p.total, 3); });
  it("这一页点过现在传：之后回来直接传（同意已给）", () => eq(planReturn({ ...base, dirty: 2, neverUploaded: 2, consented: true }).kind, "resume"));
  it("别的都干净（只剩横幅管的那份，dirty 减到 0）：不打扰", () => eq(planReturn({ ...base, dirty: 0, neverUploaded: 1 }).kind, "none"));
});
describe("neverUploadedIds", () => {
  it("只认 float：local-only 是干净的，unpushed / conflict / ghost 是传过或撞名的", () => {
    const ids = neverUploadedIds([
      { identifier: "a.catsup", syncState: "float" }, { identifier: "b.catsup", syncState: "local-only" }, { identifier: "c.catsup", syncState: "unpushed" },
      { identifier: "d.catsup", syncState: "conflict" }, { identifier: "e.catsup", syncState: "ghost" }, { identifier: "f.catsup", syncState: "synced" }, { identifier: "g.catsup" },
    ]);
    eq([...ids].join(), "a.catsup");
  });
});
