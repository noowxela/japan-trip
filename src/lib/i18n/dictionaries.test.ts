import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n/dictionaries";

describe("t()", () => {
  it("interpolates variables", () => {
    expect(t("en", "schedule.pendingCount", { n: 3 })).toBe("3 pending");
    expect(t("zh", "schedule.pendingCount", { n: 3 })).toBe("3 个待定");
    expect(t("en", "schedule.skippedCount", { n: 2 })).toBe("2 skipped");
    expect(t("zh", "schedule.skippedCount", { n: 2 })).toBe("2 个跳过");
    expect(t("en", "schedule.pendingAndSkippedCount", { n: 3, m: 2 })).toBe(
      "3 pending · 2 skipped",
    );
    expect(t("zh", "schedule.pendingAndSkippedCount", { n: 3, m: 2 })).toBe(
      "3 个待定 · 2 个跳过",
    );
  });

  it("falls back zh → en → key", () => {
    expect(t("zh", "nav.overview")).toBe("总览");
    expect(t("en", "nav.overview")).toBe("Overview");
    expect(t("zh", "does.not.exist")).toBe("does.not.exist");
  });
});

describe("agenda.editItem", () => {
  it("has zh and en copy", () => {
    expect(t("en", "agenda.editItem")).toBe("Edit stop");
    expect(t("zh", "agenda.editItem")).toBe("编辑行程");
  });
});


describe("agenda.hideFreeVisited", () => {
  it("has zh and en hide/show labels", () => {
    expect(t("en", "agenda.hideFreeVisited")).toBe("Hide free time / 済");
    expect(t("zh", "agenda.hideFreeVisited")).toBe("隐藏空闲/済");
    expect(t("en", "agenda.showFreeVisited")).toBe("Show free time / 済");
    expect(t("zh", "agenda.showFreeVisited")).toBe("显示空闲/済");
  });
});
describe("agenda.skipPending", () => {
  it("has zh and en copy", () => {
    expect(t("en", "agenda.skipPending")).toBe("Skip");
    expect(t("zh", "agenda.skipPending")).toBe("跳过");
  });
});

describe("each paid own copy", () => {
  it("has zh and en toggle and badge labels", () => {
    expect(t("en", "form.eachPaidOwn")).toBe("Each paid own");
    expect(t("zh", "form.eachPaidOwn")).toBe("各付各的");
    expect(t("en", "spend.eachPaidOwnBadge", { n: 2 })).toBe("Each paid ×2");
    expect(t("zh", "spend.eachPaidOwnBadge", { n: 2 })).toBe("各付 ×2");
    expect(t("en", "spend.eachPaidOwnUnit", { amount: "¥1,200", n: 2 })).toBe(
      "Each paid ¥1,200 ×2",
    );
    expect(t("zh", "spend.eachPaidOwnUnit", { amount: "¥1,200", n: 2 })).toBe(
      "各付 ¥1,200 ×2",
    );
    expect(t("en", "form.subtotal")).toBe("Subtotal");
    expect(t("zh", "form.subtotal")).toBe("小计");
  });
});

describe("pending and skip move copy", () => {
  it("includes the old time and batch counts in zh and en", () => {
    expect(t("en", "action.movedToPendingWithTime", { time: "14:30" })).toBe(
      "Moved to pending · was 14:30",
    );
    expect(t("zh", "action.movedToPendingWithTime", { time: "14:30" })).toBe(
      "已移到待定 · 原时间 14:30",
    );
    expect(t("en", "action.movedToPendingCount", { n: 3 })).toBe(
      "Moved 3 to pending",
    );
    expect(t("zh", "action.movedToPendingCount", { n: 3 })).toBe(
      "已将 3 项移到待定",
    );
    expect(t("en", "action.transitLeftUnchanged", { n: 2 })).toBe(
      "2 transit left unchanged",
    );
    expect(t("zh", "action.transitLeftUnchanged", { n: 2 })).toBe(
      "2 项交通未改",
    );
    expect(t("en", "action.markedSkippedCount", { n: 3 })).toBe(
      "Marked 3 skipped",
    );
    expect(t("zh", "action.markedSkippedCount", { n: 3 })).toBe(
      "已将 3 项标记跳过",
    );
  });
});

