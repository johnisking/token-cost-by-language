const MAX_UNDO_STEPS = 50;

// Keeps a bounded undo/redo history of immutable states.
export function createHistory(initial) {
  const past = [];
  const future = [];
  let present = initial;

  return {
    state() {
      return present;
    },
    push(newState) {
      past.push(present);
      if (past.length > MAX_UNDO_STEPS) past.shift();
      present = newState;
      future.length = 0;
    },
    undo() {
      if (past.length > 0) {
        future.push(present);
        present = past.pop();
      }
      return present;
    },
    redo() {
      if (future.length > 0) {
        past.push(present);
        present = future.pop();
      }
      return present;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}
