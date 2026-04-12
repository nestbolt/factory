import { describe, it, expect } from "vitest";
import { Sequence } from "../src/sequence";

describe("Sequence", () => {
  describe("increment()", () => {
    it("should start from 1 by default", () => {
      const seq = Sequence.increment();
      expect(seq.next()).toBe(1);
      expect(seq.next()).toBe(2);
      expect(seq.next()).toBe(3);
    });

    it("should start from custom value", () => {
      const seq = Sequence.increment(100);
      expect(seq.next()).toBe(100);
      expect(seq.next()).toBe(101);
      expect(seq.next()).toBe(102);
    });
  });

  describe("cycle()", () => {
    it("should cycle through values", () => {
      const seq = Sequence.cycle(["a", "b", "c"]);
      expect(seq.next()).toBe("a");
      expect(seq.next()).toBe("b");
      expect(seq.next()).toBe("c");
      expect(seq.next()).toBe("a");
      expect(seq.next()).toBe("b");
    });
  });

  describe("from()", () => {
    it("should use custom callback", () => {
      const seq = Sequence.from((i) => `user${i}@test.com`);
      expect(seq.next()).toBe("user0@test.com");
      expect(seq.next()).toBe("user1@test.com");
      expect(seq.next()).toBe("user2@test.com");
    });
  });

  describe("reset()", () => {
    it("should reset the index to 0", () => {
      const seq = Sequence.increment();
      seq.next();
      seq.next();
      seq.next();
      seq.reset();
      expect(seq.next()).toBe(1);
    });
  });

  describe("constructor", () => {
    it("should accept a raw callback", () => {
      const seq = new Sequence((i) => i * 10);
      expect(seq.next()).toBe(0);
      expect(seq.next()).toBe(10);
      expect(seq.next()).toBe(20);
    });
  });
});
