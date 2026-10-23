const MAX_UNDO_STEPS = 50;

export function createHistory(initial) {
  let present = initial;
  const past = [];
  const future = [];

  return {
    state: () => present,

    push(newState) {
      past.push(present);
      if (past.length > MAX_UNDO_STEPS) past.shift();
      present = newState;
      future.length = 0;
    },

    undo() {
      if (past.length === 0) return present;
      future.push(present);
      present = past.pop();
      return present;
    },

    redo() {
      if (future.length === 0) return present;
      past.push(present);
      present = future.pop();
      return present;
    },

    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
