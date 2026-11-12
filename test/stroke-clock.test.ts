// 画画的一笔：时间按哪种钟算、压感信谁的（施工单二十 1a，src/controller/stroke-clock.ts）。created 2026-11-12 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { StrokeClock } from "../src/controller/stroke-clock.ts";

describe("一笔的时钟（一笔里只用一种钟，照抬笔结算）", () => {
  it("落笔的事件时间像样 = 整笔按事件时间（相对落笔）；处理时刻怎么抖都不影响", () => {
    const c = new StrokeClock(5000, 5003);
    assert(c.event, "按事件时间");
    eq([c.time(5008, 5100), c.time(5016, 5101), c.time(5024, 5400)].join(), "8,16,24", "只看事件时间（机器慢了一大截也一样）");
  });
  it("落笔没有事件时间 / 不像样（程序造的 0、纪元毫秒）= 整笔按处理时刻", () => {
    for (const at of [undefined, 0, NaN, 1.7e12]) {
      const c = new StrokeClock(at as number | undefined, 1000);
      assert(!c.event, `落笔 at=${at} → 按处理时刻`);
      eq(c.time(5008, 1016), 16, "后面的样本有像样的事件时间也不换钟");
    }
  });
  it("按事件时间的一笔里有一个样本不像样：按落笔时两种钟的差折算（= 处理时刻 − 落笔的处理时刻），不往回走", () => {
    const c = new StrokeClock(5000, 5003);
    eq(c.time(5010, 5013), 10);
    eq(c.time(undefined, 5025), 22, "折算：5025 − 5003");
    eq(c.time(5020, 5030), 22, "下一个像样的样本算出来比上一个小：不往回走");
    eq(c.time(5040, 5043), 40);
  });
});

describe("一笔的压感（只信笔的）", () => {
  it("鼠标 / 手指一律 1（它们报的 0.5 / 0 不是压感）；没带压感 = 1", () => {
    const c = new StrokeClock(1, 1);
    eq([c.pressure("mouse", 0.5), c.pressure("touch", 0), c.pressure("pen", undefined), c.pressure(undefined, 0.3)].join(), "1,1,1,1");
  });
  it("笔：用它报的；报 0 = 这个样本没带，用上一个；超过 1 截到 1", () => {
    const c = new StrokeClock(1, 1);
    eq([c.pressure("pen", 0.3), c.pressure("pen", 0), c.pressure("pen", 0.7), c.pressure("pen", 1.4)].join(), "0.3,0.3,0.7,1");
    eq(new StrokeClock(1, 1).pressure("pen", 0), 1, "第一个样本就没带：1");
  });
});
