import assert from "node:assert/strict";
import test from "node:test";

import { percent, sectionScore, sumScores } from "./scores.ts";

test("counts only the answers marked correct", () => {
  const answers = new Map([
    ["a", true],
    ["b", false],
  ]);
  assert.deepEqual(sectionScore(["a", "b", "c"], answers), {
    correct: 1,
    total: 3,
    manual: false,
  });
});

test("an override replaces the calculated score", () => {
  const answers = new Map([["a", true]]);
  assert.deepEqual(sectionScore(["a", "b"], answers, { correct_count: 4, total_count: 5 }), {
    correct: 4,
    total: 5,
    manual: true,
  });
});

test("an empty section scores zero out of zero", () => {
  assert.deepEqual(sectionScore([], new Map()), { correct: 0, total: 0, manual: false });
  assert.equal(percent({ correct: 0, total: 0, manual: false }), 0);
});

test("the total adds the sections and keeps the manual mark", () => {
  const total = sumScores([
    { correct: 1, total: 2, manual: false },
    { correct: 3, total: 4, manual: true },
  ]);
  assert.deepEqual(total, { correct: 4, total: 6, manual: true });
  assert.equal(percent(total), 67);
});
