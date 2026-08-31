import { describe, it, expect } from "vitest";
import { computeGroupMatch, compareMatchTier } from "@/lib/recommendation-tier";

const profile = { faculty: "Computer Science", degree: "BSc" };

describe("computeGroupMatch", () => {
  it("returns tier 'both' when faculty and degree both match", () => {
    const match = computeGroupMatch(profile, {
      course: { faculty: "Computer Science" },
      target_degree: "BSc",
    });
    expect(match.tier).toBe("both");
    expect(match.reasons).toEqual(["Your faculty", "Your degree"]);
  });

  it("returns tier 'one' when only faculty matches", () => {
    const match = computeGroupMatch(profile, {
      course: { faculty: "Computer Science" },
      target_degree: "MSc",
    });
    expect(match.tier).toBe("one");
    expect(match.reasons).toEqual(["Your faculty"]);
  });

  it("returns tier 'none' when neither faculty nor degree matches", () => {
    const match = computeGroupMatch(profile, {
      course: { faculty: "Business" },
      target_degree: "MSc",
    });
    expect(match.tier).toBe("none");
    expect(match.reasons).toEqual([]);
  });

  it("does not count a null target_degree (open to any degree) as a degree match", () => {
    const match = computeGroupMatch(profile, {
      course: { faculty: "Business" },
      target_degree: null,
    });
    expect(match.tier).toBe("none");
    expect(match.reasons).toEqual([]);
  });
});

describe("compareMatchTier", () => {
  it("orders 'both' before 'one' before 'none'", () => {
    expect(compareMatchTier("both", "one")).toBeLessThan(0);
    expect(compareMatchTier("one", "none")).toBeLessThan(0);
    expect(compareMatchTier("both", "none")).toBeLessThan(0);
  });

  it("returns 0 for equal tiers", () => {
    expect(compareMatchTier("one", "one")).toBe(0);
  });
});
