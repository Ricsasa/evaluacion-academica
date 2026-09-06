export type Score = { correct: number; total: number; manual: boolean };

/**
 * A section score is derived from the answers, unless the teacher stored an
 * override row for it.
 */
export function sectionScore(
  itemIds: string[],
  answers: Map<string, boolean>,
  override?: { correct_count: number; total_count: number },
): Score {
  if (override) {
    return { correct: override.correct_count, total: override.total_count, manual: true };
  }
  let correct = 0;
  for (const id of itemIds) {
    if (answers.get(id) === true) correct += 1;
  }
  return { correct, total: itemIds.length, manual: false };
}

export function sumScores(scores: Score[]): Score {
  return {
    correct: scores.reduce((total, score) => total + score.correct, 0),
    total: scores.reduce((total, score) => total + score.total, 0),
    manual: scores.some((score) => score.manual),
  };
}

export function percent({ correct, total }: Score) {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