describe("schedule.visitedOnlyHint", () => {
  it("has zh and en copy with a count", () => {
    expect(t("en", "schedule.visitedOnlyHint", { n: 4 })).toBe("Visited only · 4");
    expect(t("zh", "schedule.visitedOnlyHint", { n: 4 })).toBe("只显示去过的 · 4");
    expect(t("en", "schedule.noneVisited")).toBe("No visited stops yet");
    expect(t("zh", "schedule.noneVisited")).toBe("还没有去过的行程");
  });
});

describe("ingestLog pagination copy", () => {
  it("has zh and en range and pager labels", () => {
    expect(t("en", "ingestLog.pageRange", { from: 1, to: 10, total: 25 })).toBe(
      "1–10 of 25",
    );
    expect(t("zh", "ingestLog.pageRange", { from: 1, to: 10, total: 25 })).toBe(
      "第 1–10 条，共 25 条",
    );
    expect(t("en", "ingestLog.prev")).toBe("Previous");
    expect(t("zh", "ingestLog.prev")).toBe("上一页");
    expect(t("en", "ingestLog.next")).toBe("Next");
    expect(t("zh", "ingestLog.next")).toBe("下一页");
  });
});

describe("clothes, gifts, checkout, and airfare copy", () => {
  it("has zh and en labels", () => {
    expect(t("en", "clothes.title")).toBe("Clothes");
    expect(t("zh", "clothes.title")).toBe("衣物");
    expect(t("en", "more.clothesDetail")).toBe("Record how many of each to bring");
    expect(t("zh", "more.clothesDetail")).toBe("记录要带多少件衣服");
    expect(t("en", "gifts.title")).toBe("Gifts");
    expect(t("zh", "gifts.title")).toBe("手信");
    expect(t("en", "gifts.thisIsGift")).toBe("This is a gift");
    expect(t("zh", "gifts.thisIsGift")).toBe("这是手信");
    expect(t("en", "overview.checkoutToday")).toBe("Checkout today");
    expect(t("zh", "overview.checkoutToday")).toBe("今天退房");
    expect(t("en", "overview.markCheckedOut")).toBe("Checked out");
    expect(t("zh", "overview.markCheckedOut")).toBe("已退房");
    expect(t("en", "cat.Airfare")).toBe("Airfare");
    expect(t("zh", "cat.Airfare")).toBe("飞机票");
    expect(t("en", "cat.Ride-hailing")).toBe("Ride-hailing");
    expect(t("zh", "cat.Ride-hailing")).toBe("网约车");
    expect(t("en", "mode.Ride-hailing")).toBe("Ride-hailing");
    expect(t("zh", "mode.Ride-hailing")).toBe("网约车");
    expect(t("en", "mode.Train")).toBe("Train");
    expect(t("zh", "mode.Train")).toBe("电车");
    expect(t("en", "form.planTimed")).toBe("Set a time");
    expect(t("zh", "form.planTimed")).toBe("排时间");
    expect(t("en", "form.planPending")).toBe("Pending");
    expect(t("zh", "form.planPending")).toBe("待定");
    expect(t("zh", "agenda.addSpend")).toBe("＋ 记一笔花费");
    expect(t("zh", "agenda.linkSpend")).toBe("关联已有花费");
    expect(t("en", "budget.filterPayer")).toBe("Payer");
    expect(t("zh", "budget.filterPayer")).toBe("付款人");
    expect(t("en", "budget.filterSplit")).toBe("Split with");
    expect(t("zh", "budget.filterSplit")).toBe("分摊人");
    expect(t("en", "gifts.tabAll")).toBe("All");
    expect(t("zh", "gifts.tabAll")).toBe("全部");
    expect(t("en", "version.upToDateWithVersion", { version: "0.1.87" })).toBe(
      "You're already on the latest version v0.1.87",
    );
    expect(t("zh", "version.upToDateWithVersion", { version: "0.1.87" })).toBe(
      "已是最新版本 v0.1.87",
    );
    expect(t("zh", "version.checkFailed")).toBe("检查更新失败");
  });
});

