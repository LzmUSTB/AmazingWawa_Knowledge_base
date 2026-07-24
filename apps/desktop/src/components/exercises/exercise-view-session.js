const exerciseScrollPositions = new Map();

export function getExerciseScrollPosition(sessionId) {
  return Number(exerciseScrollPositions.get(sessionId)) || 0;
}

export function setExerciseScrollPosition(sessionId, scrollTop) {
  exerciseScrollPositions.set(sessionId, Math.max(0, Number(scrollTop) || 0));
}
