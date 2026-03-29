import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache } from "../src/lib/cache";

describe("Cache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", { data: 42 }, 5_000);
    expect(cache.get("key1")).toEqual({ data: 42 });
  });

  it("returns null for a missing key", () => {
    expect(cache.get("missing")).toBeNull();
  });

  it("returns null after TTL expires", () => {
    vi.useFakeTimers();
    cache.set("expiring", "value", 1_000);
    vi.advanceTimersByTime(1_001);
    expect(cache.get("expiring")).toBeNull();
    vi.useRealTimers();
  });

  it("does not expire before TTL", () => {
    vi.useFakeTimers();
    cache.set("fresh", "still-here", 5_000);
    vi.advanceTimersByTime(4_999);
    expect(cache.get("fresh")).toBe("still-here");
    vi.useRealTimers();
  });

  it("deletes a specific key", () => {
    cache.set("del-me", 123, 10_000);
    cache.delete("del-me");
    expect(cache.get("del-me")).toBeNull();
  });

  it("has() returns true for live keys", () => {
    cache.set("exists", true, 10_000);
    expect(cache.has("exists")).toBe(true);
  });

  it("has() returns false for expired keys", () => {
    vi.useFakeTimers();
    cache.set("expired", true, 500);
    vi.advanceTimersByTime(600);
    expect(cache.has("expired")).toBe(false);
    vi.useRealTimers();
  });

  it("clear() removes all entries", () => {
    cache.set("a", 1, 10_000);
    cache.set("b", 2, 10_000);
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });
});