describe("overview day cards and eSIM copy", () => {
  it("has zh and en labels", () => {
    expect(t("en", "overview.dayCards")).toBe("Trip days");
    expect(t("zh", "overview.dayCards")).toBe("行程日");
    expect(t("en", "overview.dayCardAria", { n: 7, date: "Thu 12 Nov" })).toBe(
      "Day 7, Thu 12 Nov",
    );
    expect(t("zh", "overview.dayCardAria", { n: 7, date: "11月12日 周四" })).toBe(
      "第7天，11月12日 周四",
    );
    expect(t("en", "overview.dayCardTodayAria", { n: 7, date: "Thu 12 Nov" })).toBe(
      "Day 7, Thu 12 Nov, today",
    );
    expect(t("zh", "overview.dayCardTodayAria", { n: 7, date: "11月12日 周四" })).toBe(
      "第7天，11月12日 周四，今天",
    );
    expect(t("en", "esim.title")).toBe("eSIM");
    expect(t("zh", "esim.title")).toBe("eSIM");
    expect(t("en", "esim.add")).toBe("Add plan");
    expect(t("zh", "esim.add")).toBe("添加套餐");
    expect(t("en", "esim.expired")).toBe("Expired");
    expect(t("zh", "esim.expired")).toBe("已过期");
    expect(t("en", "esim.validUntil", { date: "20 Nov" })).toBe("Valid until 20 Nov");
    expect(t("zh", "esim.validUntil", { date: "11月20日" })).toBe("有效期至 11月20日");
  });
});

describe("budget.beforeTrip", () => {
  it("has zh and en labels", () => {
    expect(t("en", "budget.beforeTrip")).toBe("Before trip");
    expect(t("zh", "budget.beforeTrip")).toBe("出发前");
  });
});

describe("spend item context menu copy", () => {
  it("has zh and en labels", () => {
    expect(t("en", "budget.changeCategory")).toBe("Change category");
    expect(t("zh", "budget.changeCategory")).toBe("改分类");
    expect(t("en", "budget.moveToDay")).toBe("Move to another day");
    expect(t("zh", "budget.moveToDay")).toBe("挪到其他日期");
    expect(t("en", "budget.duplicate")).toBe("Duplicate");
    expect(t("zh", "budget.duplicate")).toBe("复制");
    expect(t("en", "budget.chooseCategory")).toBe("Choose category");
    expect(t("zh", "budget.chooseCategory")).toBe("选择分类");
    expect(t("en", "budget.chooseDay")).toBe("Choose a date");
    expect(t("zh", "budget.chooseDay")).toBe("选择日期");
  });
});

describe("cookie lab copy", () => {
  it("has zh and en labels", () => {
    expect(t("en", "cookieLab.title")).toBe("Cookie lab");
    expect(t("zh", "cookieLab.title")).toBe("Cookie 实验");
    expect(t("en", "cookieLab.you")).toBe("You");
    expect(t("zh", "cookieLab.you")).toBe("你");
    expect(t("en", "cookieLab.visits", { n: 3 })).toBe("3 visits");
    expect(t("zh", "cookieLab.visits", { n: 3 })).toBe("3 次访问");
    expect(t("en", "more.privacyNote")).toContain("visitor ID");
    expect(t("zh", "more.privacyNote")).toContain("访客 ID");
  });
});

