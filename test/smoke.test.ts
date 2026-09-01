import { describe, it, assert } from "./runner.mjs";

describe("smoke", () => {
  it("runner 跑通", () => { assert(1 + 1 === 2, "宇宙常数异常"); });
});
