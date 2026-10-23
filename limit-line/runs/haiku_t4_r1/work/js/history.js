const MAX_UNDO_STEPS = 50;

// Undo/redo history for any state value. Each push makes the new state current
// and drops any redo steps.
export function createHistory(initial) {
  let current = initial;
  const undoSteps = [];
  const redoSteps = [];

  return {
    state: () => current,

    push(newState) {
      undoSteps.push(current);
      if (undoSteps.length > MAX_UNDO_STEPS) undoSteps.shift();
      current = newState;
      redoSteps.length = 0;
    },

    undo() {
      if (undoSteps.length > 0) {
        redoSteps.push(current);
        current = undoSteps.pop();
      }
      return current;
    },

    redo() {
      if (redoSteps.length > 0) {
        undoSteps.push(current);
        current = redoSteps.pop();
      }
      return current;
    },

    canUndo: () => undoSteps.length > 0,
    canRedo: () => redoSteps.length > 0,
  };
}
